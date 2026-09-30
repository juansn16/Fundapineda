import asyncio
import json
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.conf.database import get_db
from src.models.db_models import UsuarioDB
from src.utils.security import require_role

logger = logging.getLogger("funda_pineda.admin_contact")

admin_contact = APIRouter(
    prefix="/admin/contact",
    tags=["admin-contact"],
    responses={404: {"description": "Not found"}},
)

index_lock = asyncio.Lock()


def _join_contact_dir(request: Request) -> str:
    return request.app.state.CONTACT_DIR


def _basename(nombre: str) -> str:
    return nombre.replace("\\", "/").rsplit("/", 1)[-1]


def _safe_msg_path(contact_dir: str, msg_id: str) -> str:
    msg_id = _basename(msg_id)
    return os.path.join(contact_dir, msg_id)


async def _read_json_async(file_path: str):
    def _read():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    return await asyncio.to_thread(_read)


async def _write_json_async(file_path: str, data):
    def _write():
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    await asyncio.to_thread(_write)


def _escapar_id(msg_id: str) -> str:
    """Acepta unicamente ids seguros (uuid + .json). Previene path traversal."""
    msg_id = _basename(msg_id)
    if not msg_id.endswith(".json"):
        msg_id = f"{msg_id}.json"
    if len(msg_id) > 64:
        raise HTTPException(status_code=400, detail="Id de mensaje invalido")
    try:
        uuid.UUID(msg_id[:-5])
    except ValueError:
        raise HTTPException(status_code=400, detail="Id de mensaje invalido")
    return msg_id


async def _leer_mensajes(contact_dir: str) -> list:
    index_path = os.path.join(contact_dir, "index.json")
    if not os.path.exists(index_path):
        return []
    try:
        index = await _read_json_async(index_path)
    except Exception:
        return []
    if not isinstance(index, list):
        return []

    mensajes = []
    for item in index:
        if not isinstance(item, dict):
            continue
        msg_id = item.get("id")
        if not msg_id:
            continue
        full = None
        try:
            full = await _read_json_async(
                os.path.join(contact_dir, _escapar_id(str(msg_id)))
            )
        except Exception as exc:
            logger.warning("No se pudo leer el mensaje %s: %s", msg_id, exc)
        if isinstance(full, dict):
            mensajes.append(full)
        else:
            mensajes.append(item)
    return mensajes


@admin_contact.get("", summary="Listar mensajes de contacto")
async def list_contact_messages(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    mensajes = await _leer_mensajes(_join_contact_dir(request))
    mensajes.sort(key=lambda m: m.get("fecha", ""), reverse=True)
    return {"mensajes": mensajes, "total": len(mensajes)}


@admin_contact.patch("/{msg_id}/read", summary="Marcar mensaje como leído")
async def mark_message_read(
    msg_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    contact_dir = _join_contact_dir(request)
    archivo = _escapar_id(msg_id)
    ruta = os.path.join(contact_dir, archivo)

    if not os.path.isfile(ruta):
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    mensaje = await _read_json_async(ruta)
    mensaje["leido"] = True
    await _write_json_async(ruta, mensaje)

    index_path = os.path.join(contact_dir, "index.json")
    try:
        index = await _read_json_async(index_path)
    except Exception:
        index = []
    if isinstance(index, list):
        for item in index:
            if isinstance(item, dict) and item.get("id") == archivo[:-5]:
                item["leido"] = True
        await _write_json_async(index_path, index)

    logger.info("Mensaje de contacto %s marcado como leido por %s", archivo, current_user.email)

    return JSONResponse(
        status_code=200,
        content={"message": "Mensaje marcado como leído", "id": archivo[:-5]},
    )


@admin_contact.delete("/{msg_id}", summary="Eliminar mensaje de contacto")
async def delete_contact_message(
    msg_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    contact_dir = _join_contact_dir(request)
    archivo = _escapar_id(msg_id)
    ruta = os.path.join(contact_dir, archivo)

    if not os.path.isfile(ruta):
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    os.remove(ruta)

    index_path = os.path.join(contact_dir, "index.json")
    try:
        index = await _read_json_async(index_path)
    except Exception:
        index = []
    if isinstance(index, list):
        index = [
            item for item in index
            if not (isinstance(item, dict) and item.get("id") == archivo[:-5])
        ]
        await _write_json_async(index_path, index)

    logger.info("Mensaje de contacto %s eliminado por %s", archivo, current_user.email)

    return JSONResponse(
        status_code=200,
        content={"message": "Mensaje eliminado", "id": archivo[:-5]},
    )