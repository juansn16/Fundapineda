#!/usr/bin/env bash
# =============================================================================
# FundaPineda - instalacion en VPS Linux (Ubuntu)
#
# Requisitos:
#   - Ubuntu 22.04 o 24.04 y ejecutarse como root (o con sudo; el script
#     se re-ejecuta solo con sudo si hace falta).
#   - Git disponible y acceso al repo del proyecto (GIT_REPO_URL).
#
# Versiones objetivo:
#   Python 3.11 / Node.js 22 LTS / MariaDB (10.11 en Ubuntu 24.04, 10.6 en 22.04)
#   nginx 1.24+ (solo loopback, detras del tunnel) / LibreOffice 7.x (docx->pdf)
#   cloudflared 2025.x (tunel nombrado hacia Cloudflare; entrada publica)
#
# Idempotente: se puede re-ejecutar sin romper nada.
# Uso: sudo bash deploy/install.sh
# =============================================================================

set -euo pipefail

# --- Configuracion (editar si hace falta) -----------------------------------
DOMAIN="${DOMAIN:-fundapineda.org}"
APP_USER="${APP_USER:-fundapineda}"
APP_ROOT="${APP_ROOT:-/opt/fundapineda}"
WEB_ROOT="${WEB_ROOT:-/var/www/fundapineda}"
GIT_REPO_URL="${GIT_REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
PYTHON_MAJOR_MINOR="${PYTHON_MAJOR_MINOR:-3.11}"
NODE_MAJOR="${NODE_MAJOR:-22}"
PYTHON_BIN="python${PYTHON_MAJOR_MINOR}"

log()  { echo -e "\033[1;32m[install]\033[0m $*"; }
warn() { echo -e "\033[1;33m[aviso]\033[0m $*"; }
die()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

# --- Auto-sudo --------------------------------------------------------------
if [[ ${EUID} -ne 0 ]]; then
    log "No se ejecuta como root; reintentando con sudo..."
    exec sudo -H bash "$0" "$@"
fi

[[ -n "${GIT_REPO_URL}" ]] || die "Define GIT_REPO_URL (export GIT_REPO_URL=https://...)"

# --- 1. Paquetes base -------------------------------------------------------
log "Instalando paquetes base..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
    ca-certificates curl git gnupg software-properties-common lsb-release \
    nginx mariadb-server mariadb-client \
    build-essential libgomp1 python3-venv python3-pip rsync \
    libreoffice-writer fonts-dejavu-core \
    ufw

# --- 2. Python 3.11 (deadsnakes si el sistema no la trae) -------------------
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
    log "Instalando ${PYTHON_BIN} desde deadsnakes..."
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update
    apt-get install -y --no-install-recommends \
        "${PYTHON_BIN}" "${PYTHON_BIN}-venv" "${PYTHON_BIN}-dev"
fi
PYTHON_BIN="$(command -v "${PYTHON_BIN}" || echo "${PYTHON_BIN}")"
log "Python: ${PYTHON_BIN}"

# --- 3. Node.js 22 LTS (NodeSource) -----------------------------------------
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != "v22"* ]]; then
    log "Instalando Node.js ${NODE_MAJOR} LTS (NodeSource)..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
fi
log "Node: $(node -v) / npm: $(npm -v)"

# --- 4. Usuario y estructura del proyecto -----------------------------------
log "Preparando usuario y directorios..."
if ! id "${APP_USER}" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "${APP_USER}"
fi
mkdir -p "${APP_ROOT}" "${WEB_ROOT}"

if [[ ! -d "${APP_ROOT}/.git" ]]; then
    log "Clonando repo en ${APP_ROOT}..."
    git clone --branch "${GIT_BRANCH}" "${GIT_REPO_URL}" "${APP_ROOT}"
else
    log "Repo existente: actualizando (git pull)..."
    git -C "${APP_ROOT}" fetch --all
    git -C "${APP_ROOT}" checkout "${GIT_BRANCH}"
    git -C "${APP_ROOT}" pull --ff-only
fi

BACKEND_DIR="${APP_ROOT}/Api-FundaPineda"
FRONTEND_DIR="${APP_ROOT}/fron-fundapineda"
[[ -d "${BACKEND_DIR}" ]] || die "No se encontro ${BACKEND_DIR}"
[[ -d "${FRONTEND_DIR}" ]] || die "No se encontro ${FRONTEND_DIR}"

