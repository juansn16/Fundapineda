from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4


class RolBase(BaseModel):
    rol: str = Field(..., min_length=3, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=255)


class RolCreate(RolBase):
    pass


class RolUpdate(BaseModel):
    rol: Optional[str] = Field(None, min_length=3, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=255)


class RolResponse(RolBase):
    id: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "rol": "administrador",
                "descripcion": "Acceso total al sistema"
            }
        }
