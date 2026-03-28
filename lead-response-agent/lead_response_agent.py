#!/usr/bin/env python3
"""
Σ Lead Response Agent — OpenClaw Skill

Watches a Gmail inbox for lead notification emails from equipment listing
platforms (TractorHouse, MachineryTrader), parses them, generates a DealBuilder
quote page, and deploys an iMessage to the buyer via Linq API.

Run modes:
  python lead_response_agent.py          # Polling loop (30s heartbeat)
  python lead_response_agent.py --once   # Single run (OpenClaw/cron)
  python lead_response_agent.py --json   # JSON output for programmatic use
"""

import os
import sys
import json
import time
import re
import argparse
import base64
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests
from jinja2 import Template
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

LINQ_API_KEY = os.environ.get("LINQ_API_KEY", "")
LINQ_SANDBOX_NUMBER = os.environ.get("LINQ_SANDBOX_NUMBER", "")
LINQ_API_BASE = "https://api.linqapp.com/v1"

TWILIO_SID = os.environ.get("TWILIO_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_DOMAIN = os.environ.get("RESEND_DOMAIN", "bot.opencommand.co")

LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://openrouter.ai/api/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "anthropic/claude-3.5-haiku")

DEALBUILDER_BASE_URL = os.environ.get("DEALBUILDER_BASE_URL", "")
DEALBUILDER_OUTPUT_DIR = os.environ.get("DEALBUILDER_OUTPUT_DIR", "./dealbuilder_pages")

DEALER_NAME = os.environ.get("DEALER_NAME", "Johnson Tractor")
DEALER_SLUG = os.environ.get("DEALER_SLUG", "johnsontractor")
DEALER_LOCATION = os.environ.get("DEALER_LOCATION", "St. Cloud, MN")
SALESPERSON_NAME = os.environ.get("SALESPERSON_NAME", "Jake Mueller")
SALESPERSON_PHONE = os.environ.get("SALESPERSON_PHONE", "+16125550147")

CREDENTIALS_FILE = os.environ.get("GMAIL_CREDENTIALS_FILE", "credentials.json")
TOKEN_FILE = os.environ.get("GMAIL_TOKEN_FILE", "token.json")

POLL_INTERVAL = 30  # seconds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("sig-lead-response")

# ---------------------------------------------------------------------------
# Σribe — Audit Trail
# ---------------------------------------------------------------------------

SCRIBE_LOG: list[dict] = []


def scribe(event: str, data: dict | None = None):
    """Append an entry to the Σribe audit trail."""
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **(data or {}),
    }
    SCRIBE_LOG.append(entry)
    log.info(f"Σribe: {event} | {json.dumps(data or {})}")


# ---------------------------------------------------------------------------
# Σ Identity Provisioning
# ---------------------------------------------------------------------------


def provision_sig_number(dealer_slug: str, area_code: str | None = None) -> dict:
    """
    Provision a new Linq phone number for a Σ instance.
    Returns number details including the provisioned phone number.
    """
    headers = {
        "Authorization": f"Bearer {LINQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "friendly_name": f"sig-{dealer_slug}",
    }

    if area_code:
        payload["area_code"] = area_code

    response = requests.post(
        f"{LINQ_API_BASE}/numbers",
        headers=headers,
        json=payload,
        timeout=15,
    )
    response.raise_for_status()
    result = response.json()
    scribe("number_provisioned", {"dealer_slug": dealer_slug, "number": result})
    return result


# ---------------------------------------------------------------------------
# Gmail — Read Lead Emails
# ---------------------------------------------------------------------------


