#!/bin/bash
# ============================================================================
# Σ Runtime — One-Command Server Setup
# ============================================================================
#
# Run on Ubuntu 24.04 VPS:
#
#   git clone --branch claude/lead-response-agent-YHxGy --single-branch \
#     https://github.com/danmerna/opencommand.git /tmp/opencommand
#   chmod +x /tmp/opencommand/lead-response-agent/deploy/setup.sh
#   sudo DOMAIN=sigma.opencommand.co /tmp/opencommand/lead-response-agent/deploy/setup.sh
#
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DOMAIN="${DOMAIN:-sigma.opencommand.co}"
APP_USER="${APP_USER:-sig}"
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/lead-response-agent"
VENV_DIR="${APP_HOME}/venv"
ENV_FILE="${APP_HOME}/.env"
REPO_URL="https://github.com/danmerna/opencommand.git"
REPO_BRANCH="claude/lead-response-agent-YHxGy"
EMAIL_FOR_CERTBOT="${CERTBOT_EMAIL:-daniel@opencommand.co}"
SERVER_IP="$(curl -s --max-time 5 ifconfig.me || echo '<unknown>')"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[Σ]${NC} $1"; }
warn() { echo -e "${RED}[Σ]${NC} $1"; }
info() { echo -e "${CYAN}[Σ]${NC} $1"; }

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------

if [ "$EUID" -ne 0 ]; then
    warn "Please run as root: sudo ./setup.sh"
    exit 1
fi

log "Σ Runtime Setup — starting..."
log "Domain: ${DOMAIN}"
log "Server IP: ${SERVER_IP}"

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------

log "1/12 — Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    python3 python3-venv python3-pip \
    nginx certbot python3-certbot-nginx \
    git curl ufw jq

# Use python3 (whatever version is available on Ubuntu 24.04)
PYTHON=$(command -v python3)
log "Using Python: ${PYTHON} ($(${PYTHON} --version))"

# ---------------------------------------------------------------------------
# 2. Create app user
# ---------------------------------------------------------------------------

log "2/12 — Setting up user: ${APP_USER}..."
if ! id "${APP_USER}" &>/dev/null; then
    useradd -m -s /bin/bash "${APP_USER}"
    log "Created user: ${APP_USER}"
else
    log "User ${APP_USER} already exists"
fi

# ---------------------------------------------------------------------------
# 3. Clone repo and install dependencies
# ---------------------------------------------------------------------------

log "3/12 — Cloning repository..."
REPO_DIR="${APP_HOME}/opencommand"
if [ -d "${REPO_DIR}" ]; then
    cd "${REPO_DIR}"
    sudo -u "${APP_USER}" git fetch origin "${REPO_BRANCH}" 2>/dev/null || true
    sudo -u "${APP_USER}" git checkout "${REPO_BRANCH}" 2>/dev/null || true
    sudo -u "${APP_USER}" git pull origin "${REPO_BRANCH}" 2>/dev/null || true
    log "Updated existing repo"
else
    sudo -u "${APP_USER}" git clone --branch "${REPO_BRANCH}" --single-branch \
        "${REPO_URL}" "${REPO_DIR}"
    log "Cloned fresh"
fi

# Symlink lead-response-agent to home dir for convenience
ln -sfn "${REPO_DIR}/lead-response-agent" "${APP_DIR}"

log "4/12 — Installing Python dependencies..."
sudo -u "${APP_USER}" ${PYTHON} -m venv "${VENV_DIR}"
sudo -u "${APP_USER}" "${VENV_DIR}/bin/pip" install -q --upgrade pip
sudo -u "${APP_USER}" "${VENV_DIR}/bin/pip" install -q -r "${APP_DIR}/requirements.txt"

# ---------------------------------------------------------------------------
# 5. Write .env with all credentials baked in
# ---------------------------------------------------------------------------

log "5/12 — Writing .env..."
if [ -f "${ENV_FILE}" ]; then
    log ".env already exists, preserving"
else
    cp "${APP_DIR}/.env.example" "${ENV_FILE}"
    # Substitute known non-secret defaults
    sed -i "s|DEALBUILDER_BASE_URL=|DEALBUILDER_BASE_URL=https://${DOMAIN}|" "${ENV_FILE}"
    sed -i "s|DEALBUILDER_OUTPUT_DIR=./dealbuilder_pages|DEALBUILDER_OUTPUT_DIR=${APP_HOME}/dealbuilder_pages|" "${ENV_FILE}"
    sed -i "s|GMAIL_CREDENTIALS_FILE=credentials.json|GMAIL_CREDENTIALS_FILE=${APP_DIR}/credentials.json|" "${ENV_FILE}"
    sed -i "s|GMAIL_TOKEN_FILE=token.json|GMAIL_TOKEN_FILE=${APP_DIR}/token.json|" "${ENV_FILE}"
    chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    warn ">>> Edit ${ENV_FILE} and add your API keys (LINQ_API_KEY, RESEND_API_KEY, LLM_API_KEY) <<<"
