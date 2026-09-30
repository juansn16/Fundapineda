import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.responses import FileResponse
from src.conf.database import get_db
from sqlalchemy.orm import Session
from src.utils.security import get_current_user
from src.models.db_models import AdscripcionDB, UsuarioDB, PersonaDB

logger = logging.getLogger("funda_pineda.reports")

reports = APIRouter(
    prefix="/reports",
    tags=["reports"],
    responses={404: {"description": "Not found"}},
)


def _basename(ruta: str) -> str:
    return ruta.replace("\\", "/").rsplit("/", 1)[-1]


def resolver_archivo(ruta_guardada: str, directorio_base: str) -> str:
    """
    Resuelve el archivo real a partir de lo guardado en la BD.

    Acepta tanto rutas relativas (solo el nombre, esquema actual) como
    absolutas obsoletas de instalaciones anteriores, de modo que mover el
    proyecto no rompa los documentos ya registrados.
    """
    if not ruta_guardada:
        return ""

    # Preferimos siempre el directorio_base + basename. Candidatar la ruta
    # guardada tal cual solo aplica a instalaciones antiguas con absolutas, y
    # aun asi la contenemos para no servir un archivo fuera del directorio.
    candidatas = [
        os.path.join(directorio_base, _basename(ruta_guardada)),
    ]

    base_real = os.path.realpath(directorio_base)
    ruta_previa = os.path.realpath(ruta_guardada)
    try:
        contenida = os.path.commonpath([base_real, ruta_previa]) == base_real
    except ValueError:
        contenida = False
    if contenida and os.path.isfile(ruta_previa):
        candidatas.append(ruta_previa)

    es_ruta_absoluta_en_bd = "/" in ruta_guardada or "\\" in ruta_guardada

    for candidata in candidatas:
        if os.path.isfile(candidata):
            if es_ruta_absoluta_en_bd:
                logger.info(
                    "Ruta obsoleta en BD, resuelta por nombre: %s -> %s",
                    ruta_guardada,
                    candidata,
                )
            return candidata

    if es_ruta_absoluta_en_bd:
        logger.warning(
            "Ruta en BD fuera de los directorios de la aplicacion, ignorada: %s",
            ruta_guardada,
        )
    return candidatas[0]


@reports.get("/adscripcion")
async def get_reporte_adscripcion(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(get_current_user)
):
    adscripcion = db.query(AdscripcionDB).filter(
        AdscripcionDB.jefe_familia_id == current_user.persona_id
    ).first()

    if not adscripcion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una adscripción para este usuario."
        )

    ruta_archivo = resolver_archivo(
        adscripcion.ruta_documento_final,
        request.app.state.DOCS_DIR,
    )

    if not ruta_archivo or not os.path.isfile(ruta_archivo):
        logger.error(
            "Documento no encontrado para persona_id=%s | ruta en BD: %s | directorio: %s",
            current_user.persona_id,
            adscripcion.ruta_documento_final,
            request.app.state.DOCS_DIR,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo físico no se encuentra en el servidor."
        )

    cedula = db.query(PersonaDB.cedula).filter(
        PersonaDB.id == current_user.persona_id
    ).scalar()
    nombre_descarga = f"Adscripcion_{cedula or current_user.persona_id}.pdf"

    return FileResponse(
        path=ruta_archivo,
        filename=nombre_descarga,
        media_type='application/pdf',
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Pragma": "no-cache",
            "Vary": "Authorization",
        },
    )