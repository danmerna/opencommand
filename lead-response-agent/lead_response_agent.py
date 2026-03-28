#!/usr/bin/env python3
"""
Lead Response Agent — Agent 2 for Open Command.

Watches Gmail for equipment leads, parses buyer info, generates
DealBuilder pages, and deploys iMessage via Linq with Twilio fallback.
"""

import argparse
import base64
import json
import logging
import os
import pickle
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import jinja2
import requests
from dotenv import load_dotenv
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from email_parser import is_duplicate, parse_lead_email

load_dotenv()

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("Σ Lead Response")

# ──────────────────────────────────────────────
# Constants from env
# ──────────────────────────────────────────────

GMAIL_CREDENTIALS_PATH = os.getenv("GMAIL_CREDENTIALS_PATH", "credentials/gmail_credentials.json")
GMAIL_TOKEN_PATH = os.getenv("GMAIL_TOKEN_PATH", "credentials/gmail_token.pickle")
GMAIL_LABEL = os.getenv("GMAIL_LABEL", "INBOX")
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

LINQ_API_KEY = os.getenv("LINQ_API_KEY", "")
LINQ_API_URL = os.getenv("LINQ_API_URL", "https://api.linq.ai/v1/messages")
LINQ_FROM_NUMBER = os.getenv("LINQ_FROM_NUMBER", "")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

DEALBUILDER_BASE_URL = os.getenv("DEALBUILDER_BASE_URL", "https://deals.example.com")
DEALBUILDER_OUTPUT_DIR = os.getenv("DEALBUILDER_OUTPUT_DIR", "./dealbuilder_pages")
DEALER_SLUG = os.getenv("DEALER_SLUG", "demo-dealer")
DEALER_NAME = os.getenv("DEALER_NAME", "Demo Dealer")
DEALER_PHONE = os.getenv("DEALER_PHONE", "")
DEALER_LOCATION = os.getenv("DEALER_LOCATION", "")

SALESPERSON_NAME = os.getenv("SALESPERSON_NAME", "Sales Team")
SALESPERSON_TITLE = os.getenv("SALESPERSON_TITLE", "Equipment Specialist")
SALESPERSON_PHONE = os.getenv("SALESPERSON_PHONE", "")

SCRIBE_LOG_PATH = os.getenv("SCRIBE_LOG_PATH", "./verified_scribe.jsonl")

POLL_INTERVAL = 60  # seconds


# ──────────────────────────────────────────────
# Gmail API
# ──────────────────────────────────────────────

def get_gmail_service():
    """Authenticate and return a Gmail API service object."""
    creds = None
    token_path = Path(GMAIL_TOKEN_PATH)

    if token_path.exists():
        with open(token_path, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleAuthRequest())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                GMAIL_CREDENTIALS_PATH, GMAIL_SCOPES
            )
            creds = flow.run_local_server(port=0)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        with open(token_path, "wb") as f:
            pickle.dump(creds, f)

    return build("gmail", "v1", credentials=creds)


