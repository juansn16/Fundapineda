import json
import logging
import os
import uuid
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from src.utils.email_service import send_contact_notification

logger = logging.getLogger("funda_pineda.contact")

contact = APIRouter(
    prefix="/contacto",
    tags=["contacto"],
    responses={404: {"description": "Not found"}},
)

class ContactMessage(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=100)
    telefono: str = Field(default="", max_length=30)
    mensaje: str = Field(..., min_length=10, max_length=2000)

index_lock = asyncio.Lock()

async def read_json_file(file_path: str):
    try:
        if not os.path.exists(file_path):
            return None
        def _read():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return await asyncio.to_thread(_read)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parsing JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

async def write_json_file(file_path: str, data: any):
    try:
        def _write():
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        await asyncio.to_thread(_write)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing file: {str(e)}")

async def get_index(contact_dir: str) -> list:
    index_path = os.path.join(contact_dir, "index.json")
    if not os.path.exists(index_path):
        await write_json_file(index_path, [])
    content = await read_json_file(index_path)
    return content if isinstance(content, list) else []

@contact.post("/", status_code=201, summary="Enviar mensaje de contacto")
async def send_contact_message(
    request: Request,
    message: ContactMessage,
):
    contact_dir = request.app.state.CONTACT_DIR
    msg_id = str(uuid.uuid4())
    fecha = datetime.now().isoformat()

    entry = {
        "id": msg_id,
        "nombre": message.nombre,
        "email": message.email,
        "telefono": message.telefono,
        "mensaje": message.mensaje,
        "fecha": fecha,
        "leido": False,
    }

    async with index_lock:
        index = await get_index(contact_dir)

        msg_path = os.path.join(contact_dir, f"{msg_id}.json")
        await write_json_file(msg_path, entry)

        index.insert(0, {
            "id": msg_id,
            "nombre": message.nombre,
            "email": message.email,
            "fecha": fecha,
            "leido": False,
        })
        await write_json_file(os.path.join(contact_dir, "index.json"), index)

    try:
        await send_contact_notification(
            nombre=message.nombre,
            email=message.email,
            telefono=message.telefono,
            mensaje=message.mensaje,
        )
    except Exception as email_error:
        logger.error(
            "No se pudo enviar la notificacion por email del mensaje %s: %s",
            msg_id,
            email_error,
        )

    return JSONResponse(
        status_code=201,
        content={"message": "Mensaje enviado correctamente", "id": msg_id}
    )
