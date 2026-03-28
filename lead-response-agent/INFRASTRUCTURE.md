# Infrastructure Setup Guide

Manual steps for Agent 1 (Infrastructure). Complete these in order.

---

## 1. Email Receiving — Cloudflare Email Routing

Go to **Cloudflare Dashboard → opencommand.co → Email → Email Routing**.

Add DNS records for `bot.opencommand.co`:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | bot | `route1.mx.cloudflare.net` | 10 |
| MX | bot | `route2.mx.cloudflare.net` | 20 |
| MX | bot | `route3.mx.cloudflare.net` | 30 |

Enable catch-all: Route `*@bot.opencommand.co` → forward to your Gmail inbox.

**Test:** Send an email to `test@bot.opencommand.co` and verify it arrives in Gmail.

---

## 2. Email Sending — Resend

1. Sign up at [resend.com](https://resend.com)
2. Add domain: `bot.opencommand.co`
3. Add DNS records Resend provides:

| Type | Name | Value |
|------|------|-------|
| CNAME | (Resend provides) | (Resend provides — DKIM) |
| TXT | bot | `v=spf1 include:amazonses.com ~all` |
| TXT | _dmarc.bot | `v=DMARC1; p=none; rua=mailto:daniel@opencommand.co` |

4. Verify domain in Resend dashboard
5. Copy API key → `RESEND_API_KEY`

**Test:** Send from `sig-test@bot.opencommand.co` to your personal email. Verify not in spam.

---

## 3. Messaging — Linq

Already set up (sandbox):

| Item | Value |
|------|-------|
| API Token | `b575d723-d911-59e0-9c42-98c4f302b87d` |
| Sandbox Number | `+1 (321) 318-9777` |
| Dashboard | `dashboard.linqapp.com` |

### Webhook Setup

Set inbound webhook URL in Linq dashboard:
```
https://[your-server]/webhook/linq/johnsontractor
```

For testing, use [webhook.site](https://webhook.site) to verify inbound messages arrive.

### Rate Limits (verify in dashboard)

| Limit | Value |
|-------|-------|
| New outbound conversations | ~50/day/line |
| Ongoing conversations | ~200/day/line |
| Throughput | ~1 msg/sec |

---

## 4. DealBuilder Hosting

**Recommended: Cloudflare Pages** (keeps everything in Cloudflare ecosystem).

1. Create a GitHub repo: `opencommand-dealbuilder`
2. Connect to Cloudflare Pages
3. Set build output directory to `/` (static HTML)
4. Custom domain: `deals.opencommand.co`

URL pattern: `https://deals.opencommand.co/deal/johnsontractor/QT-00847.html`

Deploy method: `git push` to the repo auto-deploys.

---

## 5. Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project: "Open Command"
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials → Desktop application
5. Download `credentials.json`
6. Place in `lead-response-agent/` directory

First run opens browser → authorize with the Gmail account that receives leads → token cached in `token.json`.

---

## Final Config

Once all steps are complete, create `.env` from `.env.example`:

```bash
# Linq
LINQ_API_KEY=b575d723-d911-59e0-9c42-98c4f302b87d
LINQ_SANDBOX_NUMBER=+13213189777

# Resend (fill after setup)
RESEND_API_KEY=re_xxxxx
RESEND_DOMAIN=bot.opencommand.co

# Gmail
GMAIL_CREDENTIALS_FILE=credentials.json
GMAIL_TOKEN_FILE=token.json

# LLM (fill with your OpenRouter key)
LLM_API_KEY=
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=anthropic/claude-3.5-haiku

# DealBuilder (fill after Cloudflare Pages setup)
DEALBUILDER_BASE_URL=https://deals.opencommand.co
DEALBUILDER_OUTPUT_DIR=./dealbuilder_pages

# Dealer
DEALER_NAME=Johnson Tractor
DEALER_SLUG=johnsontractor
DEALER_LOCATION=St. Cloud, MN
SALESPERSON_NAME=Jake Mueller
SALESPERSON_PHONE=+16125550147
```
