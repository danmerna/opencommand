# Morning Briefing Agent

Deploys a daily prioritised morning briefing via iMessage (Linq) for equipment dealers. The briefing synthesises overnight lead activity, DealBuilder engagement, and additional data sources into actionable insights signed by **\u03A3**.

Powered by Magnetic AI.

## Prerequisites

- Python 3.10+
- A Linq account with API access (for iMessage deployment)
- A `verified_scribe.jsonl` file with lead and DealBuilder event logs

## Setup

```bash
# Clone and enter the directory
cd morning-briefing-agent

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Linq credentials and dealer info
```

### Environment Variables

| Variable | Description |
|---|---|
| `LINQ_API_KEY` | Linq API key for iMessage deployment |
| `LINQ_SANDBOX_NUMBER` | Linq sender number |
| `BRIEFING_RECIPIENT_PHONE` | Recipient phone (E.164 format) |
| `BRIEFING_RECIPIENT_NAME` | Recipient first name (used in greeting) |
| `BRIEFING_DEPLOY_TIME` | Target deploy time, e.g. `06:30` |
| `BRIEFING_TIMEZONE` | IANA timezone, e.g. `America/Chicago` |
| `SCRIBE_LOG_FILE` | Path to the \u03A3ribe JSONL log file |
| `INVENTORY_SOURCE` | `stub` or `live` |
| `CRM_SOURCE` | `stub` or `live` |
| `WEBSITE_SOURCE` | `stub` or `live` |
| `MARKETPLACE_SOURCE` | `stub` or `live` |
| `DEALER_NAME` | Display name of the dealership |
| `DEALER_SLUG` | URL slug for the dealership |
| `DEALER_LOCATION` | City, State for the dealership |
| `AGING_THRESHOLD_DAYS` | Days on lot before an aging flag (default 45) |
| `LLM_API_KEY` | API key for LLM provider (conversational replies) |
| `LLM_BASE_URL` | LLM API base URL |
| `LLM_MODEL` | LLM model identifier |

## Run Modes

### Default: Deploy via Linq

```bash
python morning_briefing_agent.py
```

Collects data from all sources, generates insights, formats the briefing, runs Ralph Loop self-checks, deploys via Linq, and logs to \u03A3ribe.

### Preview: Console Only

```bash
python morning_briefing_agent.py --preview
```

Same pipeline but prints the briefing to the console. Does **not** deploy or log to \u03A3ribe.

### JSON: Structured Output

```bash
python morning_briefing_agent.py --json
```

Outputs the raw insight structure as JSON. Useful for integrations and debugging.

## Cron Setup (6:30 AM Daily)

```cron
30 6 * * * cd /path/to/morning-briefing-agent && /usr/bin/python3 morning_briefing_agent.py >> /var/log/morning-briefing.log 2>&1
```

Adjust the path and ensure the `.env` file is in the working directory. Set `BRIEFING_TIMEZONE` to match the cron server's timezone or the dealer's local timezone.

## Architecture

```
morning_briefing_agent.py    # Orchestrator: collect \u2192 insights \u2192 format \u2192 deploy \u2192 log
\u251c\u2500 data_collectors.py          # Modular data collection (live + stubbed sources)
\u251c\u2500 insight_generator.py        # Prioritisation engine (urgent/important/informational)
\u251c\u2500 sample_data/                # Sample data for stubbed collectors
\u2502  \u251c\u2500 inventory.json
\u2502  \u251c\u2500 crm.json
\u2502  \u251c\u2500 website.json
\u2502  \u2514\u2500 marketplace.json
\u251c\u2500 .env.example                # Environment variable template
\u251c\u2500 requirements.txt            # Python dependencies
\u2514\u2500 SKILL.md                    # OpenClaw skill manifest
```

### Data Flow

1. **Collect** \u2014 Each collector queries its source and returns a standardised dict with `source`, `status`, `data`, and `collected_at`.
2. **Analyse** \u2014 The insight generator applies severity rules and cross-source correlation to produce urgent, important, and informational items plus a strategy.
3. **Format** \u2014 The briefing formatter renders insights into the iMessage template with severity indicators and reply codes.
4. **Self-check** \u2014 Ralph Loops validate the briefing before deployment.
5. **Deploy** \u2014 The briefing is deployed via Linq as an iMessage.
6. **Log** \u2014 Deployment is recorded in \u03A3ribe. Calibration metrics are logged to `calibration_log.jsonl`.

### Severity Rules

| Level | Indicator | Triggers |
|---|---|---|
| Urgent | \U0001f534 | Lead no response >4hrs, DealBuilder opened 3x+ no follow-up, inventory discrepancy |
| Important | \U0001f7e1 | New leads overnight, equipment crossed aging threshold, DealBuilder engagement spike |
| Informational | \U0001f535 | Lead response stats, website traffic, listing views |

### Reply Handling

| Reply | Action |
|---|---|
| `1` | Approve the primary strategy action |
| `2` | Dismiss |
| *(any text)* | Conversational \u2014 forwarded to \u03A3 for a contextual response |

## Expanding Data Sources

To connect a new live data source:

1. **Implement the collector** in `data_collectors.py`. Follow the existing pattern: return `{"source": "...", "status": "live", "data": {...}, "collected_at": "..."}`.
2. **Add insight rules** in `insight_generator.py`. Add entries to the appropriate severity list based on the data.
3. **Update `.env`** \u2014 Change the corresponding `*_SOURCE` variable from `stub` to `live` and add any required API credentials.
4. **Test with `--preview`** before enabling deployment.

The stubbed collectors already define the interface and return sample data from `sample_data/`, so the expected data shape is documented by example.

## Brand Reference

| Term | Correct | Never |
|---|---|---|
| Agent identity | \u03A3 | "Sig", "Sigma", "the AI", "the bot" |
| Daily sections | Overnight Changes, Today's Strategy | "alerts", "recommendations" |
| Delivery | Deploy | "send" |
| User actions | Approve / Dismiss | "Accept / Reject" |
| Audit log | \u03A3ribe | - |
| Self-checks | Ralph Loops | - |
| Playbooks | Blueprints | - |
| Buyer-facing | Powered by Magnetic AI | "Open Command" |
