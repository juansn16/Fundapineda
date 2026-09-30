from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from uuid import uuid4

class Persona(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    # Solo alfanumericos. La cedula se concatena para construir nombres de
    # archivo (firma_*.png, adscripcion_*.pdf), asi que permitir / \ . .. abriria
    # la puerta a escribir fuera de los directorios de la aplicacion.
    cedula: str = Field(..., min_length=6, max_length=20, pattern=r"^[A-Za-z0-9]+$")
    nombre: str = Field(..., min_length=3, max_length=100)
    apellido: str = Field(..., min_length=3, max_length=100)
    fecha_nacimiento: date
    genero: str = Field(..., pattern="^[MF]$")
    nacionalidad: str = Field(default="Venezolana", max_length=50)
    telefono: str = Field(..., min_length=10, max_length=20)
    nombre_familia: str = Field(..., min_length=3, max_length=100)
    ubicacion_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "cedula": "31000000",
                "nombre": "Juan Antonio",
                "apellido": "Salazar Nuvaez",
                "fecha_nacimiento": "2004-12-04",
                "genero": "M",
                "nacionalidad": "Venezolana",
                "telefono": "0412-1234567",
                "nombre_familia": "Familia Salazar Nuvaez",
                "ubicacion_id": None
            }
        }