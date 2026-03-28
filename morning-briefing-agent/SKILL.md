# Morning Briefing Agent

**OpenClaw Skill Manifest**

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| Name             | Morning Briefing Agent         |
| Version          | 1.0.0                         |
| Platform         | Open Command (Magnetic AI)     |
| Runtime          | Python 3.10+                   |
| Schedule         | Daily cron at 06:30 local time |
| Delivery Channel | Linq (iMessage)                |
| Agent Identity   | \u03A3                              |

## Description

Deploys a daily morning briefing via iMessage through Linq. The briefing
synthesizes overnight lead activity, DealBuilder engagement, inventory status,
CRM pipeline, and web analytics into a prioritized summary with actionable
strategy suggestions. The buyer receives a reply-driven interface to approve
or dismiss suggested actions, or engage conversationally with \u03A3.

## Run Modes

| Mode        | Flag        | Behavior                                              |
|-------------|-------------|-------------------------------------------------------|
| Default     | *(none)*    | Collect \u2192 generate \u2192 format \u2192 deploy via Linq \u2192 log to \u03A3ribe |
| Preview     | `--preview` | Collect \u2192 generate \u2192 format \u2192 print to console (no deploy) |
| JSON        | `--json`    | Collect \u2192 generate \u2192 output structured JSON            |

## Invocation

```bash
# Default: deploy briefing
python morning_briefing_agent.py

# Preview: console only
python morning_briefing_agent.py --preview

# JSON output
python morning_briefing_agent.py --json
```

## Cron Configuration

```cron
30 6 * * * cd /path/to/morning-briefing-agent && python morning_briefing_agent.py >> /var/log/morning-briefing.log 2>&1
```

The `BRIEFING_DEPLOY_TIME` and `BRIEFING_TIMEZONE` environment variables control
the intended schedule. The cron entry should match these values.

## Data Sources

| Source       | Day 1 Status | Collector Function       |
|--------------|--------------|--------------------------|
| Leads        | Live         | `collect_leads()`        |
| DealBuilder  | Live         | `collect_dealbuilder()`  |
| Inventory    | Stubbed      | `collect_inventory()`    |
| CRM          | Stubbed      | `collect_crm()`         |
| Website      | Stubbed      | `collect_website()`      |
| Marketplace  | Stubbed      | `collect_marketplace()`  |

## Self-Checks

Ralph Loops run before every deploy to validate:
- At least one data source returned data
- Insight generation produced output
- Briefing text is well-formed and within character limits
- Linq credentials are present (in deploy mode)

## Audit Trail

Every deploy is logged to \u03A3ribe (`verified_scribe.jsonl`) with:
- Timestamp, recipient, delivery status
- Data sources consulted, insights generated
- Calibration metrics (latency, source availability)

## Brand Compliance

- Agent identity: \u03A3 (never "Sig", "Sigma", "the AI", "the bot")
- Sections: Overnight Changes, Today's Strategy
- Actions: Deploy (not "send"), Approve / Dismiss (not "Accept / Reject")
- Audit log: \u03A3ribe. Self-checks: Ralph Loops. Playbooks: Blueprints.
- Buyer-facing: "Powered by Magnetic AI"
