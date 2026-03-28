# Cloudflare DNS Records — Copy-Paste Ready

Add all of these in Cloudflare DNS for `opencommand.co`.

## 1. Server (sigma.opencommand.co)

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| A | sigma | `<server-ip>` | DNS only | Auto |

## 2. Email Receiving (bot.opencommand.co)

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | bot | `route1.mx.cloudflare.net` | 10 |
| MX | bot | `route2.mx.cloudflare.net` | 20 |
| MX | bot | `route3.mx.cloudflare.net` | 30 |

Then in **Email → Email Routing**:
- Enable catch-all for `bot.opencommand.co`
- Forward to: `<your-gmail>@gmail.com`

## 3. Email Sending — SPF + DMARC

| Type | Name | Value |
|------|------|-------|
| TXT | bot | `v=spf1 include:amazonses.com ~all` |
| TXT | _dmarc.bot | `v=DMARC1; p=none; rua=mailto:daniel@opencommand.co` |

## 4. Email Sending — DKIM (from Resend)

After verifying `bot.opencommand.co` in Resend dashboard, they'll give you a CNAME:

| Type | Name | Value |
|------|------|-------|
| CNAME | `resend._domainkey.bot` | *(provided by Resend)* |

## Verification

```bash
# Check MX
dig MX bot.opencommand.co +short

# Check SPF
dig TXT bot.opencommand.co +short

# Check DMARC
dig TXT _dmarc.bot.opencommand.co +short

# Check server DNS
dig A sigma.opencommand.co +short
```
