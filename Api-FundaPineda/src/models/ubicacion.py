from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4

class Ubicacion(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    pais: str = Field(..., min_length=3, max_length=100)
    estado: str = Field(..., min_length=3, max_length=100)
    ciudad: str = Field(..., min_length=3, max_length=100)
    direccion: str = Field(..., min_length=3, max_length=255)

    class Config:
        json_schema_extra = {
            "example": {
                "pais": "Venezuela",
                "estado": "Lara",
                "ciudad": "Barquisimeto",
                "direccion": "Calle 5 con Carrera 10"
            }
        }
