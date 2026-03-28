# Σ Runtime Deployment Guide

## Prerequisites

- Ubuntu 24.04 VPS (Hetzner CX22 recommended — $5/mo)
- Domain `sigma.opencommand.co` pointing at server IP
- API keys: Linq, OpenRouter, Resend (optional)
- Gmail OAuth `credentials.json` from Google Cloud Console

## Quick Start

### 1. Create Server

**Hetzner (recommended):**
1. Go to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Create server: CX22, Ubuntu 24.04, Ashburn or Falkenstein
3. Add your SSH key
4. Note the IP address

**Or any Ubuntu 24.04 VPS** — DigitalOcean, Vultr, Linode, etc.

### 2. Point DNS

In Cloudflare DNS for `opencommand.co`:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | sigma | `<server-ip>` | Off (DNS only) |

Wait for propagation (usually < 5 min with Cloudflare).

### 3. Run Setup Script

SSH into the server and run:

```bash
ssh root@<server-ip>

git clone --branch claude/lead-response-agent-YHxGy \
  https://github.com/danmerna/opencommand.git /tmp/opencommand

chmod +x /tmp/opencommand/lead-response-agent/deploy/setup.sh
sudo DOMAIN=sigma.opencommand.co /tmp/opencommand/lead-response-agent/deploy/setup.sh
```

This installs everything: Python, nginx, SSL, systemd services, cron.

### 4. Configure API Keys

```bash
sudo nano /home/sig/.env
```

Fill in:
```
LINQ_API_KEY=b575d723-d911-59e0-9c42-98c4f302b87d
LINQ_SANDBOX_NUMBER=+13213189777
LLM_API_KEY=<your-openrouter-key>
RESEND_API_KEY=<from-resend-dashboard>
DEALBUILDER_BASE_URL=https://sigma.opencommand.co
```

### 5. Add Gmail Credentials

```bash
# Copy credentials.json from your local machine
scp credentials.json root@<server-ip>:/home/sig/lead-response-agent/

# First-run OAuth (requires browser — use SSH tunnel)
ssh -L 8080:localhost:8080 root@<server-ip>
sudo -u sig /home/sig/venv/bin/python /home/sig/lead-response-agent/lead_response_agent.py --once
```

The first run opens a browser for Google OAuth. After authorizing, `token.json` is cached for future runs.

### 6. Start Everything

```bash
sudo systemctl start sig-lead-response
sudo systemctl status sig-lead-response sig-webhook
```

### 7. Verify

```bash
# Health check
curl https://sigma.opencommand.co/health

# Check logs
journalctl -u sig-lead-response -f
journalctl -u sig-webhook -f

# Test webhook
curl -X POST https://sigma.opencommand.co/webhook/linq/johnsontractor \
  -H "Content-Type: application/json" \
  -d '{"number": "+16125551234", "content": "Yes I am interested", "was_downgraded": false}'
```

### 8. Set Linq Webhook

In [Linq dashboard](https://dashboard.linqapp.com):
- Webhook URL: `https://sigma.opencommand.co/webhook/linq/johnsontractor`

---

## Architecture

```
Internet
  │
  ├── TractorHouse lead email → Gmail → sig-lead-response polls → parses → DealBuilder → Linq iMessage
  │
  ├── Buyer replies via iMessage → Linq webhook → nginx → sig-webhook (port 5050) → flag salesperson
  │
  └── 6:30 AM CT cron → lead_response_agent.py --once → morning check
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| `sig-lead-response` | — | Polls Gmail every 30s for new leads |
| `sig-webhook` | 5050 | Receives inbound Linq messages |
| nginx | 80/443 | Reverse proxy + SSL + DealBuilder static files |

## Maintenance

```bash
# View logs
journalctl -u sig-lead-response --since "1 hour ago"
journalctl -u sig-webhook --since "1 hour ago"

# Restart services
sudo systemctl restart sig-lead-response sig-webhook

# Update code
cd /home/sig/opencommand && git pull
sudo systemctl restart sig-lead-response sig-webhook

# View Σribe audit trail
curl https://sigma.opencommand.co/scribe | jq

# Check cron
crontab -u sig -l
```

## Costs

| Component | Monthly |
|-----------|---------|
| Hetzner CX22 | $5 |
| Linq sandbox | Free |
| Resend (free tier) | $0 |
| OpenRouter LLM | ~$15 |
| SSL (Let's Encrypt) | $0 |
| **Total** | **~$20** |
