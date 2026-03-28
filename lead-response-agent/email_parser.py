"""
Email parser for equipment listing lead platforms.

Parses inbound lead emails from TractorHouse, MachineryTrader,
and generic website forms into normalized lead dictionaries.
"""

import hashlib
import json
import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger("Σ Lead Response")

# ──────────────────────────────────────────────
# Phone normalization
# ──────────────────────────────────────────────

def normalize_phone(raw: str) -> Optional[str]:
    """Normalize a phone string to E.164 format (+1XXXXXXXXXX for US)."""
    if not raw:
        return None
    digits = re.sub(r"[^\d]", "", raw)
    if len(digits) == 10:
        digits = "1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if len(digits) >= 10:
        return f"+{digits}"
    return None


# ──────────────────────────────────────────────
# Equipment string parsing
# ──────────────────────────────────────────────

def parse_equipment_string(text: str) -> dict:
    """
    Extract year, make, model from an equipment description string.
    Handles patterns like '2019 John Deere 6130R' or 'CAT 320F 2018'.
    """
    result = {
        "equipment_year": None,
        "equipment_make": None,
        "equipment_model": None,
    }
    if not text:
        return result

    year_match = re.search(r"\b(19|20)\d{2}\b", text)
    if year_match:
        result["equipment_year"] = year_match.group(0)

    known_makes = [
        "John Deere", "Case IH", "Case", "New Holland", "Kubota",
        "Caterpillar", "CAT", "Massey Ferguson", "AGCO", "Fendt",
        "Claas", "Komatsu", "Bobcat", "Vermeer", "KIOTI",
        "Mahindra", "Challenger", "Gleaner", "Hesston", "Gehl",
        "JCB", "Hitachi", "Volvo", "Deere", "Link-Belt",
        "Takeuchi", "Yanmar", "Kobelco", "Doosan", "Hyundai",
    ]
    text_upper = text.upper()
    for make in known_makes:
        if make.upper() in text_upper:
            result["equipment_make"] = make
            break

    if result["equipment_make"] and result["equipment_year"]:
        remainder = text
        remainder = remainder.replace(result["equipment_year"], "").strip()
        for make in known_makes:
            pattern = re.compile(re.escape(make), re.IGNORECASE)
            remainder = pattern.sub("", remainder).strip()
        remainder = re.sub(r"^[\s,\-:]+|[\s,\-:]+$", "", remainder)
        if remainder:
            model_part = remainder.split()[0] if remainder.split() else remainder
            result["equipment_model"] = model_part
    elif not result["equipment_make"]:
        parts = text.split()
        cleaned = [p for p in parts if not re.match(r"^(19|20)\d{2}$", p)]
        if len(cleaned) >= 2:
            result["equipment_make"] = cleaned[0]
            result["equipment_model"] = cleaned[1]
        elif len(cleaned) == 1:
            result["equipment_model"] = cleaned[0]

    return result


def extract_hours(text: str) -> Optional[str]:
    """Extract machine hours from text."""
    if not text:
        return None
    match = re.search(r"([\d,]+)\s*(?:hours?|hrs?)\b", text, re.IGNORECASE)
    if match:
        return match.group(1).replace(",", "")
    return None


def extract_stock_number(text: str) -> Optional[str]:
    """Extract stock/serial number from text."""
    if not text:
        return None
    match = re.search(
        r"(?:stock|stk|serial|s/?n|item)\s*#?\s*:?\s*([A-Za-z0-9\-]+)",
        text, re.IGNORECASE,
    )
    if match:
        return match.group(1)
    return None


def extract_price(text: str) -> Optional[str]:
    """Extract price from text."""
    if not text:
        return None
    match = re.search(r"\$\s*([\d,]+(?:\.\d{2})?)", text)
    if match:
        return match.group(1).replace(",", "")
    match = re.search(r"([\d,]+(?:\.\d{2})?)\s*(?:USD|dollars?)", text, re.IGNORECASE)
    if match:
        return match.group(1).replace(",", "")
    return None


# ──────────────────────────────────────────────
# Deduplication
# ──────────────────────────────────────────────

def _load_recent_leads(scribe_path: str, hours: int = 24) -> list[dict]:
    """Load leads from Scribe log within the last N hours."""
    leads = []
    path = Path(scribe_path)
    if not path.exists():
        return leads
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    ts = entry.get("timestamp", "")
                    if ts:
                        entry_time = datetime.fromisoformat(ts)
                        if entry_time >= cutoff:
                            leads.append(entry)
                except (json.JSONDecodeError, ValueError):
                    continue
    except OSError:
        pass
    return leads


