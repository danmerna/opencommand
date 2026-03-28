#!/usr/bin/env python3
"""
Σ Inbound Message Webhook Server

Receives inbound messages from Linq when buyers reply to Sig's iMessage.
Logs replies, flags salesperson at L0-L1, stubs conversational response for L2+.

Run: python webhook_server.py
Default port: 5050
"""

import os
import json
import logging
from datetime import datetime, timezone

from flask import Flask, request, jsonify

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TRUST_LEVEL = int(os.environ.get("TRUST_LEVEL", "1"))  # L0=0, L1=1, L2=2, L3=3
SALESPERSON_PHONE = os.environ.get("SALESPERSON_PHONE", "+16125550147")
SALESPERSON_NAME = os.environ.get("SALESPERSON_NAME", "Jake Mueller")
DEALER_NAME = os.environ.get("DEALER_NAME", "Johnson Tractor")
LINQ_API_KEY = os.environ.get("LINQ_API_KEY", "")
LINQ_SANDBOX_NUMBER = os.environ.get("LINQ_SANDBOX_NUMBER", "")

PORT = int(os.environ.get("WEBHOOK_PORT", "5050"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("sig-webhook")

app = Flask(__name__)

# In-memory Σribe log (production: persist to DB)
SCRIBE_LOG: list[dict] = []


def scribe(event: str, data: dict | None = None):
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **(data or {}),
    }
    SCRIBE_LOG.append(entry)
    log.info(f"Σribe: {event} | {json.dumps(data or {})}")


# ---------------------------------------------------------------------------
# Lead Lookup (stub — production: query database)
# ---------------------------------------------------------------------------

# In-memory lead store for demo
KNOWN_LEADS: dict[str, dict] = {}


def lookup_lead_by_phone(phone: str) -> dict | None:
    """Look up a lead by phone number."""
    normalized = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    return KNOWN_LEADS.get(normalized)


def register_lead(phone: str, data: dict):
    """Register a lead for later lookup (called by lead_response_agent)."""
    normalized = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    KNOWN_LEADS[normalized] = data


# ---------------------------------------------------------------------------
# Inbound Message Handlers
# ---------------------------------------------------------------------------


def handle_l0_l1(sender: str, message: str, dealer_slug: str, lead: dict | None):
    """L0-L1: Log and flag salesperson with full context."""
    scribe("inbound_message_flagged", {
        "sender": sender,
        "message": message,
        "dealer_slug": dealer_slug,
        "trust_level": TRUST_LEVEL,
        "lead": lead,
    })

    # In production: send notification to salesperson via Linq/SMS/email
    log.info(
        f"🔔 SALESPERSON ALERT: Reply from {sender}\n"
        f"   Message: {message}\n"
        f"   Lead: {json.dumps(lead) if lead else 'Unknown'}\n"
        f"   Action needed: Respond to buyer"
    )

    return {
        "action": "flagged_salesperson",
        "trust_level": TRUST_LEVEL,
        "salesperson": SALESPERSON_NAME,
    }


def handle_l2_plus(sender: str, message: str, dealer_slug: str, lead: dict | None):
    """L2+: Sig responds conversationally (stubbed for now)."""
    scribe("inbound_message_auto_response_stub", {
        "sender": sender,
        "message": message,
        "dealer_slug": dealer_slug,
        "trust_level": TRUST_LEVEL,
    })

    # STUB: In production, Sig would generate a conversational response
    # using the LLM with full lead context and deploy it via Linq.
    log.info(
        f"🤖 L2+ AUTO-RESPONSE STUB: Would respond to {sender}\n"
        f"   Their message: {message}\n"
        f"   (Auto-response not yet implemented)"
    )

    return {
        "action": "auto_response_stub",
        "trust_level": TRUST_LEVEL,
        "note": "Conversational auto-response not yet implemented. Falling back to salesperson flag.",
    }


# ---------------------------------------------------------------------------
# Webhook Endpoints
# ---------------------------------------------------------------------------


@app.route("/webhook/linq/<dealer_slug>", methods=["POST"])
def linq_webhook(dealer_slug: str):
    """Receive inbound messages from Linq."""
    payload = request.get_json(silent=True) or {}

    sender = payload.get("from", "")
    message = payload.get("body", "")
    channel = payload.get("channel", "unknown")
    timestamp = payload.get("timestamp", datetime.now(timezone.utc).isoformat())

    scribe("inbound_message_received", {
        "sender": sender,
        "message": message,
        "channel": channel,
        "dealer_slug": dealer_slug,
        "timestamp": timestamp,
    })

    # Look up the lead
    lead = lookup_lead_by_phone(sender)

    # Route based on Trust Gradient
    if TRUST_LEVEL <= 1:
        result = handle_l0_l1(sender, message, dealer_slug, lead)
    else:
        result = handle_l2_plus(sender, message, dealer_slug, lead)
        # Even at L2+, still flag salesperson as fallback for now
        handle_l0_l1(sender, message, dealer_slug, lead)

    return jsonify({"status": "received", **result}), 200


@app.route("/webhook/linq/<dealer_slug>", methods=["GET"])
def linq_webhook_verify(dealer_slug: str):
    """Verification endpoint for Linq webhook setup."""
    challenge = request.args.get("challenge", "")
    return jsonify({"challenge": challenge, "dealer_slug": dealer_slug}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "agent": "sig-webhook",
        "dealer": DEALER_NAME,
        "trust_level": f"L{TRUST_LEVEL}",
        "scribe_entries": len(SCRIBE_LOG),
    }), 200


@app.route("/scribe", methods=["GET"])
def get_scribe():
    """View the Σribe audit trail."""
    return jsonify({"entries": SCRIBE_LOG}), 200


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    log.info(f"Σ Webhook Server starting on port {PORT}...")
    log.info(f"Trust Gradient: L{TRUST_LEVEL}")
    log.info(f"Webhook URL: http://0.0.0.0:{PORT}/webhook/linq/{os.environ.get('DEALER_SLUG', 'johnsontractor')}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
