#!/usr/bin/env bash
# =============================================================================
# FundaPineda - salud del sitio en produccion
#
# Smoke test: nginx responde -> backend /health -> login admin (si se dan
# credenciales) -> preview de reportes (requiere ser admin).
#
# Uso:
#   ./check_health.sh
#   ADMIN_EMAIL=admin@fundapineda.org ADMIN_PASSWORD=... ./check_health.sh
# =============================================================================

set -euo pipefail

BASE="${BASE:-https://fundapineda.org}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

ok()   { echo -e "\033[1;32m[ok]\033[0m   $*"; }
fail() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

# 1) SPA
CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 15 "${BASE}/")"
[[ "${CODE}" =~ ^(200|301|302)$ ]] || { fail "SPA / -> HTTP ${CODE}"; exit 1; }
ok "SPA index -> HTTP ${CODE}"

# 2) Backend a traves de nginx
HEALTH="$(curl -fsS -m 15 "${BASE}/health" || true)"
echo "${HEALTH}" | grep -q '"database":"up"' || { fail "/health -> ${HEALTH:-sin respuesta}"; exit 1; }
ok "/health -> BD arriba"

# 3) Adscripcion publica (requiere auth: esperar 401; no 502/503/504)
CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 15 "${BASE}/reports/adscripcion")"
if [[ "${CODE}" == "401" || "${CODE}" == "422" ]]; then
    ok "ruta de adscripcion protegida (HTTP ${CODE})"
elif [[ "${CODE}" == "502" || "${CODE}" == "503" || "${CODE}" == "504" ]]; then
    fail "ruta de adscripcion -> HTTP ${CODE}"; exit 1
else
    ok "ruta de adscripcion responde (HTTP ${CODE})"
fi

# 4) Login admin + preview de reportes (solo si hay credenciales)
if [[ -n "${ADMIN_EMAIL}" && -n "${ADMIN_PASSWORD}" ]]; then
    TOKEN="$(curl -fsS -m 15 -X POST "${BASE}/auth/login" \
        -H 'Content-Type: application/json' \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
        | python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))')"
    [[ -n "${TOKEN}" ]] || { fail "login de admin fallo"; exit 1; }
    ok "login admin OK"

    PREVIEW="$(curl -fsS -m 30 -X POST "${BASE}/reports/preview" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H 'Content-Type: application/json' \
        -d '{"edad_min":1,"edad_max":120}' || true)"
    echo "${PREVIEW}" | grep -q '"total"' || { fail "preview de reportes -> ${PREVIEW:-sin respuesta}"; exit 1; }
    ok "preview de reportes OK"
fi

echo
ok "Todos los chequeos pasaron."
exit 0