def is_duplicate(lead: dict, scribe_path: str) -> bool:
    """
    Check if a lead is a duplicate.
    - Same email_id = always skip.
    - Same phone + same equipment within 24 hours = skip.
    """
    recent = _load_recent_leads(scribe_path)
    email_id = lead.get("email_id", "")
    phone = lead.get("buyer_phone", "")
    equip_key = f"{lead.get('equipment_make', '')}_{lead.get('equipment_model', '')}".lower()

    for entry in recent:
        lead_data = entry.get("lead", {})
        if email_id and lead_data.get("email_id") == email_id:
            logger.info("Duplicate: same email_id %s", email_id)
            return True
        if (
            phone
            and phone == lead_data.get("buyer_phone")
            and equip_key == f"{lead_data.get('equipment_make', '')}_{lead_data.get('equipment_model', '')}".lower()
        ):
            logger.info("Duplicate: same phone + equipment within 24h")
            return True
    return False


# ──────────────────────────────────────────────
# Platform-specific parsers
# ──────────────────────────────────────────────

def _parse_tractorhouse(subject: str, body: str, email_id: str, received_at: str) -> Optional[dict]:
    """Parse a TractorHouse lead email."""
    lead = {
        "source": "TractorHouse",
        "source_url": None,
        "email_id": email_id,
        "received_at": received_at,
    }

    name_match = re.search(r"(?:Name|From|Contact)\s*:\s*(.+)", body, re.IGNORECASE)
    lead["buyer_name"] = name_match.group(1).strip() if name_match else None

    phone_match = re.search(r"(?:Phone|Tel|Mobile)\s*:\s*([\d\s\(\)\-\+\.]+)", body, re.IGNORECASE)
    lead["buyer_phone"] = normalize_phone(phone_match.group(1)) if phone_match else None

    email_match = re.search(r"(?:Email|E-mail)\s*:\s*([\w\.\+\-]+@[\w\.\-]+\.\w+)", body, re.IGNORECASE)
    lead["buyer_email"] = email_match.group(1).strip() if email_match else None

    msg_match = re.search(r"(?:Message|Comments?|Notes?|Inquiry)\s*:\s*(.+?)(?:\n\n|\n[-=]|$)", body, re.IGNORECASE | re.DOTALL)
    lead["buyer_message"] = msg_match.group(1).strip()[:500] if msg_match else None

    equip_match = re.search(
        r"(?:Equipment|Item|Listing|Machine|Unit)\s*:\s*(.+)",
        body, re.IGNORECASE,
    )
    equip_str = equip_match.group(1).strip() if equip_match else subject
    equip = parse_equipment_string(equip_str)
    lead.update(equip)

    lead["equipment_hours"] = extract_hours(body)
    lead["equipment_stock"] = extract_stock_number(body)
    lead["equipment_price"] = extract_price(body)

    url_match = re.search(r"(https?://(?:www\.)?tractorhouse\.com/\S+)", body, re.IGNORECASE)
    if url_match:
        lead["source_url"] = url_match.group(1)

    if lead.get("buyer_phone") or lead.get("buyer_email"):
        return lead
    return None


def _parse_machinerytrader(subject: str, body: str, email_id: str, received_at: str) -> Optional[dict]:
    """Parse a MachineryTrader / Iron Solutions format lead email."""
    lead = {
        "source": "MachineryTrader",
        "source_url": None,
        "email_id": email_id,
        "received_at": received_at,
    }

    name_match = re.search(r"(?:Name|Buyer|Contact|From)\s*:\s*(.+)", body, re.IGNORECASE)
    lead["buyer_name"] = name_match.group(1).strip() if name_match else None

    phone_match = re.search(r"(?:Phone|Tel|Mobile|Cell)\s*:\s*([\d\s\(\)\-\+\.]+)", body, re.IGNORECASE)
    lead["buyer_phone"] = normalize_phone(phone_match.group(1)) if phone_match else None

    email_match = re.search(r"(?:Email|E-mail)\s*:\s*([\w\.\+\-]+@[\w\.\-]+\.\w+)", body, re.IGNORECASE)
    lead["buyer_email"] = email_match.group(1).strip() if email_match else None

    msg_match = re.search(r"(?:Message|Comments?|Notes?|Inquiry)\s*:\s*(.+?)(?:\n\n|\n[-=]|$)", body, re.IGNORECASE | re.DOTALL)
    lead["buyer_message"] = msg_match.group(1).strip()[:500] if msg_match else None

    equip_match = re.search(
        r"(?:Equipment|Item|Listing|Machine|Unit|RE)\s*:\s*(.+)",
        body, re.IGNORECASE,
    )
    equip_str = equip_match.group(1).strip() if equip_match else subject
    equip = parse_equipment_string(equip_str)
    lead.update(equip)

    lead["equipment_hours"] = extract_hours(body)
    lead["equipment_stock"] = extract_stock_number(body)
    lead["equipment_price"] = extract_price(body)

    url_match = re.search(r"(https?://(?:www\.)?machinerytrader\.com/\S+)", body, re.IGNORECASE)
    if url_match:
        lead["source_url"] = url_match.group(1)

    if lead.get("buyer_phone") or lead.get("buyer_email"):
        return lead
    return None