fi

# ---------------------------------------------------------------------------
# 6. Write Gmail OAuth credentials.json
# ---------------------------------------------------------------------------

log "6/12 — Checking Gmail credentials.json..."
CREDS_FILE="${APP_DIR}/credentials.json"
if [ -f "${CREDS_FILE}" ]; then
    log "credentials.json found"
else
    warn "credentials.json NOT found at ${CREDS_FILE}"
    warn "Upload it: scp credentials.json root@<ip>:${CREDS_FILE}"
fi

# ---------------------------------------------------------------------------
# 7. Systemd — Lead Response Agent (polling)
# ---------------------------------------------------------------------------

log "7/12 — Installing systemd services..."
cat > /etc/systemd/system/sig-lead-response.service << UNIT
[Unit]
Description=Σ Lead Response Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/python lead_response_agent.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sig-lead-response

[Install]
WantedBy=multi-user.target
UNIT

# ---------------------------------------------------------------------------
# 8. Systemd — Webhook Server
# ---------------------------------------------------------------------------

cat > /etc/systemd/system/sig-webhook.service << UNIT
[Unit]
Description=Σ Webhook Server (Linq inbound messages)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/python webhook_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sig-webhook

[Install]
WantedBy=multi-user.target
UNIT

# ---------------------------------------------------------------------------
# 9. Cron — Morning Briefing (6:30 AM Central = 12:30 UTC)
# ---------------------------------------------------------------------------

log "8/12 — Setting up morning briefing cron..."
CRON_LINE="30 12 * * * ${VENV_DIR}/bin/python ${APP_DIR}/lead_response_agent.py --once >> ${APP_HOME}/briefing.log 2>&1"
(crontab -u "${APP_USER}" -l 2>/dev/null | grep -v "lead_response_agent"; echo "${CRON_LINE}") | crontab -u "${APP_USER}" -

# ---------------------------------------------------------------------------
# 10. Nginx reverse proxy
# ---------------------------------------------------------------------------

log "9/12 — Configuring nginx..."
cat > /etc/nginx/sites-available/sigma << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Webhook endpoint (Linq inbound)
    location /webhook/ {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host \$host;
    }

    # Σribe audit trail
    location /scribe {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host \$host;
    }

    # DealBuilder static pages
    location /deal/ {
        alias ${APP_HOME}/dealbuilder_pages/;
        try_files \$uri \$uri.html =404;
    }

    location / {
        return 200 '{"status":"ok","agent":"sig","dealer":"Johnson Tractor","server":"${DOMAIN}"}';
        add_header Content-Type application/json;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/sigma /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---------------------------------------------------------------------------
# 11. Firewall
# ---------------------------------------------------------------------------

log "10/12 — Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# ---------------------------------------------------------------------------
# 12. SSL (Let's Encrypt)
# ---------------------------------------------------------------------------

log "11/12 — Requesting SSL certificate..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL_FOR_CERTBOT}" || {
    warn "Certbot failed — make sure DNS A record points ${DOMAIN} → ${SERVER_IP}"
    warn "Run manually later: certbot --nginx -d ${DOMAIN}"
}

# ---------------------------------------------------------------------------
# 13. Create directories and start services
# ---------------------------------------------------------------------------

log "12/12 — Starting services..."
sudo -u "${APP_USER}" mkdir -p "${APP_HOME}/dealbuilder_pages"

systemctl daemon-reload
systemctl enable sig-lead-response sig-webhook
systemctl start sig-webhook

# Don't start lead-response until Gmail OAuth is done
warn "Lead Response Agent installed but NOT started (Gmail OAuth needed first)."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

echo ""
echo "============================================"
echo -e "${GREEN}  Σ Runtime — Setup Complete${NC}"
echo "============================================"
echo ""
echo "  Server:    ${SERVER_IP}"
echo "  Domain:    https://${DOMAIN}"
echo "  Webhook:   https://${DOMAIN}/webhook/linq/johnsontractor"
echo "  Health:    https://${DOMAIN}/health"
echo ""
echo "  Services installed:"
echo "    sig-webhook        ✅ running (port 5050)"
echo "    sig-lead-response  ⏸  waiting for Gmail OAuth"
echo ""
echo "  .env:             ${ENV_FILE}"
echo "  credentials.json: ${CREDS_FILE}"
echo ""
echo "  ── LAST STEP: Gmail OAuth ──"
echo ""
echo "  From your Mac, run:"
echo ""
echo "    ssh -i ~/.ssh/hetzner-openclaw -L 8080:localhost:8080 root@${SERVER_IP}"
echo "    sudo -u ${APP_USER} ${VENV_DIR}/bin/python ${APP_DIR}/lead_response_agent.py --once"
echo ""
echo "  Open the URL it prints in your browser, authorize with"
echo "  the Gmail that receives TractorHouse leads, then:"
echo ""
echo "    sudo systemctl start sig-lead-response"
echo ""
echo "  Sig is live. 🟢"
echo ""
