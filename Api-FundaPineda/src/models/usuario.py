from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4

# bcrypt solo considera los primeros 72 bytes de la contrasena. Mas alla de ahi
# dos contrasenas distintas darian el mismo hash, asi que el limite se impone en
# el modelo en vez de aceptar el truncamiento en silencio.
MAX_PASSWORD_LENGTH = 72

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

class UpdateUbicacion(BaseModel):
    pais: str = Field(..., min_length=3, max_length=100)
    estado: str = Field(..., min_length=3, max_length=100)
    ciudad: str = Field(..., min_length=3, max_length=100)
    direccion: str = Field(..., min_length=3, max_length=255)

class UpdateProfileRequest(BaseModel):
    email: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=6, max_length=MAX_PASSWORD_LENGTH)
    telefono: Optional[str] = Field(None, min_length=10, max_length=20)
    direccion: Optional[UpdateUbicacion] = None

class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    activo: bool
    verificado: bool
    persona_id: str
    cedula: str
    nombre: str
    apellido: str
    fecha_nacimiento: str
    genero: Optional[str] = None
    nacionalidad: str
    telefono: str
    nombre_familia: str
    ubicacion_id: Optional[str] = None
    ubicacion: Optional[Ubicacion] = None

class Usuario(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    email: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=MAX_PASSWORD_LENGTH)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "usuario123@example.com",
                "password": "hashed_password"

            }
        }

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=50)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario123@example.com"
            }
        }

class VerifyCodeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=MAX_PASSWORD_LENGTH)

    class Config:
        json_schema_extra = {
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIs...",
                "new_password": "mi_nueva_clave_segura"
            }
        }