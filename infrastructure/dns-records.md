# DNS Records -- Open Command Infrastructure

All records are managed in **Cloudflare** under the `opencommand.co` zone.

> **Brand rule:** The AI assistant is referred to exclusively as **Σ** (the Greek letter).

---

## 1. Cloudflare Email Routing (`bot.opencommand.co`)

These MX records enable Cloudflare to receive email for the `bot` subdomain and forward it via catch-all rules.

| Type | Name | Content | Priority | Proxy |
|------|------|---------|----------|-------|
| MX | `bot` | `route1.mx.cloudflare.net` | 69 | N/A |
| MX | `bot` | `route2.mx.cloudflare.net` | 21 | N/A |
| MX | `bot` | `route3.mx.cloudflare.net` | 2 | N/A |

---

## 2. SPF Record (`bot.opencommand.co`)

Authorizes both Cloudflare (for forwarding verification) and Resend (for outbound sending).

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| TXT | `bot` | `v=spf1 include:_spf.mx.cloudflare.net include:send.resend.com ~all` | N/A |

**Explanation:**
- `include:_spf.mx.cloudflare.net` -- allows Cloudflare Email Routing.
- `include:send.resend.com` -- allows Resend to send on behalf of `bot.opencommand.co`.
- `~all` -- soft-fail everything else.

---

## 3. DKIM Record (Resend)

Resend provides the exact CNAME value during domain verification. The record below is a template -- replace the target with the value Resend gives you.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `resend._domainkey.bot` | *(provided by Resend during domain verification)* | DNS only |

Typical format:
```
resend._domainkey.bot.opencommand.co  CNAME  resend._domainkey.bot.opencommand.co.<region>.dkim.resend.dev
```

> **Important:** Set this record to **DNS only** (grey cloud), not proxied. DKIM CNAME records must not be proxied.

---

## 4. DMARC Record (`bot.opencommand.co`)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| TXT | `_dmarc.bot` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@opencommand.co; pct=100` | N/A |

**Explanation:**
- `p=quarantine` -- messages failing DMARC are quarantined (not rejected) during rollout. Upgrade to `p=reject` once everything is verified.
- `rua=mailto:dmarc@opencommand.co` -- aggregate reports are sent to this address.
- `pct=100` -- apply the policy to 100% of messages.

---

## 5. DealBuilder Subdomain (`deals.opencommand.co`)

Points the deals subdomain to the Cloudflare Pages deployment.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `deals` | `opencommand-deals.pages.dev` | Proxied |

> Replace `opencommand-deals` with the actual Cloudflare Pages project name if different.

---

## Summary -- All Records

```
; Cloudflare Email Routing
bot.opencommand.co.           MX   69  route1.mx.cloudflare.net.
bot.opencommand.co.           MX   21  route2.mx.cloudflare.net.
bot.opencommand.co.           MX    2  route3.mx.cloudflare.net.

; SPF (combined Cloudflare + Resend)
bot.opencommand.co.           TXT  "v=spf1 include:_spf.mx.cloudflare.net include:send.resend.com ~all"

; DKIM (Resend)
resend._domainkey.bot.opencommand.co.  CNAME  <value-from-resend>.dkim.resend.dev.

; DMARC
_dmarc.bot.opencommand.co.   TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@opencommand.co; pct=100"

; DealBuilder hosting
deals.opencommand.co.         CNAME  opencommand-deals.pages.dev.
```