def get_gmail_service():
    """Authenticate and return a Gmail API service."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, GMAIL_SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, GMAIL_SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def fetch_unread_leads(service) -> list[dict]:
    """Fetch unread lead emails from TractorHouse/MachineryTrader."""
    query = (
        "is:unread ("
        "from:leads@tractorhouse.com OR "
        "from:leads@machinerytrader.com OR "
        "from:noreply@tractorhouse.com OR "
        "from:noreply@machinerytrader.com OR "
        "subject:TractorHouse OR "
        "subject:MachineryTrader"
        ")"
    )
    results = service.users().messages().list(userId="me", q=query).execute()
    messages = results.get("messages", [])
    leads = []
    for msg_ref in messages:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=msg_ref["id"], format="full")
            .execute()
        )
        leads.append(msg)
    return leads


def mark_as_read(service, msg_id: str):
    """Mark a Gmail message as read."""
    service.users().messages().modify(
        userId="me", id=msg_id, body={"removeLabelIds": ["UNREAD"]}
    ).execute()


def extract_email_body(msg: dict) -> str:
    """Extract plain-text body from a Gmail message."""
    payload = msg.get("payload", {})

    # Simple single-part
    if "body" in payload and payload["body"].get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")

    # Multipart
    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
        # Nested multipart
        for sub in part.get("parts", []):
            if sub.get("mimeType") == "text/plain" and sub.get("body", {}).get("data"):
                return base64.urlsafe_b64decode(sub["body"]["data"]).decode("utf-8", errors="replace")

    return ""


def get_header(msg: dict, name: str) -> str:
    """Get a header value from a Gmail message."""
    headers = msg.get("payload", {}).get("headers", [])
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def extract_dealer_slug_from_to(msg: dict) -> str | None:
    """
    Extract dealer slug from To: header.
    e.g. sig-johnsontractor@bot.opencommand.co → johnsontractor
    """
    to_addr = get_header(msg, "To")
    match = re.search(r"sig-([a-z0-9]+)@", to_addr, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    return None


# ---------------------------------------------------------------------------
# Lead Parsing — Regex + LLM Fallback
# ---------------------------------------------------------------------------

LEAD_FIELDS = [
    "buyer_name",
    "buyer_phone",
    "buyer_email",
    "buyer_message",
    "equipment_year",
    "equipment_make",
    "equipment_model",
    "equipment_stock",
    "equipment_hours",
    "equipment_price",
    "equipment_location",
    "source_platform",
]

# Common regex patterns for TractorHouse/MachineryTrader lead emails
REGEX_PATTERNS = {
    "buyer_name": [
        r"(?:Name|Contact|From)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)",
        r"(?:Buyer|Customer)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)",
    ],
    "buyer_phone": [
        r"(?:Phone|Tel|Mobile|Cell)[:\s]*([\+\d\(\)\-\s]{10,})",
    ],
    "buyer_email": [
        r"(?:Email)[:\s]*([\w\.\-\+]+@[\w\.\-]+\.\w+)",
        r"([\w\.\-\+]+@[\w\.\-]+\.\w+)",
    ],
    "buyer_message": [
        r"(?:Message|Comments?|Notes?|Question)[:\s]*(.+?)(?:\n\n|\Z)",
    ],
    "equipment_year": [
        r"(?:Year)[:\s]*(\d{4})",
        r"\b(20\d{2}|19\d{2})\b",
    ],
    "equipment_make": [
        r"(?:Make|Brand|Manufacturer)[:\s]*(\w[\w\s]*?)(?:\n|,|$)",
    ],
    "equipment_model": [
        r"(?:Model)[:\s]*(\w[\w\s\-\/]*?)(?:\n|,|$)",
    ],
    "equipment_stock": [
        r"(?:Stock ?#?|Item ?#?|Ref)[:\s]*([\w\-]+)",
    ],
}


def parse_lead_regex(body: str, subject: str) -> dict:
    """Try to extract lead fields using regex patterns."""
    parsed = {}
    text = f"{subject}\n{body}"

    for field, patterns in REGEX_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                parsed[field] = match.group(1).strip()
                break

    # Detect source platform
    if "tractorhouse" in text.lower():
        parsed["source_platform"] = "TractorHouse"
    elif "machinerytrader" in text.lower():
        parsed["source_platform"] = "MachineryTrader"

    return parsed


def parse_lead_llm(body: str, subject: str) -> dict:
    """Fallback: use LLM to parse the lead email."""
    if not LLM_API_KEY:
        return {}

    prompt = f"""Extract the following fields from this equipment lead email.
