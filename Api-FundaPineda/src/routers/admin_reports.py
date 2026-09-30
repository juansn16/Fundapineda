import asyncio
import csv
import logging
import os
import time
import uuid
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from src.conf.database import SessionLocal, get_db
from src.models.db_models import AdscripcionDB, PersonaDB, UsuarioDB
from src.utils.security import require_role

logger = logging.getLogger("funda_pineda.admin_reports")

MAX_REGISTROS = 20_000
EXPORT_TIMEOUT = 30
PREVIEW_LIMIT_DEFAULT = 20
PREVIEW_LIMIT_MAX = 50

HEADERS = [
    "Nombre",
    "Apellido",
    "Cédula",
    "Fecha de Nacimiento",
    "Edad",
    "Género",
    "Nacionalidad",
    "Teléfono",
    "Nombre Familia",
    "Email",
    "Estado Usuario",
    "Estado Adscripción",
    "Fecha de Firma",
]

MEDIA_TYPES = {
    "xlsx": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ),
    "csv": "text/csv; charset=utf-8",
}

COLUMNAS_ORDEN = {
    "nombre": PersonaDB.nombre,
    "apellido": PersonaDB.apellido,
    "fecha_nacimiento": PersonaDB.fecha_nacimiento,
    "fecha_firma": AdscripcionDB.fecha_firma,
}


class RegistrosVacios(Exception):
    pass


class DemasiadosRegistros(Exception):
    pass


class ReporteFiltros(BaseModel):
    edad_min: int = Field(0, ge=0, le=120)
    edad_max: int = Field(120, ge=0, le=120)
    genero: Optional[Literal["M", "F"]] = None
    nacionalidad: Optional[str] = Field(None, max_length=50)
    estado_adscripcion: Literal["FIRMADO", "PENDIENTE", "TODOS"] = "TODOS"
    estado_usuario: Literal["ACTIVO", "INACTIVO", "TODOS"] = "TODOS"
    orden_por: Literal["nombre", "apellido", "fecha_nacimiento", "fecha_firma"] = "fecha_firma"
    orden_tipo: Literal["asc", "desc"] = "asc"
    formato: Literal["xlsx", "csv"] = "xlsx"

    @model_validator(mode="after")
    def _validar_edades(self):
        if self.edad_min > self.edad_max:
            raise ValueError("La edad mínima no puede ser mayor que la edad máxima")
        return self


admin_reports = APIRouter(
    prefix="/reports",
    tags=["admin-reports"],
    responses={404: {"description": "Not found"}},
)


def _restar_anios(d: date, n: int) -> date:
    """Resta n años manejando el 29 de febrero."""
    try:
        return d.replace(year=d.year - n)
    except ValueError:
        return d.replace(year=d.year - n, month=2, day=28)


def _edad(fecha: date, hoy: date) -> int:
    return (hoy.year - fecha.year) - int((hoy.month, hoy.day) < (fecha.month, fecha.day))


def construir_select(filtros: ReporteFiltros):
    """Construye el SELECT con filtros, joins y ordenamiento.

    Solo se referencian columnas ORM mapeadas, por lo que el resultado es
    inmune a inyección SQL; los valores van siempre como parámetros.
    """
    hoy = date.today()

    columnas = (
        PersonaDB.nombre,
        PersonaDB.apellido,
        PersonaDB.cedula,
        PersonaDB.fecha_nacimiento,
        PersonaDB.genero,
        PersonaDB.nacionalidad,
        PersonaDB.telefono,
        PersonaDB.nombre_familia,
        UsuarioDB.email,
        UsuarioDB.activo,
        AdscripcionDB.fecha_firma,
    )

    stmt = (
        select(*columnas)
        .outerjoin(AdscripcionDB, AdscripcionDB.jefe_familia_id == PersonaDB.id)
        .outerjoin(UsuarioDB, UsuarioDB.persona_id == PersonaDB.id)
    )

    if filtros.edad_min > 0:
        stmt = stmt.where(PersonaDB.fecha_nacimiento <= _restar_anios(hoy, filtros.edad_min))
    if filtros.edad_max < 120:
        stmt = stmt.where(PersonaDB.fecha_nacimiento > _restar_anios(hoy, filtros.edad_max + 1))

    if filtros.genero:
        stmt = stmt.where(PersonaDB.genero == filtros.genero)

    if filtros.nacionalidad:
        nom = filtros.nacionalidad.strip()
        if nom:
            stmt = stmt.where(func.lower(PersonaDB.nacionalidad) == nom.lower())

    if filtros.estado_adscripcion == "FIRMADO":
        stmt = stmt.where(AdscripcionDB.id.is_not(None))
    elif filtros.estado_adscripcion == "PENDIENTE":
        stmt = stmt.where(AdscripcionDB.id.is_(None))

    if filtros.estado_usuario == "ACTIVO":
        stmt = stmt.where(UsuarioDB.activo == 1)
    elif filtros.estado_usuario == "INACTIVO":
        stmt = stmt.where(or_(UsuarioDB.activo == 0, UsuarioDB.id.is_(None)))

    columna = COLUMNAS_ORDEN[filtros.orden_por]
    orden = columna.asc() if filtros.orden_tipo == "asc" else columna.desc()
    stmt = stmt.order_by(orden)

    return stmt


