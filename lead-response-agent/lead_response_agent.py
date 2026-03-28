#!/usr/bin/env python3
"""
Lead Response Engine — OpenClaw Skill

Autonomous lead processing pipeline. Watches Gmail for lead notification
emails from equipment listing platforms (TractorHouse, MachineryTrader),
parses them, generates a DealBuilder quote page, and deploys a message
to the buyer via Linq (iMessage/RCS/SMS) with Twilio fallback.

This is infrastructure — a faceless engine that runs at full autonomy.
No identity layer. No approval gates. Lead comes in, response goes out.

Run modes:
  python lead_response_agent.py          # Polling loop (30s heartbeat)
  python lead_response_agent.py --once   # Single run (OpenClaw/cron)
  python lead_response_agent.py --json   # JSON output for programmatic use
"""

import os
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
LINQ_FROM_NUMBER = os.environ.get("LINQ_FROM_NUMBER", os.environ.get("LINQ_SANDBOX_NUMBER", ""))
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

TRUST_LEVEL = int(os.environ.get("TRUST_LEVEL", "3"))  # L0=Notify, L1=Drafts, L2=Auto+Log, L3=Full Autonomy

POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("lead-response")

# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

AUDIT_LOG: list[dict] = []


def audit(event: str, data: dict | None = None):
    """Append an entry to the audit log."""
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **(data or {}),
    }
    AUDIT_LOG.append(entry)
    log.info(f"{event} | {json.dumps(data or {})}")


# ---------------------------------------------------------------------------
# Number Provisioning
# ---------------------------------------------------------------------------


def provision_number(dealer_slug: str, area_code: str | None = None) -> dict:
    """Provision a new Linq phone number for a dealer."""
    headers = {
        "Authorization": f"Bearer {LINQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"friendly_name": f"lead-response-{dealer_slug}"}
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
    audit("number_provisioned", {"dealer_slug": dealer_slug, "result": result})
    return result


# ---------------------------------------------------------------------------
# Gmail
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
            creds = flow.run_local_server(port=8080)
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
    service.users().messages().modify(
        userId="me", id=msg_id, body={"removeLabelIds": ["UNREAD"]}
    ).execute()


def extract_email_body(msg: dict) -> str:
    payload = msg.get("payload", {})
    if "body" in payload and payload["body"].get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
        for sub in part.get("parts", []):
            if sub.get("mimeType") == "text/plain" and sub.get("body", {}).get("data"):
                return base64.urlsafe_b64decode(sub["body"]["data"]).decode("utf-8", errors="replace")
    return ""


def get_header(msg: dict, name: str) -> str:
    for h in msg.get("payload", {}).get("headers", []):
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def extract_dealer_slug_from_to(msg: dict) -> str | None:
    """Extract dealer slug from To: header. e.g. sig-johnsontractor@bot.opencommand.co → johnsontractor"""
    to_addr = get_header(msg, "To")
    match = re.search(r"sig-([a-z0-9]+)@", to_addr, re.IGNORECASE)
    return match.group(1).lower() if match else None


# ---------------------------------------------------------------------------
# Lead Parsing — Regex + LLM Fallback
# ---------------------------------------------------------------------------

LEAD_FIELDS = [
    "buyer_name", "buyer_phone", "buyer_email", "buyer_message",
    "equipment_year", "equipment_make", "equipment_model",
    "equipment_stock", "equipment_hours", "equipment_price",
    "equipment_location", "source_platform",
]

REGEX_PATTERNS = {
    "buyer_name": [
        r"(?:Name|Contact|From)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)",
        r"(?:Buyer|Customer)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)",
    ],
    "buyer_phone": [r"(?:Phone|Tel|Mobile|Cell)[:\s]*([\+\d\(\)\-\s]{10,})"],
    "buyer_email": [
        r"(?:Email)[:\s]*([\w\.\-\+]+@[\w\.\-]+\.\w+)",
        r"([\w\.\-\+]+@[\w\.\-]+\.\w+)",
    ],
    "buyer_message": [r"(?:Message|Comments?|Notes?|Question)[:\s]*(.+?)(?:\n\n|\Z)"],
    "equipment_year": [r"(?:Year)[:\s]*(\d{4})", r"\b(20\d{2}|19\d{2})\b"],
    "equipment_make": [r"(?:Make|Brand|Manufacturer)[:\s]*(\w[\w\s]*?)(?:\n|,|$)"],
    "equipment_model": [r"(?:Model)[:\s]*(\w[\w\s\-\/]*?)(?:\n|,|$)"],
    "equipment_stock": [r"(?:Stock ?#?|Item ?#?|Ref)[:\s]*([\w\-]+)"],
}


def parse_lead_regex(body: str, subject: str) -> dict:
    parsed = {}
    text = f"{subject}\n{body}"
    for field, patterns in REGEX_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                parsed[field] = match.group(1).strip()
                break
    if "tractorhouse" in text.lower():
        parsed["source_platform"] = "TractorHouse"
    elif "machinerytrader" in text.lower():
        parsed["source_platform"] = "MachineryTrader"
    return parsed


def parse_lead_llm(body: str, subject: str) -> dict:
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
            headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
            json={"model": LLM_MODEL, "messages": [{"role": "user", "content": prompt}], "temperature": 0, "max_tokens": 500},
            timeout=15,
        )
        content = resp.json()["choices"][0]["message"]["content"]
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        log.warning(f"LLM parse failed: {e}")
    return {}


