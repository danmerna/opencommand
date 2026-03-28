#!/bin/bash
# ============================================================================
# Σ Runtime — One-Command Server Setup
# ============================================================================
#
# Run on a fresh Ubuntu 24.04 VPS (Hetzner CX22, DigitalOcean, etc.):
#
#   curl -sSL https://raw.githubusercontent.com/danmerna/opencommand/claude/lead-response-agent-YHxGy/lead-response-agent/deploy/setup.sh | bash
#
# Or after cloning:
#
#   chmod +x deploy/setup.sh && sudo ./deploy/setup.sh
#
# Prerequisites:
#   - Ubuntu 24.04
#   - Root or sudo access
#   - Domain pointed at server IP (sigma.opencommand.co)
#
# What this installs:
#   - Python 3.12 + pip + venv
#   - nginx + certbot (SSL)
#   - Lead Response Agent (polling service)
#   - Webhook Server (Flask, port 5050)
#   - Morning Briefing cron (6:30 AM CT)
#   - Tailscale (optional, for admin access)
#
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config — edit these before running
# ---------------------------------------------------------------------------

DOMAIN="${DOMAIN:-sigma.opencommand.co}"
APP_USER="${APP_USER:-sig}"
APP_DIR="/home/${APP_USER}/lead-response-agent"
REPO_URL="https://github.com/danmerna/opencommand.git"
REPO_BRANCH="claude/lead-response-agent-YHxGy"
EMAIL_FOR_CERTBOT="${CERTBOT_EMAIL:-daniel@opencommand.co}"

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
log "App user: ${APP_USER}"

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------

log "Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    python3.12 python3.12-venv python3-pip \
    nginx certbot python3-certbot-nginx \
    git curl ufw jq

# ---------------------------------------------------------------------------
# 2. Create app user
# ---------------------------------------------------------------------------

if ! id "${APP_USER}" &>/dev/null; then
    log "Creating user: ${APP_USER}"
    useradd -m -s /bin/bash "${APP_USER}"
else
    log "User ${APP_USER} already exists"
fi

# ---------------------------------------------------------------------------
# 3. Clone repo and install dependencies
# ---------------------------------------------------------------------------

log "Cloning repository..."
if [ -d "${APP_DIR}" ]; then
    cd "${APP_DIR}" && git pull origin "${REPO_BRANCH}" || true
else
    sudo -u "${APP_USER}" git clone --branch "${REPO_BRANCH}" --single-branch \
        "${REPO_URL}" "/home/${APP_USER}/opencommand"
    ln -sf "/home/${APP_USER}/opencommand/lead-response-agent" "${APP_DIR}"
fi

log "Setting up Python virtual environment..."
sudo -u "${APP_USER}" python3.12 -m venv "/home/${APP_USER}/venv"
sudo -u "${APP_USER}" /home/${APP_USER}/venv/bin/pip install -q -r "${APP_DIR}/requirements.txt"

# ---------------------------------------------------------------------------
# 4. Environment file
# ---------------------------------------------------------------------------

ENV_FILE="/home/${APP_USER}/.env"
if [ ! -f "${ENV_FILE}" ]; then
    log "Creating .env from template..."
    cp "${APP_DIR}/.env.example" "${ENV_FILE}"
    chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    warn ">>> IMPORTANT: Edit ${ENV_FILE} with your API keys! <<<"
else
    log ".env already exists, skipping"
fi

# ---------------------------------------------------------------------------
# 5. Systemd — Lead Response Agent (polling)
# ---------------------------------------------------------------------------

log "Installing Lead Response Agent service..."
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
ExecStart=/home/${APP_USER}/venv/bin/python lead_response_agent.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sig-lead-response

[Install]
WantedBy=multi-user.target
UNIT

# ---------------------------------------------------------------------------
# 6. Systemd — Webhook Server
# ---------------------------------------------------------------------------

log "Installing Webhook Server service..."
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
ExecStart=/home/${APP_USER}/venv/bin/python webhook_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sig-webhook

[Install]
WantedBy=multi-user.target
UNIT

# ---------------------------------------------------------------------------
# 7. Cron — Morning Briefing (6:30 AM Central)
# ---------------------------------------------------------------------------