Return JSON only, no explanation.

Fields: {json.dumps(LEAD_FIELDS)}

Subject: {subject}

Body:
{body[:3000]}"""

    try:
        resp = requests.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
                "max_tokens": 500,
            },
            timeout=15,
        )
        content = resp.json()["choices"][0]["message"]["content"]
        # Extract JSON from response
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        log.warning(f"LLM parse failed: {e}")

    return {}


def parse_lead(body: str, subject: str) -> dict:
    """Parse a lead email — regex first, LLM fallback for missing fields."""
    parsed = parse_lead_regex(body, subject)
    scribe("lead_parsed_regex", {"fields_found": list(parsed.keys())})

    missing = [f for f in LEAD_FIELDS if f not in parsed]
    if missing and LLM_API_KEY:
        llm_parsed = parse_lead_llm(body, subject)
        for field in missing:
            if field in llm_parsed and llm_parsed[field]:
                parsed[field] = llm_parsed[field]
        scribe("lead_parsed_llm", {"fields_added": [f for f in missing if f in parsed]})

    return parsed


# ---------------------------------------------------------------------------
# DealBuilder — Generate Quote Page
# ---------------------------------------------------------------------------


def generate_dealbuilder(lead: dict, dealer_slug: str | None = None) -> str:
    """Generate a DealBuilder HTML page for this lead. Returns the filename."""
    slug = dealer_slug or DEALER_SLUG
    quote_id = f"QT-{int(time.time()) % 100000:05d}"
    filename = f"{slug}_{quote_id}.html"

    template_path = Path(__file__).parent / "dealbuilder_template.html"
    if not template_path.exists():
        log.error("DealBuilder template not found")
        return ""

    template = Template(template_path.read_text())
    html = template.render(
        quote_id=quote_id,
        dealer_name=DEALER_NAME,
        dealer_slug=slug,
        dealer_location=DEALER_LOCATION,
        salesperson_name=SALESPERSON_NAME,
        salesperson_phone=SALESPERSON_PHONE,
        salesperson_initials="".join(w[0] for w in SALESPERSON_NAME.split()[:2]),
        sig_number=LINQ_SANDBOX_NUMBER,
        buyer_name=lead.get("buyer_name", ""),
        buyer_message=lead.get("buyer_message", ""),
        equipment_year=lead.get("equipment_year", ""),
        equipment_make=lead.get("equipment_make", ""),
        equipment_model=lead.get("equipment_model", ""),
        equipment_stock=lead.get("equipment_stock", ""),
        equipment_hours=lead.get("equipment_hours", ""),
        equipment_price=lead.get("equipment_price", ""),
        equipment_location=lead.get("equipment_location", DEALER_LOCATION),
        source_platform=lead.get("source_platform", ""),
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )

    output_dir = Path(DEALBUILDER_OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    output_path.write_text(html)

    scribe("dealbuilder_generated", {"quote_id": quote_id, "file": filename})

    return filename


# ---------------------------------------------------------------------------
# Messaging — Linq (primary) + Twilio (fallback)
# ---------------------------------------------------------------------------


def deploy_via_linq(to: str, message: str, from_number: str) -> dict:
    """
    Deploy a message via Linq API.
    Automatically sends as iMessage if recipient has it,
    falls back to RCS then SMS.
    """
    resp = requests.post(
        f"{LINQ_API_BASE}/messages/send",
        headers={
            "Authorization": f"Bearer {LINQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "to": to,
            "from": from_number,
            "content": message,
        },
        timeout=10,
    )
    resp.raise_for_status()
    result = resp.json()
    is_imessage = not result.get("was_downgraded", True)
    channel = "imessage" if is_imessage else result.get("channel", "sms")
    scribe("message_deployed_linq", {"to": to, "channel": channel, "is_imessage": is_imessage})
    return {"provider": "linq", "channel": channel, "is_imessage": is_imessage, "status": "deployed"}


def deploy_via_twilio(to: str, message: str) -> dict:
    """Fallback: deploy via Twilio SMS."""
    if not TWILIO_SID or not TWILIO_AUTH_TOKEN:
        raise RuntimeError("Twilio credentials not configured")

    from twilio.rest import Client

    client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
    msg = client.messages.create(
        body=message, from_=TWILIO_FROM_NUMBER, to=to
    )
    scribe("message_deployed_twilio", {"to": to, "sid": msg.sid})
    return {"provider": "twilio", "channel": "sms", "is_imessage": False, "status": "deployed", "sid": msg.sid}


def deploy_message(to: str, message: str, from_number: str | None = None) -> dict:
    """Deploy via Linq, fall back to Twilio SMS."""
    from_num = from_number or LINQ_SANDBOX_NUMBER

    try:
        return deploy_via_linq(to, message, from_num)
    except Exception as e:
        log.warning(f"Linq failed, falling back to Twilio: {e}")
        scribe("linq_fallback_to_twilio", {"error": str(e)})
        try:
            return deploy_via_twilio(to, message)
        except Exception as e2:
            log.error(f"Twilio fallback also failed: {e2}")
            scribe("message_deploy_failed", {"error": str(e2)})
            return {"provider": "none", "channel": "none", "is_imessage": False, "status": "failed", "error": str(e2)}


# ---------------------------------------------------------------------------
# Email — Resend (dealer-specific outbound)
# ---------------------------------------------------------------------------


def send_sig_email(dealer_slug: str, to_email: str, subject: str, html_body: str):
    """Send an email from Sig's dealer-specific address."""
    if not RESEND_API_KEY:
        log.warning("Resend not configured, skipping email")
        return

    from_addr = f"sig-{dealer_slug}@{RESEND_DOMAIN}"

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": f"Sig · {DEALER_NAME} <{from_addr}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        },
        timeout=10,
    )
    scribe("email_sent", {"from": from_addr, "to": to_email, "subject": subject, "status": resp.status_code})


