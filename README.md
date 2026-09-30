# FundaPineda

Sitio web y API de la **Fundación FundaPineda** (Venezuela): gestión de adscripciones,
noticias, programas, métricas, bandeja de mensajes de contacto y exportación de reportes.

## Estructura

```
├── Api-FundaPineda/        # Backend: FastAPI + SQLAlchemy + MariaDB/MySQL
│   └── src/
│       ├── routers/        # Endpoints por dominio (auth, reports, admin_*, contacto…)
│       ├── models/         # Modelos ORM + SQL (esquema, seed, índices)
│       ├── static/         # Runtime: firmas, PDFs, noticias (gitignore) + plantilla docx
│       └── utils/          # PDF (docx->PDF), email, seguridad, IP de cliente
├── fron-fundapineda/       # Frontend: React + Vite + TypeScript (SPA, React Router)
├── deploy/                 # Instalación en VPS Linux (cloudflared + nginx + systemd)
└── .env / .env.*           # Secretos locales (NO versionados, ver .gitignore)
```

## Stack y versiones

| Herramienta | Versión | Notas |
|---|---|---|
| SO (VPS) | Ubuntu 22.04 · 24.04 LTS | Lo probado; otro Debian debería valer |
| Python | 3.11.x | `deadsnakes` en 22.04; la app corre con `env/` (venv) |
| Node.js / npm | 22.x LTS / 10.x | Solo para compilar el frontend (build) |
| MariaDB / MySQL | 10.11 (24.04) · 10.6 (22.04) / MySQL 8.x | Backend usa PyMySQL |
| nginx | 1.24+ | Solo loopback `127.0.0.1:8088`, detrás del túnel (SPA + proxy) |
| cloudflared | 2025.x | Túnel nombrado (saliente) hacia Cloudflare; entrada pública + TLS |
| LibreOffice | 7.x (`libreoffice-writer`) | Convierte docx → PDF en Linux |
| Uvicorn (FastAPI) | uvicorn 0.46 / fastapi 0.136 | Escucha solo en 127.0.0.1:8000 |
| Cloudflare | — | DNS + edge (HTTPS). SSL/TLS en modo *Full (strict)*; sin Certbot |

Requisitos en **desarrollo (Windows)**: Python 3.11 + MS Word (para `docx2pdf`) +
MariaDB local. El front en dev apunta a `http://localhost:8000` (`VITE_API_URL`).

## Modelo de despliegue

```
Navegador → Cloudflare edge (HTTPS, TLS gestionado por Cloudflare)
              ↑ túnel saliente (0 puertos abiertos)
           cloudflared (servicio systemd)
              └─→ nginx (127.0.0.1:8088, SOLO loopback)
                    │  · try_files → /index.html (React Router)
                    │  · /assets/* → cache inmutable
                    └─ proxy (prefijos /auth /reports /admin /noticias /contacto /user /health)
                         ▼
                 uvicorn (127.0.0.1:8000, --proxy-headers)
                         ▼
                 MariaDB (localhost:3306) · LibreOffice headless (PDF de adscripción)
```

El frontend llama a la misma origin (`VITE_API_URL` vacío). Todo el tráfico
público entra por **cloudflared** (conexión *saliente* hacia Cloudflare); nginx
queda interno y solo escucha en `127.0.0.1:8088`.

## Puesta en producción (paso a paso)

```bash
# 1. En el VPS, preparar el repo y lanzar el instalador
sudo apt update && sudo apt install -y git
git clone https://<TU-REPO> fundapineda-deploy
cd fundapineda-deploy

export GIT_REPO_URL=https://<TU-REPO>        # repo del proyecto ya con deploy/ dentro
sudo DOMAIN=fundapineda.org bash deploy/install.sh
```

El script es **idempotente** y hace: paquetes base, Python 3.11, Node 22,
usuario/rutas, MariaDB con base + esquema + índices, `.env` con `SECRET_KEY`
aleatoria y API keys de BD, venv + dependencias (sin `pywin32`, solo Windows),
build del frontend, nginx interno (loopback) y servicio systemd del backend.
Firewall: solo 22/tcp (el túnel es saliente).

Pendientes **manuales** después del install:

