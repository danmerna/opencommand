#!/usr/bin/env python3
"""
Morning Briefing Agent
======================
Deploys a daily prioritised briefing via iMessage (Linq) for equipment
dealers.  Powered by Magnetic AI.

Run modes
---------
    python morning_briefing_agent.py            # deploy via Linq
    python morning_briefing_agent.py --preview  # console only
    python morning_briefing_agent.py --json     # structured JSON output

Brand rules
-----------
- Agent identity: \u03A3
- Sections: Overnight Changes / Today's Strategy
- Actions: Deploy / Approve / Dismiss
- Audit: \u03A3ribe  |  Self-checks: Ralph Loops  |  Playbooks: Blueprints
- Buyer-facing: "Powered by Magnetic AI"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

from data_collectors import collect_all
from insight_generator import generate_insights

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

load_dotenv()

LINQ_API_KEY = os.getenv("LINQ_API_KEY", "")
LINQ_SANDBOX_NUMBER = os.getenv("LINQ_SANDBOX_NUMBER", "")
RECIPIENT_PHONE = os.getenv("BRIEFING_RECIPIENT_PHONE", "")
RECIPIENT_NAME = os.getenv("BRIEFING_RECIPIENT_NAME", "Taylor")
SCRIBE_LOG_FILE = os.getenv("SCRIBE_LOG_FILE", "./verified_scribe.jsonl")
DEALER_NAME = os.getenv("DEALER_NAME", "Johnson Tractor")
CALIBRATION_LOG = os.getenv("CALIBRATION_LOG", "./calibration_log.jsonl")


# ---------------------------------------------------------------------------
# Briefing formatter
# ---------------------------------------------------------------------------

def format_briefing(insights: dict, recipient_name: str) -> str:
    """Render the insight dict into the iMessage briefing format.

    Sections:
    - OVERNIGHT (Overnight Changes): urgent / important / informational
    - TODAY'S STRATEGY

    Severity indicators:
        \U0001f534 Urgent  |  \U0001f7e1 Important  |  \U0001f535 Informational
    """
    lines: list[str] = []
    lines.append(f"Good morning, {recipient_name}.")
    lines.append("")
    lines.append("OVERNIGHT:")

    for item in insights.get("urgent", []):
        lines.append(f"\U0001f534 {item['text']}")
    for item in insights.get("important", []):
        lines.append(f"\U0001f7e1 {item['text']}")
    for item in insights.get("informational", []):
        lines.append(f"\U0001f535 {item['text']}")

    if not any(insights.get(k) for k in ("urgent", "important", "informational")):
        lines.append("\U0001f535 Quiet night. Nothing urgent.")

    lines.append("")
    lines.append("TODAY'S STRATEGY:")

    strategies = insights.get("strategy", [])
    if strategies:
        primary = strategies[0]
        lines.append(f"\u2192 {primary['text']}")
        lines.append("")
        # Derive a short label for the approve action
        action_label = _action_label(primary)
        lines.append(f"Reply 1 to approve {action_label}.")
        lines.append("Reply 2 to dismiss.")
    else:
        lines.append("\u2192 No action items. Enjoy the morning.")
        lines.append("")
        lines.append("Reply 1 to approve.")
        lines.append("Reply 2 to dismiss.")

    lines.append("Or text me anything \u2014 I'm here.")
    lines.append("")
    lines.append("\u2014 \u03A3")

    return "\n".join(lines)


def _action_label(strategy: dict) -> str:
    """Extract a short action label from the strategy for the reply prompt."""
    action_id = strategy.get("action_id", "")
    if "callback" in action_id:
        return "the callback"
    if "outreach" in action_id:
        return "the outreach"
    if "respond" in action_id:
        return "responding to leads"
    if "financing" in action_id:
        return "the follow-up"
    return "this action"


# ---------------------------------------------------------------------------
# Ralph Loop self-checks
# ---------------------------------------------------------------------------

class RalphLoopError(Exception):
    """Raised when a Ralph Loop self-check fails."""


def ralph_loop(insights: dict, briefing_text: str, mode: str) -> list[str]:
    """Run pre-deploy self-checks.  Returns a list of warnings (empty = pass).

    Raises ``RalphLoopError`` if a check is fatal for deploy mode.
    """
    warnings: list[str] = []

    # Check 1: insights must have content
    has_content = any(
        insights.get(k) for k in ("urgent", "important", "informational")
    )
    if not has_content:
        warnings.append("Ralph Loop: No insights generated from any source.")

    # Check 2: briefing text must be well-formed
    if not briefing_text or len(briefing_text) < 20:
        warnings.append("Ralph Loop: Briefing text is too short or empty.")

    if len(briefing_text) > 1600:
        warnings.append(
            f"Ralph Loop: Briefing text is {len(briefing_text)} chars "
            f"(iMessage may truncate over 1600)."
        )

    # Check 3: Linq credentials present (deploy mode only)
    if mode == "deploy":
        if not LINQ_API_KEY:
            raise RalphLoopError("Ralph Loop FATAL: LINQ_API_KEY is not set. Cannot deploy.")
        if not RECIPIENT_PHONE:
            raise RalphLoopError("Ralph Loop FATAL: BRIEFING_RECIPIENT_PHONE is not set.")

    # Check 4: signature present
    if "\u2014 \u03A3" not in briefing_text:
        warnings.append("Ralph Loop: Briefing is missing the \u03A3 signature.")

    return warnings


# ---------------------------------------------------------------------------
# Linq deployment
# ---------------------------------------------------------------------------

def deploy_via_linq(briefing_text: str) -> dict:
    """Deploy the briefing as an iMessage through Linq.

    Returns the Linq API response dict or an error dict.
    """
    url = "https://api.linqapp.com/v1/messages"
    headers = {
        "Authorization": f"Bearer {LINQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "to": RECIPIENT_PHONE,
        "from": LINQ_SANDBOX_NUMBER,
        "body": briefing_text,
        "channel": "imessage",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        return {"error": str(exc), "status_code": getattr(exc.response, "status_code", None)}


# ---------------------------------------------------------------------------
# Reply handling stubs
# ---------------------------------------------------------------------------

def handle_reply(reply_text: str) -> str:
    """Process an inbound reply from the recipient.

    Reply codes:
        1  ->  Approve the primary strategy action
        2  ->  Dismiss
        *  ->  Conversational (pass to LLM)

    Returns a response string to deploy back.
    """
    cleaned = reply_text.strip()

    if cleaned == "1":
        # Approve: in production this triggers the Blueprint for the action
        return (
            "Got it. Approved. I'll track this and update you when it's done.\n\n"
            "\u2014 \u03A3"
        )

    if cleaned == "2":
        # Dismiss
        return (
            "Dismissed. I'll hold off on that. Let me know if anything changes.\n\n"
            "\u2014 \u03A3"
        )

    # Conversational: in production, forward to the LLM with context
    return (
        f"I heard you: \"{cleaned}\"\n"
        "Let me look into that. I'll follow up shortly.\n\n"
        "\u2014 \u03A3"
    )


# ---------------------------------------------------------------------------
# \u03A3ribe logging
# ---------------------------------------------------------------------------

def log_to_scribe(scribe_file: str, record: dict) -> None:
    """Append a record to the \u03A3ribe audit log (JSONL)."""
    record["logged_at"] = datetime.now(timezone.utc).isoformat()
    path = Path(scribe_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


def log_calibration(
    collected: dict,
    insights: dict,
    deploy_result: dict | None,
    latency_ms: float,
) -> None:
    """Log context calibration data after each briefing run."""
    sources_available = {
        src: {
            "status": data.get("status", "unknown"),
            "has_data": bool(data.get("data")),
        }
        for src, data in collected.items()
    }
    insight_counts = {
        k: len(v) for k, v in insights.items()
    }

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources_available": sources_available,
        "insights_generated": insight_counts,
        "deploy_result": deploy_result,
        "latency_ms": round(latency_ms, 1),
    }

    path = Path(CALIBRATION_LOG)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Morning Briefing Agent \u2014 Powered by Magnetic AI",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--preview",
        action="store_true",
        help="Print briefing to console without deploying.",
    )
    group.add_argument(
        "--json",
        action="store_true",
        dest="json_mode",
        help="Output structured JSON instead of formatted briefing.",
    )
    args = parser.parse_args()

    if args.preview:
        mode = "preview"
    elif args.json_mode:
        mode = "json"
    else:
        mode = "deploy"

    t_start = time.monotonic()

    # --- Step 1: Collect data ---
    print(f"[{datetime.now(timezone.utc).isoformat()}] Collecting data from all sources...")
    collected = collect_all(SCRIBE_LOG_FILE)

    live_sources = [s for s, d in collected.items() if d.get("status") == "live"]
    stubbed_sources = [s for s, d in collected.items() if d.get("status") == "stubbed"]
    print(f"  Live sources:    {', '.join(live_sources) or 'none'}")
    print(f"  Stubbed sources: {', '.join(stubbed_sources) or 'none'}")

    # --- Step 2: Generate insights ---
    print("Generating insights...")
    insights = generate_insights(collected)

    counts = {k: len(v) for k, v in insights.items()}
    print(f"  Urgent: {counts['urgent']}  Important: {counts['important']}  "
          f"Info: {counts['informational']}  Strategies: {counts['strategy']}")

    # --- Step 3: JSON mode exits early ---
    if mode == "json":
        output = {
            "briefing_timestamp": datetime.now(timezone.utc).isoformat(),
            "recipient": RECIPIENT_NAME,
            "dealer": DEALER_NAME,
            "insights": insights,
            "sources": {
                s: {"status": d.get("status"), "collected_at": d.get("collected_at")}
                for s, d in collected.items()
            },
        }
        print(json.dumps(output, indent=2, default=str))
        latency_ms = (time.monotonic() - t_start) * 1000
        log_calibration(collected, insights, None, latency_ms)
        return

    # --- Step 4: Format briefing ---
    briefing_text = format_briefing(insights, RECIPIENT_NAME)

    # --- Step 5: Ralph Loop self-checks ---
    print("Running Ralph Loop self-checks...")
    try:
        warnings = ralph_loop(insights, briefing_text, mode)
    except RalphLoopError as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        latency_ms = (time.monotonic() - t_start) * 1000
        log_calibration(collected, insights, {"error": str(exc)}, latency_ms)
        sys.exit(1)

    for w in warnings:
        print(f"  WARNING: {w}")

    # --- Step 6: Deploy or preview ---
    deploy_result = None

    if mode == "preview":
        print("\n" + "=" * 60)
        print("PREVIEW (not deployed)")
        print("=" * 60)
        print(briefing_text)
        print("=" * 60)
    else:
        print(f"Deploying briefing to {RECIPIENT_PHONE} via Linq...")
        deploy_result = deploy_via_linq(briefing_text)

        if "error" in deploy_result:
            print(f"  Deploy failed: {deploy_result['error']}", file=sys.stderr)
        else:
            print(f"  Deployed successfully. Message ID: {deploy_result.get('id', 'unknown')}")

            # Log to \u03A3ribe
            log_to_scribe(SCRIBE_LOG_FILE, {
                "type": "morning_briefing",
                "recipient": RECIPIENT_PHONE,
                "recipient_name": RECIPIENT_NAME,
                "dealer": DEALER_NAME,
                "insights_summary": {k: len(v) for k, v in insights.items()},
                "deploy_status": "success",
                "message_id": deploy_result.get("id"),
            })

    # --- Step 7: Calibration logging ---
    latency_ms = (time.monotonic() - t_start) * 1000
    log_calibration(collected, insights, deploy_result, latency_ms)
    print(f"Done. Total latency: {latency_ms:.0f}ms")


if __name__ == "__main__":
    main()