def _parse_generic_llm(subject: str, body: str, email_id: str, received_at: str) -> Optional[dict]:
    """
    Use the cheapest LLM via OpenRouter to parse an unrecognized lead email.
    Falls back to regex if OpenRouter key is missing.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    model = os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5")

    lead_template = {
        "buyer_name": None,
        "buyer_phone": None,
        "buyer_email": None,
        "buyer_message": None,
        "equipment_year": None,
        "equipment_make": None,
        "equipment_model": None,
        "equipment_hours": None,
        "equipment_stock": None,
        "equipment_price": None,
        "source": "Website Form",
        "source_url": None,
        "email_id": email_id,
        "received_at": received_at,
    }

    if not api_key:
        logger.warning("No OPENROUTER_API_KEY set; falling back to regex for generic email")
        return _parse_generic_regex(subject, body, lead_template)

    prompt = f"""Extract lead information from this equipment inquiry email.
Return ONLY valid JSON with these exact keys (use null for missing values):
buyer_name, buyer_phone, buyer_email, buyer_message,
equipment_year, equipment_make, equipment_model, equipment_hours,
equipment_stock, equipment_price

Subject: {subject}

Body:
{body[:3000]}"""

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
                "temperature": 0.0,
            },
            timeout=15,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]

        json_match = re.search(r"\{[^{}]+\}", content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            for key in lead_template:
                if key in parsed and parsed[key] is not None:
                    lead_template[key] = parsed[key]

            if lead_template.get("buyer_phone"):
                lead_template["buyer_phone"] = normalize_phone(lead_template["buyer_phone"])

            if lead_template.get("buyer_phone") or lead_template.get("buyer_email"):
                return lead_template

    except Exception as exc:
        logger.warning("LLM parsing failed: %s — falling back to regex", exc)

    return _parse_generic_regex(subject, body, lead_template)


def _parse_generic_regex(subject: str, body: str, lead: dict) -> Optional[dict]:
    """Last-resort regex parser for unknown email formats."""
    full_text = f"{subject}\n{body}"

    email_match = re.search(r"([\w\.\+\-]+@[\w\.\-]+\.\w+)", full_text)
    if email_match:
        lead["buyer_email"] = email_match.group(1)

    phone_match = re.search(r"(\+?1?\s*[\(\-]?\d{3}[\)\-\.\s]*\d{3}[\-\.\s]*\d{4})", full_text)
    if phone_match:
        lead["buyer_phone"] = normalize_phone(phone_match.group(1))

    name_match = re.search(r"(?:name|from|contact)\s*:\s*(.+)", full_text, re.IGNORECASE)
    if name_match:
        lead["buyer_name"] = name_match.group(1).strip()

    msg_match = re.search(r"(?:message|comments?|notes?)\s*:\s*(.+?)(?:\n\n|$)", full_text, re.IGNORECASE | re.DOTALL)
    if msg_match:
        lead["buyer_message"] = msg_match.group(1).strip()[:500]

    equip = parse_equipment_string(subject)
    for k, v in equip.items():
        if v and not lead.get(k):
            lead[k] = v

    lead["equipment_hours"] = lead.get("equipment_hours") or extract_hours(full_text)
    lead["equipment_stock"] = lead.get("equipment_stock") or extract_stock_number(full_text)
    lead["equipment_price"] = lead.get("equipment_price") or extract_price(full_text)

    if lead.get("buyer_phone") or lead.get("buyer_email"):
        return lead
    return None


# ──────────────────────────────────────────────
# Main entry point
# ──────────────────────────────────────────────

def detect_source(from_addr: str, subject: str, body: str) -> str:
    """Detect the lead source platform from email metadata."""
    from_lower = (from_addr or "").lower()
    subject_lower = (subject or "").lower()
    body_lower = (body or "").lower()[:2000]

    if "tractorhouse" in from_lower or "tractorhouse" in subject_lower or "tractorhouse" in body_lower:
        return "tractorhouse"
    if "machinerytrader" in from_lower or "machinerytrader" in subject_lower or "machinerytrader" in body_lower:
        return "machinerytrader"
    if "ironsolutions" in from_lower or "iron solutions" in body_lower:
        return "machinerytrader"
    return "generic"


def parse_lead_email(email_data: dict) -> Optional[dict]:
    """
    Parse a raw email dict into a normalized lead dict.

    email_data should contain:
        - id: Gmail message ID
        - from: sender address
        - subject: email subject
        - body: plain-text body
        - received_at: ISO timestamp

    Returns a normalized lead dict or None if unparseable.
    """
    email_id = email_data.get("id", "")
    from_addr = email_data.get("from", "")
    subject = email_data.get("subject", "")
    body = email_data.get("body", "")
    received_at = email_data.get("received_at", datetime.now(timezone.utc).isoformat())

    source = detect_source(from_addr, subject, body)
    logger.info("Detected source: %s for email %s", source, email_id)

    if source == "tractorhouse":
        return _parse_tractorhouse(subject, body, email_id, received_at)
    elif source == "machinerytrader":
        return _parse_machinerytrader(subject, body, email_id, received_at)
    else:
        return _parse_generic_llm(subject, body, email_id, received_at)