```bash
# 2. Credenciales de email (app password de Gmail) + correo de notificación
sudo nano /opt/fundapineda/.env      # MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM,
                                     # CONTACT_NOTIFICATION_EMAIL, FRONTEND_URL
sudo systemctl restart fundapineda-backend

# 3. Túnel nombrado de cloudflared (una sola vez)
cloudflared tunnel login
cloudflared tunnel create fundapineda              # guarda el UUID
cloudflared tunnel route dns fundapineda fundapineda.org
cloudflared tunnel route dns fundapineda www.fundapineda.org
sudo cp ~/.cloudflared/<UUID>.json /etc/cloudflared/ && sudo chmod 600 /etc/cloudflared/<UUID>.json
sudo nano /etc/cloudflared/config.yml              # poner el UUID real (plantilla en deploy/)
sudo cloudflared service install
sudo systemctl enable --now cloudflared

# 4. En el dashboard de Cloudflare: SSL/TLS → modo "Full (strict)"

# 5. Verificación
bash deploy/check_health.sh
# con credenciales admin:
ADMIN_EMAIL=... ADMIN_PASSWORD=... bash deploy/check_health.sh
```

### Desglose manual (si no usas install.sh)

1. **SO y repos**: Ubuntu 22.04/24.04, clonar repo en `/opt/fundapineda`.
2. **Dependencias de sistema**:
   `nginx mariadb-server build-essential libgomp1 rsync libreoffice-writer fonts-dejavu-core`.
3. **Python 3.11** (si el sistema no la trae): `add-apt-repository ppa:deadsnakes/ppa`
   e instalar `python3.11 python3.11-venv python3.11-dev`.
4. **Node 22**: `curl -fsSL https://deb.nodesource.com/setup_22.x | bash -` + `apt install nodejs`.
5. **Frontend**: `cd fron-fundapineda && npm ci && VITE_API_URL='' npm run build`
   y copiar `dist/` a `/var/www/fundapineda`.
6. **Backend**:
   ```bash
   cd /opt/fundapineda/Api-FundaPineda
   python3.11 -m venv env
   env/bin/pip install -r requirements.txt     # en Linux: excluir pywin32
   ```
7. **Base de datos**:
   ```bash
   mysql -u root fundapineda < src/models/funda_pineda_db.sql
   mysql -u root fundapineda < src/models/02_indices_reportes.sql
   ```
8. **.env**: copiar `Api-FundaPineda/.env.example` a `/opt/fundapineda/.env`,
   generar `SECRET_KEY` (`openssl rand -hex 32`), fijar `DB_*`, `FRONTEND_URL`,
   `CORS_ORIGINS=https://fundapineda.org`, `TRUSTED_PROXIES=127.0.0.1`, `MAIL_*`.
9. **nginx** (interno): `deploy/nginx_fundapineda.conf` → `/etc/nginx/sites-available/`,
   `nginx -t` y recargar. Escucha solo en `127.0.0.1:8088`. El backend escucha en
   `127.0.0.1:8000` (`uvicorn src.main:app --proxy-headers --forwarded-allow-ips=127.0.0.1`).
10. **Túnel cloudflared**: hacer `login`, `tunnel create`, `route dns`
    (ver pasos 3 y 4 arriba), editar `/etc/cloudflared/config.yml` con el UUID
    y levantar con `cloudflared service install` + `systemctl enable --now cloudflared`.
11. **Servicio**: `deploy/fundapineda-backend.service` → `/etc/systemd/system/`,
    `daemon-reload` + `enable --now`.

## Variables de entorno (backend, `.env`)

| Variable | Uso |
|---|---|
| `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` | Conexión a MariaDB |
| `SECRET_KEY` / `ALGORITHM` / `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | JWT |
| `FRONTEND_URL` | Base del link de reset de contraseña (correo) |
| `CORS_ORIGINS` | Lista de origins permitidos por el navegador |
| `TRUSTED_PROXIES` | IPs de las que se acepta `X-Forwarded-For` (cliente real) |
| `MAIL_USERNAME/MAIL_PASSWORD/MAIL_FROM/MAIL_SERVER/MAIL_PORT` | SMTP (Gmail: app password) |
| `CONTACT_NOTIFICATION_EMAIL` | Destinatario de los mensajes de contacto |

## Backup y restauración

```bash
# BD
mysqldump -u root fundapineda > fundapineda_$(date +%F).sql

