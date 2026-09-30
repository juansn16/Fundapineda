from pydantic import BaseModel, Field
from typing import Optional


class NoticiaBase(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=200)
    categoria: str = Field(..., min_length=3, max_length=50)
    contenido: str = Field(..., min_length=10)
    resumen: str = Field(..., min_length=10, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "titulo": "Nueva iniciativa comunitaria",
                "categoria": "Comunidad",
                "contenido": "El contenido completo de la noticia...",
                "resumen": "Resumen breve de la noticia"
            }
        }


class NoticiaCreate(NoticiaBase):
    pass


class NoticiaInIndex(BaseModel):
    id: str
    titulo: str
    categoria: str
    fecha: str
    url_imagen: str
    imagen_base64: Optional[str] = None
    imagen_media_type: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "titulo": "Nueva iniciativa comunitaria",
                "categoria": "Comunidad",
                "fecha": "2026-05-04T10:30:00",
                "url_imagen": "/static/new/img/123e4567-e89b-12d3-a456-426614174000.webp",
                "imagen_base64": "UklGRiQAAABXRUJQVlA4...",
                "imagen_media_type": "image/webp"
            }
        }


class NoticiaResponse(NoticiaBase):
    id: str
    fecha: str
    url_imagen: str
    imagen_base64: Optional[str] = None
    imagen_media_type: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "titulo": "Nueva iniciativa comunitaria",
                "categoria": "Comunidad",
                "contenido": "El contenido completo de la noticia...",
                "resumen": "Resumen breve de la noticia",
                "fecha": "2026-05-04T10:30:00",
                "url_imagen": "/static/new/img/123e4567-e89b-12d3-a456-426614174000.webp",
                "imagen_base64": "UklGRiQAAABXRUJQVlA4...",
                "imagen_media_type": "image/webp"
            }
        }
