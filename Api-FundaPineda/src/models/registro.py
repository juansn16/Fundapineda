from pydantic import BaseModel, Field
from .persona import Persona
from .usuario import Usuario
from .adscripciones import Adscripcion

class RegistroCompleto(BaseModel):
    persona: Persona
    usuario: Usuario
    adscripcion: Adscripcion
    # Nombre del archivo de la firma que genero POST /auth/firma. Ese endpoint
    # devuelve siempre un UUID v4 con extension .png; se restringe el formato
    # para que un valor manipulado no pueda apuntar a otra ruta del servidor.
    temp_signature_name: str = Field(
        ...,
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$",
    )