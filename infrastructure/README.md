# Open Command -- Infrastructure Setup Guide

**Agent 1: Infrastructure**
Covers DNS, email routing, messaging API, and hosting configuration for the Open Command platform.

> **Brand rule:** The AI assistant is referred to exclusively as **Σ** (the Greek letter). Never use "Sig", "Sigma", or any other spelling.

---

## Table of Contents

1. [Cloudflare Email Routing](#1-cloudflare-email-routing)
2. [Resend (Outbound Email)](#2-resend-outbound-email)
3. [Linq Messaging (iMessage / RCS / SMS)](#3-linq-messaging)
4. [DealBuilder Hosting](#4-dealbuilder-hosting)
5. [Gmail API Credentials](#5-gmail-api-credentials)
6. [Verification](#6-verification)

---

## 1. Cloudflare Email Routing

Cloudflare Email Routing provides free inbound email handling on `bot.opencommand.co`. All incoming mail is forwarded to a Gmail inbox where the Σ engine processes it.

### Steps

1. **Add the domain to Cloudflare**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Add `opencommand.co` (or ensure it already exists).
   - Confirm nameservers point to Cloudflare.

2. **Enable Email Routing**
   - Navigate to **Email > Email Routing** for the `opencommand.co` zone.
   - Click **Get started** if this is the first time.

3. **Add MX records for the subdomain**
   - Cloudflare Email Routing requires MX records on `bot.opencommand.co`. Add them under **DNS > Records**:

   | Type | Name | Content | Priority |
   |------|------|---------|----------|
   | MX | bot | `route1.mx.cloudflare.net` | 69 |
   | MX | bot | `route2.mx.cloudflare.net` | 21 |
   | MX | bot | `route3.mx.cloudflare.net` | 2 |
   | TXT | bot | `v=spf1 include:_spf.mx.cloudflare.net ~all` | -- |

4. **Create a catch-all rule**
   - Under **Email Routing > Routing rules**, enable the **Catch-all** toggle.
   - Set the action to **Forward to** and enter the Gmail address that Σ monitors (e.g., `sigma-inbox@opencommand.co` or your chosen Gmail).
   - Cloudflare will send a verification email to the destination address -- confirm it.

5. **Verify**
   - Send a test email to `anything@bot.opencommand.co`.
   - Confirm it arrives in the forwarding Gmail inbox.

---

## 2. Resend (Outbound Email)

[Resend](https://resend.com) handles all outbound email sent by Σ. It provides a simple API and handles DKIM signing.

### Steps

1. **Create a Resend account** at <https://resend.com/signup>.

2. **Add and verify the domain**
   - Go to **Domains > Add Domain**.
   - Enter `bot.opencommand.co`.
   - Resend will provide three DNS records to add (DKIM, SPF, DMARC). Add them in Cloudflare:

   | Type | Name | Content |
   |------|------|---------|
   | CNAME | `resend._domainkey.bot` | `resend._domainkey.bot.opencommand.co.<region>.dkim.resend.dev` |
   | TXT | `bot` | `v=spf1 include:send.resend.com ~all` |
   | TXT | `_dmarc.bot` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@opencommand.co` |

   > **Note:** Resend provides the exact DKIM CNAME value during domain verification. The value above is a template -- use the one Resend gives you.

3. **Generate an API key**
   - Go to **API Keys > Create API Key**.
   - Name it `opencommand-production` (or similar).
   - Copy the key (starts with `re_`) and add it to your `.env` file as `RESEND_API_KEY`.

4. **Test sending**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "sigma@bot.opencommand.co",
       "to": "test@example.com",
       "subject": "Σ Test",
       "text": "Outbound email from Σ is working."
     }'
   ```

---

## 3. Linq Messaging

[Linq](https://linq.com) provides iMessage, RCS, and SMS APIs that Σ uses for direct messaging outreach.

### Steps

1. **Sign up for a sandbox account**
   - Visit <https://linq.com> and request sandbox/developer access.
   - Complete any onboarding or verification requirements.

2. **Obtain API credentials**
   - From the Linq dashboard, navigate to **Settings > API Keys**.
   - Copy your `API Key` and `API Secret`.
   - Add them to `.env` as `LINQ_API_KEY` and `LINQ_API_SECRET`.

3. **Get a sandbox phone number**
   - Linq provides a sandbox number for testing.
   - Add it to `.env` as `LINQ_SANDBOX_NUMBER`.

4. **Configure webhooks**
   - Under **Settings > Webhooks**, add your inbound webhook URL.
   - Format: `https://your-server.com/webhook/linq/`
   - Enable events: `message.received`, `message.status`, `message.failed`.

5. **Understand rate limits**
   - **50** new outbound conversations per day per line.
   - **200** ongoing (reply) messages per day per line.
   - **1 message/second** throughput per line.
   - Σ must respect these limits. The orchestration layer should implement queuing and backoff.

6. **Test connectivity**
   ```bash
   curl -X GET https://api.linq.com/v1/account \
     -H "Authorization: Bearer $LINQ_API_KEY" \
     -H "Content-Type: application/json"
   ```

---

## 4. DealBuilder Hosting

DealBuilder pages are lightweight, per-deal landing pages. We recommend **Cloudflare Pages** for hosting.

### Steps

1. **Create a Cloudflare Pages project**
   - In Cloudflare Dashboard, go to **Workers & Pages > Create application > Pages**.
   - Connect to your Git repository (or use direct upload).
   - Name the project (e.g., `opencommand-deals`).

2. **Configure a custom domain**
   - Under the Pages project settings, go to **Custom domains**.
   - Add `deals.opencommand.co`.
   - Cloudflare will automatically add a CNAME record if the zone is on Cloudflare.
   - If not automatic, add manually:

   | Type | Name | Content |
   |------|------|---------|
   | CNAME | `deals` | `opencommand-deals.pages.dev` |

3. **URL structure**
   - Each deal page is served at: `https://deals.opencommand.co/deal/<deal-id>`
   - Σ generates and deploys these pages as part of the deal workflow.

4. **Build settings**
   - Framework: Static / Vite (depending on implementation).
   - Build command: `npm run build` (or as defined in the deal builder module).
   - Output directory: `dist/` or `build/`.

---

## 5. Gmail API Credentials

The Gmail API is used by Σ to read incoming emails from the forwarding inbox.

### Steps

1. **Create a Google Cloud project**
   - Go to <https://console.cloud.google.com/>.
   - Click **New Project** and name it `opencommand-sigma` (or similar).

2. **Enable the Gmail API**
   - Navigate to **APIs & Services > Library**.
   - Search for "Gmail API" and click **Enable**.

3. **Configure the OAuth consent screen**
   - Go to **APIs & Services > OAuth consent screen**.
   - Choose **External** (or **Internal** if using Google Workspace).
   - Fill in the app name (`Open Command Σ`), support email, and authorized domains.
   - Add the scope: `https://www.googleapis.com/auth/gmail.readonly` (minimum; add `gmail.send` if Σ also sends via Gmail).

4. **Create OAuth 2.0 credentials**
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Desktop app** (for initial token generation) or **Web application** (for production).
   - Download the credentials JSON file.
   - Save it as `credentials.json` in the infrastructure directory (do NOT commit this file).

5. **Generate the token**
   - Run the initial OAuth flow to generate `token.json`:
     ```bash
     # Using the Google API Python client as an example:
     python3 -c "
     from google_auth_oauthlib.flow import InstalledAppFlow
     flow = InstalledAppFlow.from_client_secrets_file(
         'credentials.json',
         scopes=['https://www.googleapis.com/auth/gmail.readonly']
     )
     creds = flow.run_local_server(port=0)
     with open('token.json', 'w') as f:
         f.write(creds.to_json())
     print('Token saved to token.json')
     "
     ```
   - This opens a browser for consent. After approval, `token.json` is created.
   - Add both file paths to `.env` as `GMAIL_CREDENTIALS_FILE` and `GMAIL_TOKEN_FILE`.

6. **Security notes**
   - Never commit `credentials.json` or `token.json` to version control.
   - Ensure `.gitignore` includes both files.
   - Rotate credentials periodically.

---

## 6. Verification

Run the verification script to confirm everything is configured:

```bash
chmod +x infrastructure/verify-setup.sh
./infrastructure/verify-setup.sh
```

See `verify-setup.sh` for details on what is checked.

---

## File Reference

| File | Purpose |
|------|---------|
| `.env.example` | Template for all environment variables |
| `dns-records.md` | Exact DNS records to create in Cloudflare |
| `verify-setup.sh` | Automated verification script |
| `credentials.json` | Gmail OAuth credentials (do NOT commit) |
| `token.json` | Gmail OAuth token (do NOT commit) |
