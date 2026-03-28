# Σ Lead Response Agent

AI agent that watches a dealership Gmail inbox for equipment leads, generates DealBuilder quote pages, and deploys iMessages to buyers via Linq API.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and fill env vars
cp .env.example .env

# First run — will open browser for Gmail OAuth
python lead_response_agent.py --once

# Polling mode (production)
python lead_response_agent.py

# Start webhook server (separate terminal)
python webhook_server.py
```

## Files

| File | What it does |
|------|-------------|
| `lead_response_agent.py` | Main agent. Reads Gmail, parses leads (regex + LLM), generates DealBuilder pages, deploys iMessages via Linq (Twilio fallback). |
| `webhook_server.py` | Flask server receiving inbound Linq messages. Routes by Trust Gradient: L0-L1 flags salesperson, L2+ stubs auto-response. |
| `dealbuilder_template.html` | Blue Ace design system HTML template. Mobile-first, financing calculator, tracking events. Rendered with Jinja2. |
| `SKILL.md` | OpenClaw skill definition — run modes, env vars, brand rules, rate limits. |
| `.env.example` | Template for all required environment variables. |

## Message Flow

```
TractorHouse email → Gmail inbox
  → Agent polls Gmail API (30s)
  → Regex parse (+ LLM fallback)
  → Generate DealBuilder HTML page
  → Deploy iMessage via Linq API
  → Buyer opens DealBuilder link
  → Buyer replies via iMessage
  → Linq webhook → webhook_server.py
  → Salesperson flagged (L0-L1)
```

## Testing

```bash
# Single run with JSON output
python lead_response_agent.py --json

# Test webhook locally
curl -X POST http://localhost:5050/webhook/linq/johnsontractor \
  -H "Content-Type: application/json" \
  -d '{"from": "+16125551234", "body": "Yes I am interested", "channel": "imessage"}'

# Check health
curl http://localhost:5050/health

# View audit trail
curl http://localhost:5050/scribe
```