def _estado_adscripcion(fecha_firma) -> str:
    return "FIRMADO" if fecha_firma else "PENDIENTE"


def _estado_usuario(activo) -> str:
    if activo is None:
        return "SIN USUARIO"
    return "ACTIVO" if activo == 1 else "INACTIVO"


def _fila_a_dict(fila, hoy: date) -> dict:
    return {
        "nombre": fila.nombre,
        "apellido": fila.apellido,
        "cedula": fila.cedula,
        "fecha_nacimiento": fila.fecha_nacimiento.isoformat() if fila.fecha_nacimiento else None,
        "edad": _edad(fila.fecha_nacimiento, hoy),
        "genero": fila.genero or "",
        "nacionalidad": fila.nacionalidad or "",
        "telefono": fila.telefono or "",
        "nombre_familia": fila.nombre_familia or "",
        "email": fila.email or "",
        "estado_usuario": _estado_usuario(fila.activo),
        "estado_adscripcion": _estado_adscripcion(fila.fecha_firma),
        "fecha_firma": fila.fecha_firma.isoformat() if fila.fecha_firma else None,
    }


def _fila_a_valores(fila, hoy: date) -> tuple:
    datos = _fila_a_dict(fila, hoy)
    return (
        datos["nombre"],
        datos["apellido"],
        datos["cedula"],
        datos["fecha_nacimiento"],
        datos["edad"],
        datos["genero"],
        datos["nacionalidad"],
        datos["telefono"],
        datos["nombre_familia"],
        datos["email"],
        datos["estado_usuario"],
        datos["estado_adscripcion"],
        datos["fecha_firma"],
    )


def _contar(filtros: ReporteFiltros, db: Session) -> int:
    stmt = construir_select(filtros)
    return db.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar() or 0


def _iterar_filas(filtros: ReporteFiltros, db: Session, hoy: date):
    stmt = construir_select(filtros)
    result = db.execute(
        stmt.execution_options(stream_results=True, yield_per=1000)
    )
    for fila in result:
        yield _fila_a_valores(fila, hoy)


def _escribir_csv(filtros: ReporteFiltros, temp_path: str, hoy: date, db: Session) -> None:
    try:
        with open(temp_path, "w", newline="", encoding="utf-8-sig") as fh:
            writer = csv.writer(fh)
            writer.writerow(HEADERS)
            for fila in _iterar_filas(filtros, db, hoy):
                writer.writerow(fila)
    except FileNotFoundError:
        logger.warning("Export CSV cancelado: el temporal %s ya no existe", temp_path)


def _escribir_xlsx(filtros: ReporteFiltros, temp_path: str, hoy: date, db: Session) -> None:
    from openpyxl import Workbook

    wb = Workbook(write_only=True)
    ws = wb.create_sheet("Reporte")
    ws.append(HEADERS)
    for fila in _iterar_filas(filtros, db, hoy):
        ws.append(fila)
    try:
        wb.save(temp_path)
    except FileNotFoundError:
        logger.warning("Export XLSX cancelado: el temporal %s ya no existe", temp_path)


