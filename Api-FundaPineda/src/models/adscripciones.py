# src/models/adscripciones.py
from datetime import date
from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4

class Adscripcion(BaseModel):
    # ip_registro NO forma parte del contrato de entrada: lo calcula el servidor
    # desde la request real (ver src/utils/client_ip.py). Si el cliente lo envía,
    # Pydantic lo descarta y se ignora.
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()))  
    fecha_firma: date = Field(default_factory=date.today)

    class Config:
        json_schema_extra = {
            "example": {
                "fecha_firma": "2026-04-25"
            }
        }