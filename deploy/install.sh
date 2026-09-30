#!/usr/bin/env bash
# =============================================================================
# FundaPineda - instalacion en VPS Linux (Ubuntu y Debian, incluidos derivados)
#
# Requisitos:
#   - Ubuntu 22.04/24.04 LTS, Debian 11/12/13 o derivado compatible con Debian
#     (p. ej. Canaima). Ejecutar como root (o con sudo; si falta sudo, root).
#   - Git disponible y acceso al repo del proyecto (GIT_REPO_URL).
#
# Versiones objetivo:
#   Python 3.11 (Ubuntu: deadsnakes; Debian 12: repo oficial; si no hay 3.11 se
#     usa el python3 del sistema con aviso) / Node.js 22 LTS / MariaDB 10.6-11
#   nginx (solo loopback, detras del tunnel) / LibreOffice 7.x (docx->pdf)
#   cloudflared (tunel nombrado hacia Cloudflare; entrada publica)
#
# Idempotente y respetuoso: si un paquete/servicio/binario ya esta instalado,
# se detecta y se omite (no se reinstala ni se sobrescribe).
#
# Uso: sudo bash deploy/install.sh
#   Variables opcionales:
#     GIT_REPO_URL=... GIT_BRANCH=main DOMAIN=fundapineda.org
#     PYTHON_MAJOR_MINOR=3.11 NODE_MAJOR=22
#     RESET_DB=1   (dropea y reimporta la base; usar si el esquema esta corrupto)
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
RESET_DB="${RESET_DB:-0}"
PYTHON_BIN="python${PYTHON_MAJOR_MINOR}"
DB_NAME="fundapineda"

log()  { echo -e "\033[1;32m[install]\033[0m $*"; }
warn() { echo -e "\033[1;33m[aviso]\033[0m $*"; }
die()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

# --- Auto-sudo --------------------------------------------------------------
if [[ ${EUID} -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
        log "No se ejecuta como root; reintentando con sudo..."
        exec sudo -H bash "$0" "$@"
    fi
    die "Ejecuta como root (este sistema no tiene sudo instalado)."
fi

[[ -n "${GIT_REPO_URL}" ]] || die "Define GIT_REPO_URL (export GIT_REPO_URL=https://...)"

# --- 0. Deteccion del sistema operativo -------------------------------------
OS_ID=""; OS_LIKE=""; OS_CODENAME=""
if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_ID="${ID:-}"
    OS_LIKE="${ID_LIKE:-}"
    OS_CODENAME="${VERSION_CODENAME:-}"
fi
if command -v lsb_release >/dev/null 2>&1; then
    [[ -n "${OS_ID}" ]] || OS_ID="$(lsb_release -si 2>/dev/null | tr '[:upper:]' '[:lower:]' || true)"
    [[ -n "${OS_CODENAME}" ]] || OS_CODENAME="$(lsb_release -cs 2>/dev/null || true)"
fi

case "${OS_ID} ${OS_LIKE}" in
    *ubuntu*)               OS_FAMILY="ubuntu" ;;
    *debian*|*canaima*)     OS_FAMILY="debian" ;;
    *)
        OS_FAMILY="debian"
        warn "SO no reconocido (ID='${OS_ID:-?}'); se asume familia Debian."
        ;;
esac
log "SO detectado: ${OS_ID:-desconocido} (${OS_CODENAME:-sin codename}) -> familia ${OS_FAMILY}"