# ---------------------------------------------------------------------------
# Lead Processing Pipeline
# ---------------------------------------------------------------------------


def compose_buyer_message(lead: dict, dealbuilder_url: str) -> str:
    """Compose the iMessage to deploy to the buyer."""
    equip = f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip()
    buyer = lead.get("buyer_name", "").split()[0] if lead.get("buyer_name") else "there"
    source = lead.get("source_platform", "online")

    msg = (
        f"Hey {buyer}, saw you were looking at the {equip} "
        f"on {source}. Put together pricing and options "
        f"for you here: {dealbuilder_url}\n\n"
        f"— {SALESPERSON_NAME}, {DEALER_NAME} {DEALER_LOCATION}"
    )
    return msg


def process_lead(service, msg: dict) -> dict | None:
    """Process a single lead email end-to-end."""
    msg_id = msg["id"]
    subject = get_header(msg, "Subject")
    body = extract_email_body(msg)

    # Extract dealer slug from To: header (catch-all routing)
    email_dealer_slug = extract_dealer_slug_from_to(msg) or DEALER_SLUG

    scribe("lead_received", {"msg_id": msg_id, "subject": subject, "dealer_slug": email_dealer_slug})

    # Parse
    lead = parse_lead(body, subject)
    if not lead.get("buyer_phone") and not lead.get("buyer_email"):
        scribe("lead_skipped", {"reason": "no contact info", "msg_id": msg_id})
        mark_as_read(service, msg_id)
        return None

    # Generate DealBuilder page
    filename = generate_dealbuilder(lead, dealer_slug=email_dealer_slug)
    dealbuilder_url = f"{DEALBUILDER_BASE_URL}/deal/{email_dealer_slug}/{filename}" if DEALBUILDER_BASE_URL else f"[DealBuilder: {filename}]"

    # Deploy iMessage
    result = {"lead": lead, "dealer_slug": email_dealer_slug, "dealbuilder": filename, "message": None}

    if lead.get("buyer_phone"):
        message = compose_buyer_message(lead, dealbuilder_url)
        deploy_result = deploy_message(lead["buyer_phone"], message)
        result["message"] = deploy_result

    # Mark as read
    mark_as_read(service, msg_id)

    scribe("lead_processed", {
        "buyer": lead.get("buyer_name", "unknown"),
        "equipment": f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip(),
        "channel": result.get("message", {}).get("channel", "none"),
        "is_imessage": result.get("message", {}).get("is_imessage", False),
        "dealer_slug": email_dealer_slug,
    })

    return result