def fetch_unread_leads(service) -> list[dict]:
    """Fetch unread emails from the configured label."""
    query = f"is:unread label:{GMAIL_LABEL}"
    results = service.users().messages().list(userId="me", q=query, maxResults=20).execute()
    messages = results.get("messages", [])

    leads_raw = []
    for msg_ref in messages:
        msg = service.users().messages().get(userId="me", id=msg_ref["id"], format="full").execute()
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}

        body_text = _extract_body(msg.get("payload", {}))
        internal_ts = int(msg.get("internalDate", "0")) / 1000
        received_at = datetime.fromtimestamp(internal_ts, tz=timezone.utc).isoformat()

        leads_raw.append({
            "id": msg_ref["id"],
            "from": headers.get("from", ""),
            "subject": headers.get("subject", ""),
            "body": body_text,
            "received_at": received_at,
        })

        # Mark as read
        service.users().messages().modify(
            userId="me",
            id=msg_ref["id"],
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()

    return leads_raw


def _extract_body(payload: dict) -> str:
    """Extract plain-text body from Gmail message payload."""
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")

    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
        if part.get("parts"):
            result = _extract_body(part)
            if result:
                return result

    # Fallback: try HTML and strip tags
    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
            import re
            html = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
            return re.sub(r"<[^>]+>", " ", html)

    return ""


# ──────────────────────────────────────────────
# DealBuilder page generation
# ──────────────────────────────────────────────

def generate_dealbuilder_page(lead: dict) -> tuple[str, str]:
    """
    Render a DealBuilder HTML page for the given lead.
    Returns (quote_id, dealbuilder_url).
    """
    quote_id = f"QT-{uuid.uuid4().hex[:8].upper()}"

    template_dir = Path(__file__).parent
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(str(template_dir)),
        autoescape=True,
    )
    template = env.get_template("dealbuilder_template.html")

    # Build financing scenarios
    price_val = None
    if lead.get("equipment_price"):
        try:
            price_val = float(lead["equipment_price"])
        except (ValueError, TypeError):
            pass

    financing = []
    if price_val and price_val > 0:
        for term, rate in [(60, 6.9), (72, 7.4), (84, 7.9)]:
            monthly_rate = rate / 100 / 12
            payment = price_val * (monthly_rate * (1 + monthly_rate) ** term) / ((1 + monthly_rate) ** term - 1)
            financing.append({
                "term_months": term,
                "rate_pct": rate,
                "monthly_payment": round(payment, 2),
            })

    # Salesperson initials
    name_parts = SALESPERSON_NAME.split()
    initials = "".join(p[0].upper() for p in name_parts[:2]) if name_parts else "S"

    context = {
        "quote_id": quote_id,
        "dealer_name": DEALER_NAME,
        "dealer_slug": DEALER_SLUG,
        "dealer_phone": DEALER_PHONE,
        "dealer_location": DEALER_LOCATION,
        "salesperson_name": SALESPERSON_NAME,
        "salesperson_title": SALESPERSON_TITLE,
        "salesperson_phone": SALESPERSON_PHONE,
        "salesperson_initials": initials,
        "buyer_name": lead.get("buyer_name", ""),
        "buyer_phone": lead.get("buyer_phone", ""),
        "buyer_message": lead.get("buyer_message", ""),
        "equipment_year": lead.get("equipment_year", ""),
        "equipment_make": lead.get("equipment_make", ""),
        "equipment_model": lead.get("equipment_model", ""),
        "equipment_hours": lead.get("equipment_hours", ""),
        "equipment_stock": lead.get("equipment_stock", ""),
        "equipment_price": price_val,
        "source": lead.get("source", ""),
        "source_url": lead.get("source_url", ""),
        "financing": financing,
    }

    html = template.render(**context)

    output_dir = Path(DEALBUILDER_OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{quote_id}.html"
    output_path.write_text(html, encoding="utf-8")

    dealbuilder_url = f"{DEALBUILDER_BASE_URL}/{DEALER_SLUG}/{quote_id}"
    logger.info("DealBuilder page generated: %s -> %s", quote_id, output_path)
    return quote_id, dealbuilder_url


# ──────────────────────────────────────────────
# Message deployment (Linq primary, Twilio fallback)
# ──────────────────────────────────────────────

def deploy_via_linq(to: str, message: str, from_number: str) -> bool:
    """Deploy a message via Linq iMessage API. Returns True on success."""
    if not LINQ_API_KEY:
        logger.warning("LINQ_API_KEY not configured — skipping Linq deployment")
        return False

    try:
        resp = requests.post(
            LINQ_API_URL,
            headers={
                "Authorization": f"Bearer {LINQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "to": to,
                "from": from_number or LINQ_FROM_NUMBER,
                "body": message,
                "channel": "imessage",
            },
            timeout=15,
        )
        if resp.status_code in (200, 201, 202):
            logger.info("Deployed via Linq to %s (status %d)", to, resp.status_code)
            return True
        else:
            logger.warning("Linq deployment failed: %d %s", resp.status_code, resp.text[:200])
            return False
    except requests.RequestException as exc:
        logger.warning("Linq deployment error: %s", exc)
        return False


def deploy_via_twilio(to: str, message: str) -> bool:
    """Deploy a message via Twilio SMS as fallback. Returns True on success."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured — skipping Twilio fallback")
        return False

    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=to,
        )
        logger.info("Deployed via Twilio to %s (SID: %s)", to, msg.sid)
        return True
    except Exception as exc:
        logger.error("Twilio deployment error: %s", exc)
        return False


def deploy_message(to: str, message: str, from_number: str = "") -> bool:
    """
    Deploy a message to a buyer. Tries Linq first, falls back to Twilio.
    Returns True if deployment succeeded via either channel.
    """
    if not to:
        logger.error("Cannot deploy message: no recipient phone number")
        return False

    # Try Linq (iMessage) first
    if deploy_via_linq(to, message, from_number):
        return True

    # Fallback to Twilio (SMS)
    logger.info("Falling back to Twilio for %s", to)
    return deploy_via_twilio(to, message)


# ──────────────────────────────────────────────
# Scribe audit logging
# ──────────────────────────────────────────────

def scribe_log(event_type: str, lead: dict, metadata: dict = None):
    """Append an entry to the Scribe audit log (verified_scribe.jsonl)."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event_type,
        "lead": lead,
        "metadata": metadata or {},
    }
    log_path = Path(SCRIBE_LOG_PATH)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a") as f:
        f.write(json.dumps(entry, default=str) + "\n")
    logger.debug("Scribe logged: %s", event_type)


