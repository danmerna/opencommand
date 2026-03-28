#!/usr/bin/env python3
"""
Inbound Message Webhook Server

Receives inbound messages from Linq when buyers reply.
Routes by dealer_slug, logs everything, forwards to salesperson.

Runs autonomously — no approval gates. Every reply gets logged,
every salesperson gets notified immediately.

Run: python webhook_server.py
"""

import os
import json
import logging
import requests
from datetime import datetime, timezone

from flask import Flask, request, jsonify

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SALESPERSON_PHONE = os.environ.get("SALESPERSON_PHONE", "")
SALESPERSON_NAME = os.environ.get("SALESPERSON_NAME", "")
DEALER_NAME = os.environ.get("DEALER_NAME", "")
LINQ_API_KEY = os.environ.get("LINQ_API_KEY", "")
LINQ_FROM_NUMBER = os.environ.get("LINQ_FROM_NUMBER", os.environ.get("LINQ_SANDBOX_NUMBER", ""))
LINQ_API_BASE = "https://api.linqapp.com/v1"

PORT = int(os.environ.get("WEBHOOK_PORT", "5050"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("webhook")

app = Flask(__name__)

AUDIT_LOG: list[dict] = []


def audit(event: str, data: dict | None = None):
    entry = {"ts": datetime.now(timezone.utc).isoformat(), "event": event, **(data or {})}
    AUDIT_LOG.append(entry)
    log.info(f"{event} | {json.dumps(data or {})}")


# ---------------------------------------------------------------------------
# Lead Lookup (stub — production: query database)
# ---------------------------------------------------------------------------

KNOWN_LEADS: dict[str, dict] = {}


def normalize_phone(phone: str) -> str:
    return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")


def lookup_lead(phone: str) -> dict | None:
    return KNOWN_LEADS.get(normalize_phone(phone))


def register_lead(phone: str, data: dict):
    KNOWN_LEADS[normalize_phone(phone)] = data


# ---------------------------------------------------------------------------
# Salesperson Notification
# ---------------------------------------------------------------------------


def notify_salesperson(sender: str, message: str, dealer_slug: str, lead: dict | None):
    """Forward buyer reply to salesperson immediately."""
    if not LINQ_API_KEY or not LINQ_FROM_NUMBER or not SALESPERSON_PHONE:
        log.info(f"Would notify salesperson: {sender} said '{message}'")
        return

    lead_context = ""
    if lead:
        equip = f"{lead.get('equipment_year', '')} {lead.get('equipment_make', '')} {lead.get('equipment_model', '')}".strip()
        if equip:
            lead_context = f" (re: {equip})"

    notification = (
        f"Reply from {sender}{lead_context}:\n\n"
        f'"{message}"\n\n'
        f"Reply directly to {sender} to continue."
    )

    try:
        requests.post(
            f"{LINQ_API_BASE}/messages/send",
            headers={"Authorization": f"Bearer {LINQ_API_KEY}", "Content-Type": "application/json"},
            json={"to": SALESPERSON_PHONE, "from": LINQ_FROM_NUMBER, "content": notification},
            timeout=10,
        )
        audit("salesperson_notified", {"salesperson": SALESPERSON_PHONE, "about": sender})
    except Exception as e:
        log.error(f"Failed to notify salesperson: {e}")


# ---------------------------------------------------------------------------
# Webhook Endpoints
# ---------------------------------------------------------------------------


@app.route("/webhook/linq/<dealer_slug>", methods=["POST"])
def linq_webhook(dealer_slug: str):
    """Receive inbound messages from Linq. Route by dealer_slug."""
    payload = request.get_json(silent=True) or {}

    sender = payload.get("number", payload.get("from", ""))
    message = payload.get("content", payload.get("body", ""))
    is_imessage = not payload.get("was_downgraded", True)
    channel = "imessage" if is_imessage else "sms"

    audit("inbound_received", {
        "sender": sender,
        "message": message,
        "channel": channel,
        "dealer": dealer_slug,
    })

    lead = lookup_lead(sender)

    # Autonomous: always notify salesperson, always log
    notify_salesperson(sender, message, dealer_slug, lead)

    return jsonify({"status": "received", "dealer": dealer_slug, "channel": channel}), 200


@app.route("/webhook/linq/<dealer_slug>", methods=["GET"])
def linq_webhook_verify(dealer_slug: str):
    challenge = request.args.get("challenge", "")
    return jsonify({"challenge": challenge, "dealer": dealer_slug}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "lead-response-webhook",
        "dealer": DEALER_NAME,
        "audit_entries": len(AUDIT_LOG),
    }), 200


@app.route("/audit", methods=["GET"])
def get_audit():
    return jsonify({"entries": AUDIT_LOG}), 200


if __name__ == "__main__":
    log.info(f"Webhook server starting on port {PORT}...")
    log.info(f"Webhook URL: http://0.0.0.0:{PORT}/webhook/linq/{os.environ.get('DEALER_SLUG', 'default')}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
