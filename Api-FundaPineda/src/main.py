from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from src.routers.auth import auth
from src.routers.reports import reports
from src.routers.user import user
from src.routers.new import news
from src.routers.admin_roles import admin_roles
from src.routers.admin_users import admin_users
from src.routers.admin_metrics import admin_metrics
from src.routers.admin_contact import admin_contact
from src.routers.admin_reports import admin_reports
from src.routers.contact import contact
from src.conf.database import check_db_connection
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("funda_pineda.main")

app = FastAPI(
    title="Api FundaPineda",
    description="FundaPineda API manejo de adscripcion",
    version="1.0.0"
)

# 1. Orígenes permitidos. En producción se configuran por variable de entorno;
#    el comodín queda descartado porque allow_credentials=True + "*" es
#    rechazado por el navegador y, si se relajara, expondría la API.
_origins_env = os.getenv("CORS_ORIGINS", "").strip()
origins = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else [
        "http://localhost:5173",  # Frontend de React/Vite en desarrollo
        "http://127.0.0.1:5173",
    ]
)

# 2. Agrega el middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos los encabezados
)

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "signatures")
DOCS_DIR = os.path.join(STATIC_DIR, "document")
TEMP_DIR = os.path.join(STATIC_DIR, "temp")
TEMPLATES_DIR = os.path.join(STATIC_DIR, "templates")
NEWS_DIR = os.path.join(STATIC_DIR, "new")
NEWS_IMG_DIR = os.path.join(NEWS_DIR, "img")
CONTACT_DIR = os.path.join(STATIC_DIR, "contact")

# Crear todas las carpetas (incluyendo las nuevas)
for folder in [UPLOAD_DIR, DOCS_DIR, TEMP_DIR, TEMPLATES_DIR, NEWS_DIR, NEWS_IMG_DIR, CONTACT_DIR]:
    os.makedirs(folder, exist_ok=True)

# Guardar en el estado de la app para acceder desde los routers
app.state.UPLOAD_DIR = UPLOAD_DIR
app.state.DOCS_DIR = DOCS_DIR
app.state.TEMP_DIR = TEMP_DIR
app.state.TEMPLATES_DIR = TEMPLATES_DIR
app.state.NEWS_DIR = NEWS_DIR
app.state.NEWS_IMG_DIR = NEWS_IMG_DIR
app.state.CONTACT_DIR = CONTACT_DIR

@app.get("/", tags=["health"])
async def root():
    return JSONResponse(
        status_code=200,
        content={"message": "API esta funcionando correctamente!🆗"}
        )

@app.get("/health", tags=["health"])
async def health():
    if check_db_connection():
        return JSONResponse(status_code=200, content={"status": "ok", "database": "up"})
    return JSONResponse(
        status_code=503,
        content={"status": "degraded", "database": "down", "detail": "Base de datos no disponible"}
    )

@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError):
    logger.error("Error de base de datos en %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Base de datos no disponible"}
    )

@app.get("/robots.txt", include_in_schema=False)
async def robots():
    return PlainTextResponse(
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /dashboard\n"
        "Sitemap: https://fundapineda.org/sitemap.xml\n"
    )

app.include_router(auth)
app.include_router(reports)
app.include_router(user)
app.include_router(news)
app.include_router(admin_roles)
app.include_router(admin_users)
app.include_router(admin_metrics)
app.include_router(admin_contact)
app.include_router(admin_reports)
app.include_router(contact)