def parse_lead(body: str, subject: str) -> dict:
    parsed = parse_lead_regex(body, subject)
    audit("lead_parsed_regex", {"fields_found": list(parsed.keys())})
    missing = [f for f in LEAD_FIELDS if f not in parsed]
    if missing and LLM_API_KEY:
        llm_parsed = parse_lead_llm(body, subject)
        for field in missing:
            if field in llm_parsed and llm_parsed[field]:
                parsed[field] = llm_parsed[field]
        audit("lead_parsed_llm", {"fields_added": [f for f in missing if f in parsed]})
    return parsed


# ---------------------------------------------------------------------------
# DealBuilder — Generate Quote Page
# ---------------------------------------------------------------------------


def generate_dealbuilder(lead: dict, dealer_slug: str | None = None) -> str:
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
        sig_number=LINQ_FROM_NUMBER,
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
    (output_dir / filename).write_text(html)
    audit("dealbuilder_generated", {"quote_id": quote_id, "file": filename})
    return filename


# ---------------------------------------------------------------------------
# Messaging — Linq (primary) + Twilio (fallback)
# ---------------------------------------------------------------------------


def deploy_via_linq(to: str, message: str, from_number: str) -> dict:
    resp = requests.post(
        f"{LINQ_API_BASE}/messages/send",
        headers={"Authorization": f"Bearer {LINQ_API_KEY}", "Content-Type": "application/json"},
        json={"to": to, "from": from_number, "content": message},
        timeout=10,
    )
    resp.raise_for_status()
    result = resp.json()
    is_imessage = not result.get("was_downgraded", True)
    channel = "imessage" if is_imessage else result.get("channel", "sms")
    audit("message_deployed", {"provider": "linq", "to": to, "channel": channel})
    return {"provider": "linq", "channel": channel, "is_imessage": is_imessage, "status": "deployed"}


def deploy_via_twilio(to: str, message: str) -> dict:
    if not TWILIO_SID or not TWILIO_AUTH_TOKEN:
        raise RuntimeError("Twilio not configured")
    from twilio.rest import Client
    client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
    msg = client.messages.create(body=message, from_=TWILIO_FROM_NUMBER, to=to)
    audit("message_deployed", {"provider": "twilio", "to": to, "sid": msg.sid})
    return {"provider": "twilio", "channel": "sms", "is_imessage": False, "status": "deployed", "sid": msg.sid}


def deploy_message(to: str, message: str) -> dict:
    """Deploy message — Linq first, Twilio fallback. Fully autonomous."""
    try:
        return deploy_via_linq(to, message, LINQ_FROM_NUMBER)
    except Exception as e:
        log.warning(f"Linq failed ({e}), falling back to Twilio")
        audit("linq_fallback", {"error": str(e)})
        try:
            return deploy_via_twilio(to, message)
        except Exception as e2:
            log.error(f"All messaging failed: {e2}")
            audit("message_failed", {"error": str(e2)})
            return {"provider": "none", "channel": "none", "status": "failed", "error": str(e2)}


