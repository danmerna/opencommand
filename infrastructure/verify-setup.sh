#!/usr/bin/env bash
# ============================================================
# Open Command -- Infrastructure Verification Script
# Agent 1: Infrastructure
#
# Tests DNS records, API connectivity, and local config files.
# The AI assistant is Σ (Greek letter). Never "Sig" or "Sigma".
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

PASS=0
FAIL=0
WARN=0

# ── Helpers ──────────────────────────────────────────────────

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

pass() { PASS=$((PASS + 1)); green "[PASS] $*"; }
fail() { FAIL=$((FAIL + 1)); red   "[FAIL] $*"; }
warn() { WARN=$((WARN + 1)); yellow "[WARN] $*"; }
info() { printf "       %s\n" "$*"; }

header() {
    echo ""
    bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    bold "  $*"
    bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ── Load .env if present ─────────────────────────────────────

if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    pass ".env file found and loaded"
else
    warn ".env file not found at $ENV_FILE -- using environment variables only"
    info "Copy .env.example to .env and fill in values."
fi

# ── 1. DNS Records ──────────────────────────────────────────

header "DNS Record Verification"

check_dns() {
    local description="$1"
    local record_type="$2"
    local name="$3"
    local expected="$4"

    if ! command -v dig &>/dev/null; then
        warn "dig not installed -- skipping DNS checks"
        return
    fi

    local result
    result=$(dig +short "$record_type" "$name" 2>/dev/null || true)

    if [[ -z "$result" ]]; then
        fail "$description: no $record_type record found for $name"
    elif echo "$result" | grep -qi "$expected"; then
        pass "$description"
        info "Found: $(echo "$result" | head -3)"
    else
        warn "$description: record exists but may not match expected value"
        info "Expected (contains): $expected"
        info "Got: $(echo "$result" | head -3)"
    fi
}

# MX records for Cloudflare Email Routing
check_dns "MX records for bot.opencommand.co" \
    MX "bot.opencommand.co" "cloudflare.net"

# SPF record
check_dns "SPF record for bot.opencommand.co" \
    TXT "bot.opencommand.co" "v=spf1"

# DMARC record
check_dns "DMARC record for bot.opencommand.co" \
    TXT "_dmarc.bot.opencommand.co" "v=DMARC1"

# DKIM record (Resend)
check_dns "DKIM CNAME for Resend" \
    CNAME "resend._domainkey.bot.opencommand.co" "dkim.resend.dev"

# DealBuilder CNAME
check_dns "DealBuilder CNAME (deals.opencommand.co)" \
    CNAME "deals.opencommand.co" "pages.dev"

# ── 2. Resend API ───────────────────────────────────────────

header "Resend API Connectivity"

if [[ -z "${RESEND_API_KEY:-}" || "$RESEND_API_KEY" == "re_xxxxx" ]]; then
    warn "RESEND_API_KEY not set or still placeholder -- skipping Resend test"
else
    resend_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "https://api.resend.com/domains" \
        -H "Authorization: Bearer ${RESEND_API_KEY}" \
        -H "Content-Type: application/json" \
        --max-time 10 2>/dev/null || echo "000")

    if [[ "$resend_response" == "200" ]]; then
        pass "Resend API key is valid (HTTP 200)"
    elif [[ "$resend_response" == "401" ]]; then
        fail "Resend API key is invalid (HTTP 401)"
    elif [[ "$resend_response" == "000" ]]; then
        fail "Resend API unreachable (network error or timeout)"
    else
        warn "Resend API returned unexpected status: HTTP $resend_response"
    fi
fi

# ── 3. Linq API ─────────────────────────────────────────────

header "Linq API Connectivity"

if [[ -z "${LINQ_API_KEY:-}" ]]; then
    warn "LINQ_API_KEY not set -- skipping Linq test"
else
    linq_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "https://api.linq.com/v1/account" \
        -H "Authorization: Bearer ${LINQ_API_KEY}" \
        -H "Content-Type: application/json" \
        --max-time 10 2>/dev/null || echo "000")

    if [[ "$linq_response" == "200" ]]; then
        pass "Linq API key is valid (HTTP 200)"
    elif [[ "$linq_response" == "401" || "$linq_response" == "403" ]]; then
        fail "Linq API key is invalid (HTTP $linq_response)"
    elif [[ "$linq_response" == "000" ]]; then
        fail "Linq API unreachable (network error or timeout)"
    else
        warn "Linq API returned unexpected status: HTTP $linq_response"
    fi

    if [[ -z "${LINQ_WEBHOOK_URL:-}" || "$LINQ_WEBHOOK_URL" == "https://your-server.com/webhook/linq/" ]]; then
        warn "LINQ_WEBHOOK_URL not configured (still placeholder)"
    else
        pass "LINQ_WEBHOOK_URL is set: ${LINQ_WEBHOOK_URL}"
    fi
fi

# ── 4. Gmail API Credentials ────────────────────────────────

header "Gmail API Credentials"

creds_file="${GMAIL_CREDENTIALS_FILE:-credentials.json}"
token_file="${GMAIL_TOKEN_FILE:-token.json}"

# Resolve relative paths against script dir
[[ "$creds_file" != /* ]] && creds_file="${SCRIPT_DIR}/${creds_file}"
[[ "$token_file" != /* ]] && token_file="${SCRIPT_DIR}/${token_file}"

if [[ -f "$creds_file" ]]; then
    pass "Gmail credentials file exists: $creds_file"
    # Check it looks like valid JSON
    if python3 -c "import json; json.load(open('$creds_file'))" 2>/dev/null; then
        pass "Gmail credentials file is valid JSON"
    else
        fail "Gmail credentials file is not valid JSON"
    fi
else
    fail "Gmail credentials file not found: $creds_file"
    info "Download from Google Cloud Console > APIs & Services > Credentials"
fi

if [[ -f "$token_file" ]]; then
    pass "Gmail token file exists: $token_file"
else
    warn "Gmail token file not found: $token_file"
    info "Run the OAuth flow to generate it (see README.md)"
fi

# ── 5. Environment Variables ────────────────────────────────

header "Environment Variable Check"

check_var() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    local placeholder="${2:-}"

    if [[ -z "$var_value" ]]; then
        fail "$var_name is not set"
    elif [[ -n "$placeholder" && "$var_value" == "$placeholder" ]]; then
        warn "$var_name is still set to placeholder value"
    else
        pass "$var_name is set"
    fi
}

check_var "EMAIL_DOMAIN"
check_var "EMAIL_FORWARD_TO"
check_var "RESEND_API_KEY" "re_xxxxx"
check_var "LINQ_API_KEY"
check_var "LINQ_API_SECRET"
check_var "LINQ_SANDBOX_NUMBER" "+1xxxxxxxxxx"
check_var "LINQ_WEBHOOK_URL" "https://your-server.com/webhook/linq/"
check_var "DEALBUILDER_BASE_URL"

# ── Summary ─────────────────────────────────────────────────

header "Summary"

echo ""
green "  Passed:   $PASS"
[[ $WARN -gt 0 ]] && yellow "  Warnings: $WARN"
[[ $FAIL -gt 0 ]] && red "  Failed:   $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
    red "Some checks failed. Review the output above and fix before proceeding."
    exit 1
elif [[ $WARN -gt 0 ]]; then
    yellow "All critical checks passed, but there are warnings to address."
    exit 0
else
    green "All checks passed. Infrastructure is ready for Σ."
    exit 0
fi