# ---------------------------------------------------------------------------
# Run Modes
# ---------------------------------------------------------------------------


def run_once(service) -> list[dict]:
    """Single run — process all unread leads, return results."""
    leads = fetch_unread_leads(service)
    log.info(f"Found {len(leads)} unread lead(s)")
    results = []
    for msg in leads:
        result = process_lead(service, msg)
        if result:
            results.append(result)
    return results


def format_report(results: list[dict]) -> str:
    """Format results as a human-readable report for OpenClaw relay."""
    if not results:
        return "Σ Lead Response — 0 new leads."

    lines = [f"Σ Lead Response — {len(results)} lead(s) processed:\n"]
    for r in results:
        lead = r["lead"]
        equip = f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip()
        buyer = lead.get("buyer_name", "Unknown buyer")
        source = lead.get("source_platform", "Unknown")
        msg_status = r.get("message", {})
        channel = msg_status.get("channel", "none")
        is_imessage = msg_status.get("is_imessage", False)
        phone = lead.get("buyer_phone", "N/A")
        bubble = "blue bubble" if is_imessage else "SMS"

        if msg_status.get("status") == "deployed":
            lines.append(
                f"✅ Lead from {source}: {buyer} asking about\n"
                f"   {equip}. DealBuilder generated,\n"
                f"   iMessage deployed to {phone} ({bubble})."
            )
        else:
            lines.append(
                f"⚠️  Lead from {source}: {buyer} asking about\n"
                f"   {equip}. DealBuilder generated,\n"
                f"   message deploy failed ({channel})."
            )

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Σ Lead Response Agent")
    parser.add_argument("--once", action="store_true", help="Single run, then exit")
    parser.add_argument("--json", action="store_true", help="JSON output mode")
    parser.add_argument("--provision", metavar="SLUG", help="Provision a new Linq number for a dealer")
    parser.add_argument("--area-code", metavar="CODE", help="Preferred area code for provisioning")
    args = parser.parse_args()

    # Provision mode — just get a number and exit
    if args.provision:
        result = provision_sig_number(args.provision, args.area_code)
        print(json.dumps(result, indent=2))
        return

    log.info("Σ Lead Response Agent starting...")
    service = get_gmail_service()

    if args.once or args.json:
        results = run_once(service)
        if args.json:
            output = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "leads_processed": len(results),
                "results": results,
                "scribe_log": SCRIBE_LOG,
            }
            print(json.dumps(output, indent=2, default=str))
        else:
            print(format_report(results))
    else:
        # Polling loop
        log.info(f"Entering polling loop (every {POLL_INTERVAL}s). Ctrl+C to stop.")
        while True:
            try:
                results = run_once(service)
                if results:
                    log.info(format_report(results))
            except KeyboardInterrupt:
                log.info("Σ Lead Response Agent stopped.")
                break
            except Exception as e:
                log.error(f"Error in polling loop: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