log "Setting up Morning Briefing cron..."
CRON_LINE="30 12 * * * /home/${APP_USER}/venv/bin/python ${APP_DIR}/lead_response_agent.py --once >> /home/${APP_USER}/briefing.log 2>&1"
(crontab -u "${APP_USER}" -l 2>/dev/null | grep -v "lead_response_agent"; echo "${CRON_LINE}") | crontab -u "${APP_USER}" -
# 12:30 UTC = 6:30 AM CT (CDT, UTC-6) / 7:30 AM CT (CST, UTC-5)

# ---------------------------------------------------------------------------
# 8. Nginx reverse proxy
# ---------------------------------------------------------------------------

log "Configuring nginx..."
cat > /etc/nginx/sites-available/sigma << 'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Webhook endpoint (Linq inbound)
    location /webhook/ {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host $host;
    }

    # Σribe audit trail
    location /scribe {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host $host;
    }

    # DealBuilder static pages
    location /deal/ {
        alias /home/APP_USER_PLACEHOLDER/dealbuilder_pages/;
        try_files $uri $uri.html =404;
    }

    location / {
        return 200 '{"status":"ok","agent":"sig","dealer":"Johnson Tractor"}';
        add_header Content-Type application/json;
    }
}
NGINX

# Replace placeholders
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/sites-available/sigma
sed -i "s/APP_USER_PLACEHOLDER/${APP_USER}/g" /etc/nginx/sites-available/sigma

ln -sf /etc/nginx/sites-available/sigma /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---------------------------------------------------------------------------
# 9. Firewall
# ---------------------------------------------------------------------------

log "Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# ---------------------------------------------------------------------------
# 10. SSL (Let's Encrypt)
# ---------------------------------------------------------------------------

log "Requesting SSL certificate..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL_FOR_CERTBOT}" || {
    warn "Certbot failed — make sure ${DOMAIN} DNS points to this server's IP."
    warn "Run manually later: certbot --nginx -d ${DOMAIN}"
}

# ---------------------------------------------------------------------------
# 11. Create DealBuilder output directory
# ---------------------------------------------------------------------------

sudo -u "${APP_USER}" mkdir -p "/home/${APP_USER}/dealbuilder_pages"

# ---------------------------------------------------------------------------
# 12. Enable and start services
# ---------------------------------------------------------------------------

log "Starting services..."
systemctl daemon-reload
systemctl enable sig-lead-response sig-webhook
systemctl start sig-webhook

# Don't start lead-response until .env is configured
if grep -q "LINQ_API_KEY=$" "${ENV_FILE}" 2>/dev/null; then
    warn "Lead Response Agent NOT started — edit ${ENV_FILE} first, then:"
    warn "  sudo systemctl start sig-lead-response"
else
    systemctl start sig-lead-response
    log "Lead Response Agent started"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

echo ""
echo "============================================"
echo -e "${GREEN}  Σ Runtime — Setup Complete${NC}"
echo "============================================"
echo ""
echo "  Domain:    https://${DOMAIN}"
echo "  Webhook:   https://${DOMAIN}/webhook/linq/johnsontractor"
echo "  Health:    https://${DOMAIN}/health"
echo "  Σribe:     https://${DOMAIN}/scribe"
echo ""
echo "  Services:"
echo "    sig-lead-response  — Gmail polling (30s heartbeat)"
echo "    sig-webhook        — Linq inbound messages (port 5050)"
echo ""
echo "  Logs:"
echo "    journalctl -u sig-lead-response -f"
echo "    journalctl -u sig-webhook -f"
echo ""
echo "  Next steps:"
echo "    1. Edit ${ENV_FILE} with your API keys"
echo "    2. Add Gmail credentials.json to ${APP_DIR}/"
echo "    3. Run: sudo systemctl start sig-lead-response"
echo "    4. Run first Gmail OAuth: sudo -u ${APP_USER} /home/${APP_USER}/venv/bin/python ${APP_DIR}/lead_response_agent.py --once"
echo "    5. Set Linq webhook URL to: https://${DOMAIN}/webhook/linq/johnsontractor"
echo ""
echo "  DNS records needed (Cloudflare):"
echo "    A    sigma    → $(curl -s ifconfig.me)"
echo ""