# ---------------------------------------------------------------------------
# Email — Resend
# ---------------------------------------------------------------------------


def send_email(to: str, subject: str, html_body: str, dealer_slug: str | None = None):
    """Send outbound email via Resend."""
    if not RESEND_API_KEY:
        return
    slug = dealer_slug or DEALER_SLUG
    from_addr = f"leads-{slug}@{RESEND_DOMAIN}"
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": f"{DEALER_NAME} <{from_addr}>",
            "to": [to],
            "subject": subject,
            "html": html_body,
        },
        timeout=10,
    )
    audit("email_sent", {"to": to, "status": resp.status_code})


# ---------------------------------------------------------------------------
# Lead Processing Pipeline — Full Autonomy
# ---------------------------------------------------------------------------


def compose_buyer_message(lead: dict, dealbuilder_url: str) -> str:
    equip = f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip()
    buyer = lead.get("buyer_name", "").split()[0] if lead.get("buyer_name") else "there"
    source = lead.get("source_platform", "online")

    return (
        f"Hey {buyer}, saw you were looking at the {equip} "
        f"on {source}. Put together pricing and options "
        f"for you here: {dealbuilder_url}\n\n"
        f"— {SALESPERSON_NAME}, {DEALER_NAME} {DEALER_LOCATION}"
    )


def check_trust_gradient(action: str, context: dict) -> dict:
    """
    Framework-level trust check. Runs on EVERY action, non-negotiable.

    L0 — Notify Only: Log the action, notify operator, do NOT execute
    L1 — Drafts for Review: Generate the output, hold for approval
    L2 — Auto-Execute + Log: Execute and log, notify operator after
    L3 — Full Autonomy: Execute, log, no notification needed

    Returns: {"execute": bool, "log": bool, "notify": bool, "hold": bool}
    """
    decision = {
        "trust_level": TRUST_LEVEL,
        "action": action,
        "execute": TRUST_LEVEL >= 2,
        "hold": TRUST_LEVEL == 1,
        "notify": TRUST_LEVEL <= 2,
        "log": True,  # Always log. Non-negotiable.
    }

    audit("trust_check", {**decision, **context})
    return decision


def process_lead(service, msg: dict) -> dict | None:
    """Process a single lead through the pipeline with trust gradient checks."""
    msg_id = msg["id"]
    subject = get_header(msg, "Subject")
    body = extract_email_body(msg)
    dealer_slug = extract_dealer_slug_from_to(msg) or DEALER_SLUG

    audit("lead_received", {"msg_id": msg_id, "subject": subject, "dealer": dealer_slug})

    # Parse — always runs regardless of trust level
    lead = parse_lead(body, subject)
    if not lead.get("buyer_phone") and not lead.get("buyer_email"):
        audit("lead_skipped", {"reason": "no contact info", "msg_id": msg_id})
        mark_as_read(service, msg_id)
        return None

    # Generate DealBuilder — always runs (generation is safe)
    filename = generate_dealbuilder(lead, dealer_slug=dealer_slug)
    dealbuilder_url = (
        f"{DEALBUILDER_BASE_URL}/deal/{dealer_slug}/{filename}"
        if DEALBUILDER_BASE_URL
        else f"[DealBuilder: {filename}]"
    )

    result = {
        "lead": lead,
        "dealer": dealer_slug,
        "dealbuilder": filename,
        "trust_level": TRUST_LEVEL,
        "message": None,
        "email": None,
    }

    # Trust check before deploying message
    trust = check_trust_gradient("deploy_message", {
        "buyer": lead.get("buyer_name", "unknown"),
        "phone": lead.get("buyer_phone", ""),
        "dealer": dealer_slug,
    })

    if trust["hold"]:
        # L1: Draft generated, held for review
        result["message"] = {
            "status": "held",
            "reason": "L1 — drafted, awaiting approval",
            "draft": compose_buyer_message(lead, dealbuilder_url),
        }
        audit("message_held", {"trust_level": 1, "buyer": lead.get("buyer_name")})

    elif trust["execute"]:
        # L2/L3: Deploy
        if lead.get("buyer_phone"):
            message = compose_buyer_message(lead, dealbuilder_url)
            result["message"] = deploy_message(lead["buyer_phone"], message)

        if lead.get("buyer_email") and not lead.get("buyer_phone"):
            equip = f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip()
            send_email(
                lead["buyer_email"],
                f"Your inquiry about the {equip} — {DEALER_NAME}",
                f"<p>Hi {lead.get('buyer_name', 'there').split()[0] if lead.get('buyer_name') else 'there'},</p>"
                f"<p>Thanks for your interest in the {equip}. "
                f"I put together details and financing options for you:</p>"
                f"<p><a href='{dealbuilder_url}'>View your personalized quote</a></p>"
                f"<p>— {SALESPERSON_NAME}, {DEALER_NAME}</p>",
                dealer_slug=dealer_slug,
            )
            result["email"] = {"status": "sent", "to": lead["buyer_email"]}

    else:
        # L0: Notify only, do not execute
        result["message"] = {"status": "logged", "reason": "L0 — notify only, not deployed"}
        audit("message_not_deployed", {"trust_level": 0, "buyer": lead.get("buyer_name")})

    mark_as_read(service, msg_id)

    audit("lead_processed", {
        "buyer": lead.get("buyer_name", "unknown"),
        "equipment": f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip(),
        "channel": (result.get("message") or {}).get("channel", "email" if result.get("email") else "none"),
        "trust_level": TRUST_LEVEL,
        "dealer": dealer_slug,
    })

    return result