# Lazy: LibreOffice del servicio usa un HOME escribible
mkdir -p "/home/${APP_USER}/.config" && chown -R "${APP_USER}":"${APP_USER}" "/home/${APP_USER}"

# --- 5. Base de datos -------------------------------------------------------
log "Configurando MariaDB..."
systemctl enable --now mariadb >/dev/null 2>&1 || true

DB_NAME="fundapineda"
DB_USER="${DB_NAME}"
DB_PASSWORD="$(openssl rand -hex 20)"

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

HAS_TABLES="$(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'")"
if [[ "${HAS_TABLES}" -eq 0 ]]; then
    log "Importando esquema + seed (funda_pineda_db.sql)..."
    mysql -u root "${DB_NAME}" < "${BACKEND_DIR}/src/models/funda_pineda_db.sql"
    log "Aplicando indices de reportes (02_indices_reportes.sql)..."
    mysql -u root "${DB_NAME}" < "${BACKEND_DIR}/src/models/02_indices_reportes.sql"
else
    warn "La BD ya tiene ${HAS_TABLES} tablas; se omite la importacion del seed."
    warn "Recordar aplicar manualmente 02_indices_reportes.sql si no se hizo antes."
fi

# --- 6. .env del backend ----------------------------------------------------
ENV_FILE="${APP_ROOT}/.env"
if [[ -f "${ENV_FILE}" ]]; then
    log "${ENV_FILE} existente: se conserva (no se regenera)."
else
    log "Generando ${ENV_FILE} desde .env.example..."
    cp "${BACKEND_DIR}/.env.example" "${ENV_FILE}"

    # Si el ejemplo ya trae SECRET_KEY de relleno, lo reemplazamos por uno real
    SECRET_KEY="$(openssl rand -hex 32)"
    SET() { # $1 = clave  $2 = valor
        if grep -q "^${1}=" "${ENV_FILE}"; then
            sed -i "s|^${1}=.*|${1}=${2}|" "${ENV_FILE}"
        else
            echo "${1}=${2}" >> "${ENV_FILE}"
        fi
    }
    SET "SECRET_KEY" "${SECRET_KEY}"
    SET "DB_HOST" "localhost"
    SET "DB_PORT" "3306"
    SET "DB_NAME" "${DB_NAME}"
    SET "DB_USER" "${DB_USER}"
    SET "DB_PASSWORD" "${DB_PASSWORD}"
    SET "FRONTEND_URL" "https://${DOMAIN}"
    SET "CORS_ORIGINS" "https://${DOMAIN}"
    SET "TRUSTED_PROXIES" "127.0.0.1"

    warn "MAIL_* y CONTACT_NOTIFICATION_EMAIL quedan pendientes:"
    warn "  edita ${ENV_FILE} con los datos reales y reinicia el servicio."
fi
chown "${APP_USER}":"${APP_USER}" "${ENV_FILE}"

# --- 7. Entorno virtual del backend -----------------------------------------
log "Creando venv e instalando dependencias (${PYTHON_BIN})..."
su -s /bin/bash -c "cd '${BACKEND_DIR}' && [ -d env ] || ${PYTHON_BIN} -m venv env" "${APP_USER}"

# pywin32 es solo Windows; excluirlo en Linux o el pip falla
grep -v '^pywin32==' "${BACKEND_DIR}/requirements.txt" > "${APP_ROOT}/requirements-linux.txt"

su -s /bin/bash -c "cd '${BACKEND_DIR}' && env/bin/pip install --upgrade pip" "${APP_USER}"
su -s /bin/bash -c "cd '${BACKEND_DIR}' && env/bin/pip install -r '${APP_ROOT}/requirements-linux.txt'" "${APP_USER}"

mkdir -p "${BACKEND_DIR}/src/static"
chown -R "${APP_USER}":"${APP_USER}" "${BACKEND_DIR}/src/static"

# --- 8. Frontend (build + deploy a /var/www) --------------------------------
log "Compilando frontend (VITE_API_URL vacio = misma origin)..."
su -s /bin/bash -c "set -a; cd '${FRONTEND_DIR}' && npm ci && VITE_API_URL='' npm run build" "${APP_USER}"

