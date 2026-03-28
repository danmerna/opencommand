# Σ Lead Response Agent — OpenClaw Skill

The Σ Lead Response Agent monitors a dealership's Gmail inbox for inbound lead
notification emails from equipment listing platforms (TractorHouse,
MachineryTrader), parses buyer contact details and equipment info using regex
with LLM fallback, generates a DealBuilder interactive quote page, and deploys
a personalized iMessage to the buyer via Linq API (with Twilio SMS fallback).

## Run Modes

| Mode         | Command                                  | Use Case                 |
|--------------|------------------------------------------|--------------------------|
| Polling loop | `python lead_response_agent.py`          | Standalone, runs forever |
| Single run   | `python lead_response_agent.py --once`   | OpenClaw heartbeat/cron  |
| JSON output  | `python lead_response_agent.py --json`   | Programmatic consumption |

**Heartbeat:** Every 30 seconds in polling mode. For OpenClaw trigger, run
`--once` on a 30-second cron.

## Required Environment Variables

```
LINQ_API_KEY           # Linq API token for iMessage/RCS/SMS
LINQ_SANDBOX_NUMBER    # Linq-assigned phone number
GMAIL_CREDENTIALS_FILE # Path to Google OAuth credentials.json
GMAIL_TOKEN_FILE       # Path to cached OAuth token
LLM_API_KEY            # API key for fallback email parsing (OpenRouter)
DEALER_NAME            # e.g. "Johnson Tractor"
DEALER_SLUG            # e.g. "johnsontractor"
SALESPERSON_NAME       # e.g. "Jake Mueller"
SALESPERSON_PHONE      # e.g. "+16125550147"
```

Optional:
```
TWILIO_SID             # Twilio fallback
TWILIO_AUTH_TOKEN      # Twilio fallback
TWILIO_FROM_NUMBER     # Twilio fallback
RESEND_API_KEY         # For email follow-ups
DEALBUILDER_BASE_URL   # Public URL base for generated pages
TRUST_LEVEL            # 0-3, controls autonomy (default: 1)
```

## Brand Terminology (Critical)

| Use                | Don't Use              |
|--------------------|------------------------|
| Σ or Sig           | Sigma, the AI          |
| DealBuilder        | quote form             |
| deploy             | send, execute          |
| Σribe              | audit trail            |
| Ralph Loops        | self-check loops       |
| Blueprints         | templates              |
| Approve / Dismiss  | Accept / Reject        |
| Overnight Changes  | alerts                 |
| Today's Strategy   | recommendations        |
| Powered by Magnetic AI | Open Command (buyer-facing) |

## Rate Limits (Linq)

- **New outbound conversations:** ~50/day/line (sandbox may be lower)
- **Ongoing conversations:** ~200 messages/day/line
- **Message throughput:** ~1 msg/second
- Sandbox has additional restrictions — verify limits in Linq dashboard

## Files

| File                      | Purpose                              |
|---------------------------|--------------------------------------|
| `lead_response_agent.py`  | Main agent — Gmail → parse → deploy  |
| `webhook_server.py`       | Inbound message handler (Flask)      |
| `dealbuilder_template.html` | Jinja2 HTML template (Blue Ace)    |
| `requirements.txt`        | Python dependencies                  |
| `.env.example`            | Environment variable template        |

## First-Run Auth (Gmail)

On first run, the agent opens a browser for Google OAuth consent. Authorize with
the Gmail account that receives lead emails. The token is cached in `token.json`
for subsequent runs. Re-auth is only needed if the token expires or scopes change.
