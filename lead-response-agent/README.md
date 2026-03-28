# Lead Response Agent

Agent 2 for the Open Command platform. Watches Gmail for equipment leads from listing platforms, parses buyer information, generates interactive DealBuilder pages, and deploys iMessage responses via Linq with Twilio SMS fallback.

## Prerequisites

- Python 3.11+
- Gmail API credentials (OAuth2 client)
- Linq API key (for iMessage deployment)
- Twilio account (fallback SMS)
- OpenRouter API key (optional, for LLM-based email parsing)

## Installation

```bash
cd lead-response-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials. See `.env.example` for all variables with descriptions.

### Gmail API Setup

1. Create a project in the Google Cloud Console
2. Enable the Gmail API
3. Create OAuth 2.0 credentials (Desktop application)
4. Download the credentials JSON to `credentials/gmail_credentials.json`
5. On first run, the agent will open a browser for OAuth consent and save the token to `credentials/gmail_token.pickle`

## Run Modes

### Polling (default)

Checks Gmail every 60 seconds for new leads, processes them automatically.

```bash
python lead_response_agent.py
```

### Single Run (`--once`)

Process all pending leads, then exit. Useful for cron jobs or manual runs.

```bash
python lead_response_agent.py --once
```

### JSON Output (`--json`)

Process leads and print results as JSON to stdout. No messages are deployed. Useful for testing and integration.

```bash
python lead_response_agent.py --json
```

## Webhook Server

The webhook server receives inbound buyer replies from Linq.

```bash
python webhook_server.py
```

The server listens on the port configured in `WEBHOOK_PORT` (default 5000).

### Endpoints

- `POST /webhook/linq/<dealer_slug>` -- Inbound message webhook from Linq
- `GET /health` -- Health check

### Webhook Payload

```json
{
    "from": "+15551234567",
    "to": "+15559876543",
    "body": "Yes I am interested, what is the lowest price?",
    "timestamp": "2025-01-15T10:30:00Z",
    "message_id": "linq-abc123"
}
```

### Conversation Levels

- **L0-L1** (first/second reply): Logged to audit trail, salesperson alerted
- **L2+** (ongoing): Stub for conversational Blueprint (future)

## Architecture

```
Gmail Inbox
    |
    v
lead_response_agent.py  ──> email_parser.py
    |                           |
    |    TractorHouse parser <──+──> MachineryTrader parser
    |    Generic LLM parser  <──+
    |
    +──> DealBuilder HTML (Jinja2)
    |
    +──> Deploy via Linq ──> fallback Twilio
    |
    +──> Scribe audit (verified_scribe.jsonl)
    |
    +──> Ralph Loop self-check (pre-deployment validation)


webhook_server.py  (Flask, inbound Linq replies)
    |
    +──> Scribe audit
    +──> Salesperson alert
```

### Key Components

| File | Purpose |
|------|---------|
| `lead_response_agent.py` | Main agent: Gmail polling, pipeline orchestration, deployment |
| `email_parser.py` | Email parsing: TractorHouse, MachineryTrader, generic LLM fallback |
| `webhook_server.py` | Flask inbound webhook for Linq buyer replies |
| `dealbuilder_template.html` | Jinja2 template for interactive DealBuilder pages |
| `verified_scribe.jsonl` | Append-only audit log (every lead, deployment, and inbound message) |

### DealBuilder Pages

Each lead gets a unique DealBuilder page with:
- Equipment details (year, make, model, hours, stock number)
- Price or "Contact for Pricing"
- Up to 3 financing scenario cards (selectable)
- Buyer message echo
- Reply and call CTAs
- Salesperson contact card
- Dealership info
- Analytics tracking (page open, time on page, financing clicks)

Pages are generated to `DEALBUILDER_OUTPUT_DIR` and accessible at `{DEALBUILDER_BASE_URL}/{dealer_slug}/QT-{id}`.

### Audit Trail

Every action is logged to `verified_scribe.jsonl`:
- `lead_received` -- New lead parsed
- `lead_duplicate_skipped` -- Duplicate detected
- `parse_failed` -- Email could not be parsed
- `ralph_loop_failed` -- Pre-deployment self-check failed
- `message_deployed` -- Message successfully deployed
- `deployment_failed` -- Deployment failed
- `inbound_message` -- Buyer reply received
- `polling_error` -- Error during polling cycle
