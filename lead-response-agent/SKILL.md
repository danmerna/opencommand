# OpenClaw Skill Manifest

## Name
Lead Response Agent

## Description
Watches Gmail for equipment leads from listing platforms (TractorHouse, MachineryTrader, website forms), parses buyer info, generates interactive DealBuilder pages, and deploys iMessage responses via Linq with Twilio fallback. Every action is logged to the Scribe audit trail with Ralph Loop self-checks before deployment.

## Run Modes

| Flag | Behavior |
|------|----------|
| *(default)* | Polling loop -- checks Gmail every 60 seconds for new unread leads |
| `--once` | Single run -- process any pending leads, then exit |
| `--json` | JSON output -- process leads and print results as JSON to stdout (no deployment) |

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `GMAIL_CREDENTIALS_PATH` | Path to Gmail OAuth2 credentials JSON |
| `GMAIL_TOKEN_PATH` | Path to Gmail token pickle file |
| `GMAIL_LABEL` | Gmail label to watch (default: `INBOX`) |
| `LINQ_API_KEY` | Linq API key for iMessage deployment |
| `LINQ_API_URL` | Linq API endpoint URL |
| `LINQ_FROM_NUMBER` | Sender phone number for Linq |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (fallback) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (fallback) |
| `TWILIO_FROM_NUMBER` | Twilio sender phone number (fallback) |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM fallback parsing |
| `DEALBUILDER_BASE_URL` | Base URL for hosted DealBuilder pages |
| `DEALBUILDER_OUTPUT_DIR` | Local directory for generated DealBuilder HTML |
| `DEALER_SLUG` | URL-safe dealer identifier |
| `DEALER_NAME` | Display name for the dealership |
| `DEALER_PHONE` | Dealership main phone number |
| `DEALER_LOCATION` | Dealership location string |
| `SALESPERSON_NAME` | Default salesperson name |
| `SALESPERSON_TITLE` | Default salesperson title |
| `SALESPERSON_PHONE` | Default salesperson direct phone |
| `WEBHOOK_PORT` | Port for inbound webhook server (default: `5000`) |
| `SCRIBE_LOG_PATH` | Path to verified_scribe.jsonl audit log |

## Dependencies

See `requirements.txt` for Python package requirements.

## Architecture

```
Gmail Inbox
    |
    v
lead_response_agent.py  (polling / --once / --json)
    |
    +---> email_parser.py  (TractorHouse / MachineryTrader / generic LLM)
    |
    +---> DealBuilder HTML  (Jinja2 from dealbuilder_template.html)
    |
    +---> Deploy via Linq --> fallback Twilio
    |
    +---> Scribe audit log  (verified_scribe.jsonl)

webhook_server.py  (Flask, inbound Linq replies)
    |
    +---> Scribe audit log
    +---> Salesperson alert
```