# ---------------------------------------------------------------------------
# Run Modes
# ---------------------------------------------------------------------------


def run_once(service) -> list[dict]:
    leads = fetch_unread_leads(service)
    log.info(f"Found {len(leads)} unread lead(s)")
    results = []
    for msg in leads:
        result = process_lead(service, msg)
        if result:
            results.append(result)
    return results


def format_report(results: list[dict]) -> str:
    if not results:
        return "Lead Response — 0 new leads."

    lines = [f"Lead Response — {len(results)} lead(s) processed:\n"]
    for r in results:
        lead = r["lead"]
        equip = f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip()
        buyer = lead.get("buyer_name", "Unknown buyer")
        source = lead.get("source_platform", "Unknown")
        msg = r.get("message") or {}
        channel = msg.get("channel", "none")
        phone = lead.get("buyer_phone", "N/A")

        if msg.get("status") == "deployed":
            bubble = "blue bubble" if msg.get("is_imessage") else "SMS"
            lines.append(f"  ✅ {source}: {buyer} → {equip} → {phone} ({bubble})")
        elif r.get("email", {}).get("status") == "sent":
            lines.append(f"  ✅ {source}: {buyer} → {equip} → email sent")
        else:
            lines.append(f"  ⚠️  {source}: {buyer} → {equip} → failed ({channel})")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Lead Response Engine")
    parser.add_argument("--once", action="store_true", help="Single run, then exit")
    parser.add_argument("--json", action="store_true", help="JSON output mode")
    parser.add_argument("--provision", metavar="SLUG", help="Provision a new Linq number")
    parser.add_argument("--area-code", metavar="CODE", help="Preferred area code for provisioning")
    args = parser.parse_args()

    if args.provision:
        result = provision_number(args.provision, args.area_code)
        print(json.dumps(result, indent=2))
        return

    log.info("Lead Response Engine starting...")
    service = get_gmail_service()

    if args.once or args.json:
        results = run_once(service)
        if args.json:
            print(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "leads_processed": len(results),
                "results": results,
                "audit_log": AUDIT_LOG,
            }, indent=2, default=str))
        else:
            print(format_report(results))
    else:
        log.info(f"Polling every {POLL_INTERVAL}s. Ctrl+C to stop.")
        while True:
            try:
                results = run_once(service)
                if results:
                    log.info(format_report(results))
            except KeyboardInterrupt:
                log.info("Lead Response Engine stopped.")
                break
            except Exception as e:
                log.error(f"Error in polling loop: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