# ──────────────────────────────────────────────
# Ralph Loop self-check
# ──────────────────────────────────────────────

def ralph_loop_check(lead: dict, dealbuilder_url: str, message: str) -> tuple[bool, list[str]]:
    """
    Ralph Loop self-check before deploying a message.
    Returns (passed, list_of_issues).
    """
    issues = []

    # Check buyer phone is present and valid
    phone = lead.get("buyer_phone")
    if not phone:
        issues.append("Missing buyer phone number")
    elif not phone.startswith("+"):
        issues.append(f"Phone not in E.164 format: {phone}")

    # Check equipment info
    if not lead.get("equipment_make") and not lead.get("equipment_model"):
        issues.append("Missing equipment make and model")

    # Check DealBuilder URL
    if not dealbuilder_url:
        issues.append("No DealBuilder URL generated")

    # Check message is not empty and not too long
    if not message or len(message.strip()) < 10:
        issues.append("Message too short or empty")
    if len(message) > 1600:
        issues.append(f"Message too long ({len(message)} chars, max 1600)")

    # Check that we are not deploying to the dealer's own number
    if phone and phone == DEALER_PHONE:
        issues.append("Buyer phone matches dealer phone — likely a parsing error")

    passed = len(issues) == 0
    if passed:
        logger.info("Ralph Loop: PASSED — all checks green")
    else:
        logger.warning("Ralph Loop: FAILED — %d issue(s): %s", len(issues), "; ".join(issues))

    return passed, issues


# ──────────────────────────────────────────────
# Compose outbound message
# ──────────────────────────────────────────────

def compose_message(lead: dict, dealbuilder_url: str) -> str:
    """Compose the outbound message text for deployment to the buyer."""
    buyer_first = (lead.get("buyer_name") or "").split()[0] if lead.get("buyer_name") else ""
    greeting = f"Hi {buyer_first}," if buyer_first else "Hi,"

    equip_parts = []
    if lead.get("equipment_year"):
        equip_parts.append(lead["equipment_year"])
    if lead.get("equipment_make"):
        equip_parts.append(lead["equipment_make"])
    if lead.get("equipment_model"):
        equip_parts.append(lead["equipment_model"])
    equipment_str = " ".join(equip_parts) or "the equipment you inquired about"

    lines = [
        greeting,
        "",
        f"Thanks for your interest in the {equipment_str}. "
        f"I put together a quick breakdown for you — pricing, financing options, and details all in one place:",
        "",
        dealbuilder_url,
        "",
        f"Take a look and let me know if you have any questions. "
        f"You can reply right here or call me direct.",
        "",
        f"{SALESPERSON_NAME}",
        f"{DEALER_NAME}",
        f"{SALESPERSON_PHONE}" if SALESPERSON_PHONE else "",
    ]
    return "\n".join(line for line in lines if line is not None).strip()


# ──────────────────────────────────────────────
# Process a single lead
# ──────────────────────────────────────────────