# Archivos (firmas, PDFs de adscripción, noticias, mensajes, plantilla)
rsync -a /opt/fundapineda/Api-FundaPineda/src/static/ /var/backups/fundapineda/static/

# Restaurar: mysql -u root fundapineda < fundapineda_FECHA.sql  y  rsync -a ... static
```

> El seed `funda_pineda_db.sql` guarda rutas *absolutas de Windows* en algunas
> adscripciones de ejemplo; el backend ya las resuelve por nombre de archivo
> (`resolver_archivo`), así que no afecta a producción.

## Actualización y rollback

```bash
# Actualizar (el install.sh reejecutado hace casi todo; para solo el código):
cd /opt/fundapineda && git pull --ff-only
cd Api-FundaPineda && env/bin/pip install -r requirements.txt     # ajustar pywin32
cd ../fron-fundapineda && npm ci && VITE_API_URL='' npm run build
rsync -a --delete dist/ /var/www/fundapineda/
sudo systemctl restart fundapineda-backend && sudo systemctl reload nginx
```
Rollback: `git checkout <commit-anterior>` y repetir build/restart.

## Solución de problemas

| Síntoma | Causa / corrección |
|---|---|
| El sitio no abre en el dominio | Revisar DNS en Cloudflare; `journalctl -u cloudflared -n 50`; que `/etc/cloudflared/config.yml` tenga el UUID real y que `<UUID>.json` (chmod 600) esté en `/etc/cloudflared/` |
| La firma no genera PDF en Linux | Falta `libreoffice-writer` o `fonts-dejavu-core`; verificar `which soffice` y `journalctl -u fundapineda-backend -f` |
| Error `pywin32` al instalar dependencias | Excluir la línea `pywin32==…` de `requirements.txt` en Linux (es solo Windows) |
| Link de "restablecer contraseña" apunta a `localhost` | `FRONTEND_URL` mal/no seteado en el `.env`; reiniciar el servicio |
| Descargas/exportes a los 30 s fallan | Reportes grandes: `proxy_read_timeout 300s` ya está en el nginx; revisar tiempo de consulta |
| IP del cliente siempre es `127.0.0.1` | Revisar `TRUSTED_PROXIES` (debe ser `127.0.0.1`: nginx + cloudflared conectan por loopback) y `--forwarded-allow-ips` |
| El navegador marca "no seguro" o carga incompleto | En Cloudflare: SSL/TLS en modo *Full (strict)*; el `X-Forwarded-Proto` se pasa como https |
| `CORS` da error en prod | Con same-origin no aplica; si el front está en otro dominio, ajustar `CORS_ORIGINS` y `VITE_API_URL` |
| El front no encuentra la API | `VITE_API_URL` quedó con `http://localhost:8080` de una build vieja: recompilar con cadena vacía |
| Mensajes SMTP no salen | Usar **app password** de Gmail (no la clave normal); puerto 587 + STARTTLS (valores del `.env.example`) |
| Escritura denegada a `src/static/` | El servicio corre como `fundapineda`; `chown -R fundapineda:fundapineda <rutas static>` |

## Checklist de seguridad

- [ ] Rotar `SECRET_KEY` y `MAIL_PASSWORD` en producción (nunca los del `.env` local).
- [ ] Entrada pública vía túnel saliente de cloudflared; uvicorn y nginx en `127.0.0.1` (`ufw` solo 22/tcp).
- [ ] HTTPS por Cloudflare con SSL/TLS en *Full (strict)* y `server_tokens off` (ya en el nginx de deploy).
- [ ] Credenciales del túnel: `<UUID>.json` con `chmod 600` en `/etc/cloudflared/`.
- [ ] Backups automáticos de BD y `static/` probados.
- [ ] `robots.txt` público bloquea `/dashboard`; el acceso real está por roles (JWT).
- [ ] No commitear `.env`, `*.pem` ni `_backups/` (cubierto por `.gitignore` raíz).

## Desarrollo local (rápido)

```bash
# BD: importar Api-FundaPineda/src/models/funda_pineda_db.sql con MySQL/MariaDB
# Backend: cd Api-FundaPineda && .\env\Scripts\activate  &&  uvicorn src.main:app --reload --port 8000
# Frontend: cd fron-fundapineda && npm install && npm run dev   # http://localhost:5173
```
En Windows el PDF usa Word+docx2pdf; en Linux usa LibreOffice (automático).