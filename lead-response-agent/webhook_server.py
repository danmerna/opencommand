#!/usr/bin/env python3
"""
Webhook server for inbound Linq messages.

Handles buyer replies routed through Linq, logs them to the
Scribe audit trail, and alerts the assigned salesperson.
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request

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
# Config
# ──────────────────────────────────────────────

SCRIBE_LOG_PATH = os.getenv("SCRIBE_LOG_PATH", "./verified_scribe.jsonl")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "5000"))
SALESPERSON_NAME = os.getenv("SALESPERSON_NAME", "Sales Team")
SALESPERSON_PHONE = os.getenv("SALESPERSON_PHONE", "")

app = Flask(__name__)


# ──────────────────────────────────────────────
# Scribe logging
# ──────────────────────────────────────────────

def scribe_log(event_type: str, data: dict, metadata: dict = None):
    """Append an entry to the Scribe audit log."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event_type,
        "lead": data,
        "metadata": metadata or {},
    }
    log_path = Path(SCRIBE_LOG_PATH)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a") as f:
        f.write(json.dumps(entry, default=str) + "\n")


# ──────────────────────────────────────────────
# Lead lookup from Scribe log
# ──────────────────────────────────────────────

def lookup_lead_by_phone(phone: str) -> dict | None:
    """
    Find the most recent lead associated with a phone number
    from the Scribe audit log.
    """
    log_path = Path(SCRIBE_LOG_PATH)
    if not log_path.exists():
        return None

    match = None
    try:
        with open(log_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    lead = entry.get("lead", {})
                    if lead.get("buyer_phone") == phone:
                        match = entry
                except (json.JSONDecodeError, ValueError):
                    continue
    except OSError:
        pass

    return match


def count_messages_from_phone(phone: str) -> int:
    """Count inbound messages from a phone number in the Scribe log."""
    log_path = Path(SCRIBE_LOG_PATH)
    if not log_path.exists():
        return 0

    count = 0
    try:
        with open(log_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    if (
                        entry.get("event") == "inbound_message"
                        and entry.get("metadata", {}).get("from_phone") == phone
                    ):
                        count += 1
                except (json.JSONDecodeError, ValueError):
                    continue
    except OSError:
        pass

    return count


# ──────────────────────────────────────────────
# Salesperson alert
# ──────────────────────────────────────────────

def alert_salesperson(lead_context: dict, inbound_message: str, from_phone: str, dealer_slug: str):
    """
    Alert the assigned salesperson about a buyer reply.
    Currently prints to stdout — ready for Slack/SMS/push integration.
    """
    buyer_name = lead_context.get("lead", {}).get("buyer_name", "Unknown")
    quote_id = lead_context.get("metadata", {}).get("quote_id", "N/A")

    alert = (
        f"\n{'='*60}\n"
        f"  BUYER REPLY ALERT — {dealer_slug}\n"
        f"{'='*60}\n"
        f"  From:    {buyer_name} ({from_phone})\n"
        f"  Quote:   {quote_id}\n"
        f"  Message: {inbound_message[:200]}\n"
        f"{'='*60}\n"
        f"  Action required: {SALESPERSON_NAME} ({SALESPERSON_PHONE})\n"
        f"{'='*60}\n"
    )
    print(alert)
    logger.info("Salesperson alert printed for %s from %s", quote_id, from_phone)


# ──────────────────────────────────────────────
# Webhook routes
# ──────────────────────────────────────────────

@app.route("/webhook/linq/<dealer_slug>", methods=["POST"])
def linq_webhook(dealer_slug: str):
    """
    Receive inbound messages from Linq.

    Expected payload:
    {
        "from": "+1XXXXXXXXXX",
        "to": "+1YYYYYYYYYY",
        "body": "message text",
        "timestamp": "ISO8601",
        "message_id": "linq-msg-id"
    }
    """
    payload = request.get_json(silent=True)
    if not payload:
        logger.warning("Empty or invalid JSON payload on webhook for %s", dealer_slug)
        return jsonify({"error": "Invalid payload"}), 400

    from_phone = payload.get("from", "")
    message_body = payload.get("body", "")
    message_id = payload.get("message_id", "")
    timestamp = payload.get("timestamp", datetime.now(timezone.utc).isoformat())

    if not from_phone or not message_body:
        logger.warning("Missing from or body in webhook payload")
        return jsonify({"error": "Missing required fields: from, body"}), 400

    logger.info("Inbound message from %s for dealer %s", from_phone, dealer_slug)

    # Scribe log the inbound message
    scribe_log("inbound_message", {
        "dealer_slug": dealer_slug,
        "message_body": message_body[:500],
    }, {
        "from_phone": from_phone,
        "message_id": message_id,
        "received_at": timestamp,
        "channel": "linq",
    })

    # Look up lead by phone number
    lead_context = lookup_lead_by_phone(from_phone)
    message_count = count_messages_from_phone(from_phone)

    # Determine conversation level
    # L0 = first reply, L1 = second reply, L2+ = ongoing conversation
    level = message_count  # count is from before this message was logged

    if level <= 1:
        # L0-L1: log reply, alert salesperson
        logger.info("Conversation level L%d for %s — alerting salesperson", level, from_phone)

        if lead_context:
            alert_salesperson(lead_context, message_body, from_phone, dealer_slug)
        else:
            logger.info("No prior lead found for %s — logging as new contact", from_phone)
            alert_salesperson(
                {"lead": {"buyer_name": "Unknown"}, "metadata": {"quote_id": "N/A"}},
                message_body,
                from_phone,
                dealer_slug,
            )

        return jsonify({
            "status": "received",
            "level": f"L{level}",
            "action": "salesperson_alerted",
        }), 200

    else:
        # L2+: stub for conversational AI response
        logger.info("Conversation level L%d for %s — conversational stub", level, from_phone)

        # TODO: integrate conversational Blueprint for L2+ responses
        # For now, still alert salesperson
        if lead_context:
            alert_salesperson(lead_context, message_body, from_phone, dealer_slug)

        return jsonify({
            "status": "received",
            "level": f"L{level}",
            "action": "conversational_stub",
        }), 200


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "lead-response-webhook",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting webhook server on port %d", WEBHOOK_PORT)
    app.run(host="0.0.0.0", port=WEBHOOK_PORT, debug=False)