# --- Helpers de paquetes ----------------------------------------------------
has_cmd()       { command -v "$1" >/dev/null 2>&1; }
pkg_installed() { dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"; }

# Instala SOLO los paquetes ausentes; informa que respeta los ya presentes.
apt_ensure() {
    local p missing=() present=()
    for p in "$@"; do
        if pkg_installed "${p}"; then present+=("${p}"); else missing+=("${p}"); fi
    done
    if [[ ${#present[@]} -gt 0 ]]; then
        log "ya presente: ${present[*]}"
    fi
    if [[ ${#missing[@]} -gt 0 ]]; then
        log "instalando: ${missing[*]}"
        apt-get install -y --no-install-recommends "${missing[@]}"
    else
        log "nada por instalar en este grupo."
    fi
}

# Instala paquetes que pueden no existir en el repo (no aborta si fallan).
apt_ensure_optional() {
    local p
    for p in "$@"; do
        if pkg_installed "${p}"; then
            log "ya presente: ${p}"
        elif apt-get install -y --no-install-recommends "${p}" >/dev/null 2>&1; then
            log "instalado (opcional): ${p}"
        else
            warn "no se pudo instalar '${p}' (opcional); se continua."
        fi
    done
}

export DEBIAN_FRONTEND=noninteractive

# Limpiar un cloudflared.list malformado de intentos previos (p. ej. con la
# clave .gpg puesta como si fuera la URL del repo); rompe 'apt-get update'.
CF_LIST="/etc/apt/sources.list.d/cloudflared.list"
if [[ -f "${CF_LIST}" ]] \
   && { ! grep -q "signed-by=" "${CF_LIST}" \
        || ! grep -Eq '/cloudflared (bookworm|bullseye|buster|jammy|noble|focal) main' "${CF_LIST}"; }; then
    warn "Eliminando ${CF_LIST} (malformado o codename no soportado) de un intento previo."
    rm -f "${CF_LIST}"
fi

log "Actualizando indices de apt..."
apt-get update

# --- 1. Paquetes base -------------------------------------------------------
log "Verificando paquetes base..."
apt_ensure ca-certificates curl git gnupg
# software-properties-common (para add-apt-repository/PPAs) solo tiene sentido
# en Ubuntu; en Debian no existe o no es necesario.
if [[ "${OS_FAMILY}" == "ubuntu" ]]; then
    apt_ensure software-properties-common
fi
apt_ensure_optional lsb-release

log "Verificando paquetes de servicios..."
apt_ensure nginx mariadb-server mariadb-client build-essential libgomp1 \
    python3-venv python3-pip rsync ufw

log "Verificando paquetes de conversion a PDF (LibreOffice)..."
apt_ensure libreoffice-writer fonts-dejavu-core

# Comando de cliente MySQL/MariaDB (el nombre varia segun el paquete)
MYSQL_CMD="$(command -v mariadb || command -v mysql || echo mysql)"

# --- 2. Python 3.11 ---------------------------------------------------------
log "Resolviendo Python ${PYTHON_MAJOR_MINOR}..."
if has_cmd "${PYTHON_BIN}"; then
    log "${PYTHON_BIN} ya presente: $("${PYTHON_BIN}" --version 2>&1)"
elif [[ "${OS_FAMILY}" == "ubuntu" ]]; then
    has_cmd add-apt-repository || apt_ensure software-properties-common
    log "Anadiendo PPA deadsnakes (solo Ubuntu)..."
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update
    apt_ensure "${PYTHON_BIN}" "${PYTHON_BIN}-venv" "${PYTHON_BIN}-dev"
else
    # Debian 12 trae python3.11 en el repo oficial; otros derivados pueden no tenerlo.
    log "Buscando ${PYTHON_BIN} en los repos de Debian..."
    apt_ensure_optional "${PYTHON_BIN}" "${PYTHON_BIN}-venv" "${PYTHON_BIN}-dev"
fi

# Resolver ruta absoluta o caer al python3 del sistema (>=3.10) con aviso.
if has_cmd "${PYTHON_BIN}"; then
    PYTHON_BIN="$(command -v "${PYTHON_BIN}")"
else
    SYS_PY="$(command -v python3 || true)"
    [[ -n "${SYS_PY}" ]] || die "No se encontro python3. Instala Python 3.11+ y reejecuta."
    if "${SYS_PY}" -c 'import sys; sys.exit(0 if sys.version_info[:2] >= (3,10) else 1)'; then
        warn "No hay ${PYTHON_MAJOR_MINOR}; se usara ${SYS_PY} ($("${SYS_PY}" -V 2>&1))."
        warn "Algun wheel de numba/onnxruntime podria no existir para esa version."
        PYTHON_BIN="${SYS_PY}"
    else
        die "$("${SYS_PY}" -V 2>&1) es menor que 3.10; instala Python 3.11+ y reejecuta."
    fi
fi
log "Python: ${PYTHON_BIN} ($("${PYTHON_BIN}" -V 2>&1))"

# Asegurar el modulo venv del interprete elegido.
if ! "${PYTHON_BIN}" -m venv --help >/dev/null 2>&1; then
    PY_TAG="$("${PYTHON_BIN}" -c 'import sys;print("python%d.%d"%sys.version_info[:2])')"
    warn "Falta el modulo venv; intentando instalar '${PY_TAG}-venv'..."
    apt_ensure_optional "${PY_TAG}-venv" python3-venv
fi

# --- 3. Node.js 22 LTS (NodeSource) -----------------------------------------
# Considera valido un Node existente si Vite 8 lo acepta (>=22 o 20.19+).
node_ok() {
    has_cmd node || return 1
    local v major minor
    v="$(node -v)"; v="${v#v}"; major="${v%%.*}"; minor="${v#*.}"; minor="${minor%%.*}"
    [[ "${major:-0}" -ge 22 ]] && return 0
    [[ "${major:-0}" -eq 20 && "${minor:-0}" -ge 19 ]] && return 0
    return 1
}

if has_cmd node && [[ "$(node -v)" == "v${NODE_MAJOR}".* ]]; then
    log "Node.js ya presente: $(node -v)"
else
    if has_cmd node; then
        warn "Node $(node -v) distinto de v${NODE_MAJOR}; se intenta reemplazar via NodeSource."
    fi
    log "Instalando Node.js ${NODE_MAJOR} LTS (NodeSource)..."
    if curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - && apt-get install -y nodejs; then
        log "Node instalado: $(node -v)"
    elif node_ok; then
        warn "No se pudo instalar via NodeSource; se conserva el Node existente $(node -v) (compatible con Vite)."
    else
        die "No se pudo instalar Node.js ${NODE_MAJOR} y no hay una version compatible. Instala Node 22+ manualmente y reejecuta."
    fi
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
if systemctl list-unit-files 2>/dev/null | grep -q '^mariadb\.service'; then
    systemctl enable --now mariadb >/dev/null 2>&1 || true
elif systemctl list-unit-files 2>/dev/null | grep -q '^mysql\.service'; then
    warn "No hay unidad mariadb.service; usando mysql.service."
    systemctl enable --now mysql >/dev/null 2>&1 || true
else
    warn "No se encontro unidad mariadb/mysql; se asume el servidor ya corriendo."
fi

DB_USER="${DB_NAME}"
DB_PASSWORD="$(openssl rand -hex 20)"

"${MYSQL_CMD}" -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

if [[ "${RESET_DB}" -eq 1 ]]; then
    warn "RESET_DB=1: eliminando y recreando la base '${DB_NAME}'..."
    "${MYSQL_CMD}" -u root -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"
fi

SEED_FRESH=0
HAS_TABLES="$("${MYSQL_CMD}" -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'")"
if [[ "${HAS_TABLES}" -eq 0 ]]; then
    log "Importando esquema + seed (funda_pineda_db.sql)..."
    "${MYSQL_CMD}" -u root "${DB_NAME}" < "${BACKEND_DIR}/src/models/funda_pineda_db.sql"
    log "Aplicando indices de reportes (02_indices_reportes.sql)..."
    "${MYSQL_CMD}" -u root "${DB_NAME}" < "${BACKEND_DIR}/src/models/02_indices_reportes.sql"
    SEED_FRESH=1
else
    # La BD ya existe: verificar que el esquema sea el actual antes de continuar.
    HAS_VERIF="$("${MYSQL_CMD}" -u root -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='usuarios' AND column_name='verificado'")"
    HAS_VC="$("${MYSQL_CMD}" -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='verification_codes'")"
    if [[ "${HAS_VERIF}" -eq 1 && "${HAS_VC}" -eq 1 ]]; then
        warn "La BD ya tiene ${HAS_TABLES} tablas con esquema actual; se omite el seed."
        warn "Recordar aplicar manualmente 02_indices_reportes.sql si no se hizo antes."
    else
        warn "La BD '${DB_NAME}' existe pero su esquema esta desactualizado o incompleto"
        warn "(no se encontro usuarios.verificado o verification_codes)."
        die "Borrala o reejecuta con RESET_DB=1 para recrearla. Comando: ${MYSQL_CMD} -u root -e \"DROP DATABASE ${DB_NAME}\""
    fi
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

# --- 7b. Credencial temporal del administrador ------------------------------
# El seed trae un hash de relleno; en una instalacion nueva lo reemplazamos por
# una contrasena aleatoria unica y la mostramos UNA sola vez. Cambiarla tras el
# primer login (o usar /auth/forgot-password una vez configurado el SMTP).
if [[ "${SEED_FRESH}" -eq 1 ]]; then
    ADMIN_EMAIL="admin@fundapineda.org"
    ADMIN_PASSWORD="$(openssl rand -hex 12)"
    ADMIN_HASH="$("${BACKEND_DIR}/env/bin/python" -c \
        'import bcrypt,sys;print(bcrypt.hashpw(sys.argv[1].encode()[:72],bcrypt.gensalt(12)).decode())' \
        "${ADMIN_PASSWORD}")"
    "${MYSQL_CMD}" -u root "${DB_NAME}" <<SQL
UPDATE \`usuarios\` SET \`password_hash\`='${ADMIN_HASH}', \`activo\`=1, \`verificado\`=1 WHERE \`email\`='${ADMIN_EMAIL}';
SQL
    echo
    warn "=== CREDENCIAL INICIAL DEL ADMINISTRADOR (guardar y cambiar tras el primer login) ==="
    warn "  Usuario:  ${ADMIN_EMAIL}"
    warn "  Password: ${ADMIN_PASSWORD}"
    warn "===================================================================================="
    echo
fi

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
has_cmd nginx || apt_ensure nginx
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
CF_BIN=""
for p in "$(command -v cloudflared 2>/dev/null || true)" \
         /usr/local/bin/cloudflared /usr/bin/cloudflared /usr/local/sbin/cloudflared; do
    if [[ -n "${p}" && -x "${p}" ]]; then CF_BIN="${p}"; break; fi
done

if [[ -n "${CF_BIN}" ]]; then
    log "cloudflared ya instalado: $("${CF_BIN}" --version 2>/dev/null || echo "${CF_BIN}")"
else
    log "cloudflared no encontrado; intentando instalar desde el repo oficial..."
    CF_CODENAME="${OS_CODENAME}"
    case "${CF_CODENAME}" in
        bookworm|bullseye|buster|jammy|noble|focal) ;;
        *) warn "codename '${CF_CODENAME:-?}' no soportado por el repo de Cloudflare; usando 'bookworm'."; CF_CODENAME="bookworm" ;;
    esac
    mkdir -p --mode=0755 /usr/share/keyrings
    # No fatal: el tunel se configura manualmente igual; si el repo falla, avisamos.
    if curl -fsSL "https://pkg.cloudflare.com/cloudflare-main.gpg" -o /tmp/cloudflare-main.gpg \
       && gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg /tmp/cloudflare-main.gpg; then
        echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared ${CF_CODENAME} main" \
            > /etc/apt/sources.list.d/cloudflared.list
        if apt-get update && apt-get install -y cloudflared; then
            rm -f /tmp/cloudflare-main.gpg
            log "cloudflared instalado: $(cloudflared --version 2>/dev/null || echo ok)"
        else
            rm -f /tmp/cloudflare-main.gpg /etc/apt/sources.list.d/cloudflared.list
            warn "No se pudo instalar cloudflared desde el repo (codename '${CF_CODENAME}')."
            warn "Instalalo manualmente y continua: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
        fi
    else
        rm -f /tmp/cloudflare-main.gpg
        warn "No se pudo obtener la clave de Cloudflare; instala cloudflared manualmente."
    fi
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
if has_cmd ufw; then
    log "Abriendo solo 22/tcp (SSH) en ufw..."
    ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1
    ufw --force enable
else
    warn "ufw no esta disponible; revisa el firewall manualmente (solo 22/tcp)."
fi

# --- 12. Verificacion -------------------------------------------------------
sleep 3
log "Health check del backend..."
HEALTH="$(curl -fsS -m 10 http://127.0.0.1:8000/health || true)"
log "Backend /health -> ${HEALTH:-NO RESPONDE}"

log "Resumen:"
log "  SO/familia:         ${OS_ID:-?} (${OS_FAMILY})"
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