def process_lead(lead: dict, dry_run: bool = False) -> dict:
    """
    Full pipeline for one lead: generate DealBuilder, Ralph Loop check,
    deploy message, Scribe log. Returns result dict.
    """
    result = {
        "lead": lead,
        "quote_id": None,
        "dealbuilder_url": None,
        "deployed": False,
        "channel": None,
        "ralph_loop_passed": False,
        "ralph_loop_issues": [],
        "skipped_reason": None,
    }

    # Dedup check
    if is_duplicate(lead, SCRIBE_LOG_PATH):
        result["skipped_reason"] = "duplicate"
        scribe_log("lead_duplicate_skipped", lead)
        logger.info("Skipping duplicate lead: %s", lead.get("email_id"))
        return result

    # Log inbound
    scribe_log("lead_received", lead)

    # Generate DealBuilder page
    try:
        quote_id, dealbuilder_url = generate_dealbuilder_page(lead)
        result["quote_id"] = quote_id
        result["dealbuilder_url"] = dealbuilder_url
    except Exception as exc:
        logger.error("DealBuilder generation failed: %s", exc)
        scribe_log("dealbuilder_error", lead, {"error": str(exc)})
        result["skipped_reason"] = f"dealbuilder_error: {exc}"
        return result

    # Compose message
    message = compose_message(lead, dealbuilder_url)

    # Ralph Loop self-check
    passed, issues = ralph_loop_check(lead, dealbuilder_url, message)
    result["ralph_loop_passed"] = passed
    result["ralph_loop_issues"] = issues

    if not passed:
        scribe_log("ralph_loop_failed", lead, {"issues": issues, "quote_id": quote_id})
        result["skipped_reason"] = f"ralph_loop_failed: {'; '.join(issues)}"
        logger.warning("Ralph Loop failed for %s — NOT deploying", quote_id)
        return result

    # Deploy message
    if dry_run:
        logger.info("Dry run — skipping deployment for %s", quote_id)
        result["skipped_reason"] = "dry_run"
        scribe_log("lead_processed_dry_run", lead, {"quote_id": quote_id, "dealbuilder_url": dealbuilder_url})
        return result

    deployed = deploy_message(
        to=lead["buyer_phone"],
        message=message,
        from_number=LINQ_FROM_NUMBER,
    )
    result["deployed"] = deployed
    result["channel"] = "linq" if LINQ_API_KEY else "twilio"

    scribe_log(
        "message_deployed" if deployed else "deployment_failed",
        lead,
        {
            "quote_id": quote_id,
            "dealbuilder_url": dealbuilder_url,
            "channel": result["channel"],
            "message_length": len(message),
        },
    )

    return result


# ──────────────────────────────────────────────
# Run modes
# ──────────────────────────────────────────────

def run_once(json_mode: bool = False) -> list[dict]:
    """Single-run mode: process all pending leads and return results."""
    logger.info("Starting single run...")
    service = get_gmail_service()
    raw_emails = fetch_unread_leads(service)
    logger.info("Fetched %d unread email(s)", len(raw_emails))

    results = []
    for raw in raw_emails:
        lead = parse_lead_email(raw)
        if not lead:
            logger.info("Could not parse lead from email %s — skipping", raw.get("id"))
            scribe_log("parse_failed", {"email_id": raw.get("id"), "subject": raw.get("subject", "")})
            continue

        result = process_lead(lead, dry_run=json_mode)
        results.append(result)

    if json_mode:
        print(json.dumps(results, indent=2, default=str))

    logger.info("Run complete: %d lead(s) processed", len(results))
    return results


def run_polling():
    """Default polling mode: check Gmail every POLL_INTERVAL seconds."""
    logger.info("Starting polling mode (every %ds)...", POLL_INTERVAL)
    service = get_gmail_service()

    while True:
        try:
            raw_emails = fetch_unread_leads(service)
            if raw_emails:
                logger.info("Fetched %d unread email(s)", len(raw_emails))
                for raw in raw_emails:
                    lead = parse_lead_email(raw)
                    if not lead:
                        logger.info("Could not parse email %s — skipping", raw.get("id"))
                        scribe_log("parse_failed", {"email_id": raw.get("id"), "subject": raw.get("subject", "")})
                        continue
                    process_lead(lead)
            else:
                logger.debug("No new leads")
        except Exception as exc:
            logger.error("Polling cycle error: %s", exc, exc_info=True)
            scribe_log("polling_error", {}, {"error": str(exc)})

        time.sleep(POLL_INTERVAL)


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Lead Response Agent — watches Gmail for equipment leads, "
                    "generates DealBuilder pages, and deploys responses via Linq/Twilio.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once (process all pending leads, then exit)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Run once and output results as JSON (no deployment)",
    )
    args = parser.parse_args()

    if args.json:
        run_once(json_mode=True)
    elif args.once:
        run_once(json_mode=False)
    else:
        run_polling()


if __name__ == "__main__":
    main()