def _generar_en_thread(filtros: ReporteFiltros, temp_path: str) -> None:
    """Corre en hilo aparte: stream desde MySQL y escritura fila a fila."""
    hoy = date.today()
    with SessionLocal() as db:
        total = _contar(filtros, db)
        if total == 0:
            raise RegistrosVacios()
        if total > MAX_REGISTROS:
            raise DemasiadosRegistros(total)

        if filtros.formato == "xlsx":
            _escribir_xlsx(filtros, temp_path, hoy, db)
        else:
            _escribir_csv(filtros, temp_path, hoy, db)


def _limpieza_thread(path: str) -> None:
    """Borra el temporal con reintentos (en Windows el archivo puede estar
    ocupado mientras el worker termina de escribirlo)."""
    intentos = 0
    while intentos < 30:
        if not os.path.exists(path):
            return
        try:
            os.remove(path)
            return
        except PermissionError:
            intentos += 1
            time.sleep(1)
        except FileNotFoundError:
            return


@admin_reports.get("/nacionalidades", summary="Listar nacionalidades disponibles")
async def listar_nacionalidades(
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    filas = db.execute(
        select(func.distinct(PersonaDB.nacionalidad))
        .where(PersonaDB.nacionalidad.isnot(None))
        .order_by(PersonaDB.nacionalidad)
    ).all()
    nacionalidades = [f[0] for f in filas if f[0]]
    return JSONResponse(content={"nacionalidades": nacionalidades})


@admin_reports.post("/preview", summary="Previsualizar reporte")
async def preview_reporte(
    filtros: ReporteFiltros,
    request: Request,
    limit: int = Query(default=PREVIEW_LIMIT_DEFAULT, ge=1, le=PREVIEW_LIMIT_MAX),
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    hoy = date.today()
    stmt = construir_select(filtros)
    total = db.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar() or 0
    filas = db.execute(stmt.limit(limit)).all()
    registros = [_fila_a_dict(fila, hoy) for fila in filas]
    return JSONResponse(content={"total": total, "registros": registros})


@admin_reports.post("/export", summary="Generar y descargar reporte")
async def export_reporte(
    filtros: ReporteFiltros,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    hoy = date.today()
    ext = filtros.formato
    nombre_descarga = f"reporte_fundapineda_{hoy:%Y%m%d}.{ext}"
    temp_path = os.path.join(
        request.app.state.TEMP_DIR, f"reporte_{uuid.uuid4().hex}.{ext}"
    )

    try:
        await asyncio.wait_for(
            asyncio.to_thread(_generar_en_thread, filtros, temp_path),
            timeout=EXPORT_TIMEOUT,
        )
    except RegistrosVacios:
        _limpieza_thread(temp_path)
        raise HTTPException(
            status_code=404,
            detail="No se encontraron registros con los filtros seleccionados",
        )
    except DemasiadosRegistros as exc:
        total = exc.args[0] if exc.args else MAX_REGISTROS
        logger.warning("Reporte bloqueado por exceso de registros (%d)", total)
        _limpieza_thread(temp_path)
        raise HTTPException(
            status_code=400,
            detail=(
                f"El resultado ({total}) supera el máximo permitido de "
                f"{MAX_REGISTROS} registros. Ajusta los filtros para acotar la consulta."
            ),
        )
    except asyncio.TimeoutError:
        logger.error(
            "Export de reporte agotó el tiempo (%ss) filtros=%s",
            EXPORT_TIMEOUT,
            filtros.model_dump(),
        )
        asyncio.create_task(asyncio.to_thread(_limpieza_thread, temp_path))
        raise HTTPException(
            status_code=504,
            detail=(
                "La generación del reporte tardó demasiado. "
                "Ajusta los filtros para reducir el volumen de datos."
            ),
        )
    except Exception:
        logger.exception("Error interno al generar el reporte")
        _limpieza_thread(temp_path)
        raise HTTPException(
            status_code=500,
            detail="Error interno al generar el reporte.",
        )

    if not os.path.isfile(temp_path):
        raise HTTPException(status_code=500, detail="Error interno al generar el reporte.")

    logger.info(
        "Reporte %s generado por %s",
        nombre_descarga,
        current_user.email,
    )

    return FileResponse(
        path=temp_path,
        filename=nombre_descarga,
        media_type=MEDIA_TYPES[ext],
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Pragma": "no-cache",
            "Vary": "Authorization",
        },
        background=BackgroundTask(_limpieza_thread, temp_path),
    )