log "Desplegando dist/ en ${WEB_ROOT}..."
rsync -a --delete "${FRONTEND_DIR}/dist/" "${WEB_ROOT}/" || {
    # rsync puede no estar; fallback a cp (borrando solo lo nuestro)
    rm -rf "${WEB_ROOT}"/*; cp -r "${FRONTEND_DIR}/dist/." "${WEB_ROOT}/"
}
chown -R root:root "${WEB_ROOT}"

# --- 9. nginx (interno, solo loopback) --------------------------------------
log "Configurando nginx (escucha solo en 127.0.0.1:8088)..."
if [[ "$(readlink -f /etc/nginx/sites-enabled/default 2>/dev/null || true)" == *default ]]; then
    rm -f /etc/nginx/sites-enabled/default
fi
cp "${APP_ROOT}/deploy/nginx_fundapineda.conf" /etc/nginx/sites-available/fundapineda
ln -sf /etc/nginx/sites-available/fundapineda /etc/nginx/sites-enabled/fundapineda
# Reemplazar server_name/fqdn de ejemplo por el dominio real
sed -i "s|fundapineda.org|${DOMAIN}|g" /etc/nginx/sites-available/fundapineda
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# --- 9b. cloudflared (tunel nombrado; entrada publica) -----------------------
log "cloudflared: verificando binario..."
if ! command -v cloudflared >/dev/null 2>&1; then
    log "Instalando cloudflared (repo oficial)..."
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
        | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
        > /etc/apt/sources.list.d/cloudflared.list
    apt-get update
    apt-get install -y cloudflared
else
    log "cloudflared ya instalado: $(cloudflared --version)"
fi

CF_CONFIG_DIR="/etc/cloudflared"
mkdir -p "${CF_CONFIG_DIR}"
if [[ ! -f "${CF_CONFIG_DIR}/config.yml" ]]; then
    log "Instalando plantilla de config en ${CF_CONFIG_DIR}/config.yml..."
    cp "${APP_ROOT}/deploy/cloudflared-config.yml" "${CF_CONFIG_DIR}/config.yml"
    chown root:root "${CF_CONFIG_DIR}/config.yml"
    chmod 644 "${CF_CONFIG_DIR}/config.yml"
    warn "EDITA ${CF_CONFIG_DIR}/config.yml con el UUID real del tunel."
else
    warn "Ya existe ${CF_CONFIG_DIR}/config.yml; no se toca."
fi

# --- 10. Servicio del backend -----------------------------------------------
log "Instalando servicio systemd fundapineda-backend..."
if ! grep -q "${APP_ROOT}" /etc/systemd/system/fundapineda-backend.service 2>/dev/null; then
    cp "${APP_ROOT}/deploy/fundapineda-backend.service" /etc/systemd/system/fundapineda-backend.service
    systemctl daemon-reload
fi
systemctl enable --now fundapineda-backend

# --- 11. Firewall -----------------------------------------------------------
# El trafico entra por el tunnel SALIENTE de cloudflared: no se abren 80/443.
log "Abriendo solo 22/tcp (SSH) en ufw..."
ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1
ufw --force enable

# --- 12. Verificacion -------------------------------------------------------
sleep 3
log "Health check del backend..."
HEALTH="$(curl -fsS -m 10 http://127.0.0.1:8000/health || true)"
log "Backend /health -> ${HEALTH:-NO RESPONDE}"

log "Resumen:"
log "  nginx interno:      http://127.0.0.1:8088 (SPA + API)"
log "  backend (uvicorn):  http://127.0.0.1:8000"
log "  .env del backend:   ${ENV_FILE}   (editar MAIL_* y CONTACT_NOTIFICATION_EMAIL)"
log "  Firmas/PDFs/noticias: ${BACKEND_DIR}/src/static/ (usuario ${APP_USER})"
log
log "Siguientes pasos (tunel cloudflared, una sola vez):"
log "  1) cloudflared tunnel login"
log "  2) cloudflared tunnel create fundapineda"
log "  3) cloudflared tunnel route dns fundapineda ${DOMAIN}"
log "     cloudflared tunnel route dns fundapineda www.${DOMAIN}"
log "  4) sudo cp ~/.cloudflared/<UUID>.json /etc/cloudflared/  (chmod 600)"
log "  5) Edita /etc/cloudflared/config.yml con el UUID real del tunel."
log "  6) sudo cloudflared service install && systemctl enable --now cloudflared"
log "  7) En el dashboard de Cloudflare: SSL/TLS -> modo 'Full (strict)'."
log "  8) Prueba: ${DOMAIN} (health check, login, adscripcion/PDF)."
log "  9) Backup: mysqldump + rsync de src/static (ver README)."