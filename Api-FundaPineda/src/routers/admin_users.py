import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from src.conf.database import get_db
from src.models.db_models import UsuarioDB, RolDB, PersonaDB, AdscripcionDB, usuario_roles
from src.utils.security import require_role

logger = logging.getLogger("funda_pineda.admin_users")

# --- Pydantic Schemas ---

class AdminPersonaResponse(BaseModel):
    id: str
    cedula: str
    nombre: str
    apellido: str
    fecha_nacimiento: str
    genero: Optional[str] = None
    nacionalidad: str
    telefono: str
    nombre_familia: str

    class Config:
        from_attributes = True


class AdminUserResponse(BaseModel):
    id: str
    email: str
    is_verified: bool
    persona: Optional[AdminPersonaResponse] = None
    roles: List[str]

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    usuarios: List[AdminUserResponse]
    total: int
    page: int
    limit: int


class UpdateUserRolesRequest(BaseModel):
    roles: List[str]


# --- Router ---

admin_users = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    responses={404: {"description": "Not found"}},
)


# --- Helpers ---

def get_user_or_404(db: Session, user_id: str) -> UsuarioDB:
    user = (
        db.query(UsuarioDB)
        .options(
            selectinload(UsuarioDB.roles),
            selectinload(UsuarioDB.persona),
        )
        .filter(UsuarioDB.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado"
        )
    return user


def build_user_response(user: UsuarioDB) -> AdminUserResponse:
    persona = None
    if user.persona:
        persona = AdminPersonaResponse(
            id=user.persona.id,
            cedula=user.persona.cedula,
            nombre=user.persona.nombre,
            apellido=user.persona.apellido,
            fecha_nacimiento=str(user.persona.fecha_nacimiento),
            genero=user.persona.genero,
            nacionalidad=user.persona.nacionalidad,
            telefono=user.persona.telefono,
            nombre_familia=user.persona.nombre_familia,
        )
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        is_verified=bool(user.verificado),
        persona=persona,
        roles=[r.rol for r in user.roles],
    )


# --- Endpoints ---

@admin_users.get("/", response_model=AdminUserListResponse, summary="Listar todos los usuarios")
async def list_users(
    search: Optional[str] = Query(None, description="Buscar por nombre, apellido, email o cédula"),
    role: Optional[str] = Query(None, description="Filtrar por nombre de rol"),
    is_verified: Optional[bool] = Query(None, description="Filtrar por verificación"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(10, ge=1, le=100, description="Elementos por página"),
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(UsuarioDB)
        .options(
            selectinload(UsuarioDB.roles),
            selectinload(UsuarioDB.persona),
        )
    )

    if search:
        search_term = f"%{search}%"
        query = query.join(UsuarioDB.persona).filter(
            or_(
                PersonaDB.nombre.ilike(search_term),
                PersonaDB.apellido.ilike(search_term),
                UsuarioDB.email.ilike(search_term),
                PersonaDB.cedula.ilike(search_term),
            )
        )

    if role:
        query = query.join(UsuarioDB.roles).filter(RolDB.rol == role)

    if is_verified is not None:
        query = query.filter(UsuarioDB.verificado == (1 if is_verified else 0))

    total = query.count()

    offset = (page - 1) * limit
    users = query.order_by(UsuarioDB.email).offset(offset).limit(limit).all()

    return AdminUserListResponse(
        usuarios=[build_user_response(u) for u in users],
        total=total,
        page=page,
        limit=limit,
    )


@admin_users.get("/{user_id}", response_model=AdminUserResponse, summary="Obtener usuario por ID")
async def get_user(
    user_id: str,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db),
):
    user = get_user_or_404(db, user_id)
    return build_user_response(user)


@admin_users.patch("/{user_id}/roles", summary="Actualizar roles de un usuario")
async def update_user_roles(
    user_id: str,
    data: UpdateUserRolesRequest,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db),
):
    user = get_user_or_404(db, user_id)

    existing_role_objs = db.query(RolDB).filter(RolDB.rol.in_(data.roles)).all()
    found_names = {r.rol for r in existing_role_objs}
    missing = set(data.roles) - found_names
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Los siguientes roles no existen: {', '.join(sorted(missing))}",
        )

    # Admin lockout prevention
    had_admin = any(r.rol == "administrador" for r in user.roles)
    has_admin = any(r.rol == "administrador" for r in existing_role_objs)
    if had_admin and not has_admin:
        admin_role = db.query(RolDB).filter(RolDB.rol == "administrador").first()
        if admin_role:
            admin_count = db.query(usuario_roles).filter(
                usuario_roles.c.rol_id == admin_role.id
            ).count()
            if admin_count <= 1 and user.id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No puedes remover el último administrador del sistema",
                )

    user.roles = existing_role_objs
    db.commit()
    db.refresh(user)

    logger.info("Roles actualizados para %s por: %s", user.email, current_user.email)

    return JSONResponse(
        status_code=200,
        content={
            "message": "Roles actualizados correctamente",
            "user_id": user_id,
            "roles": [r.rol for r in user.roles],
        },
    )


@admin_users.post("/{user_id}/verify", summary="Verificar un usuario manualmente")
async def verify_user(
    user_id: str,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db),
):
    user = get_user_or_404(db, user_id)

    if user.verificado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya está verificado",
        )

    user.verificado = 1
    db.commit()

    logger.info("Usuario verificado: %s por: %s", user.email, current_user.email)

    return JSONResponse(
        status_code=200,
        content={"message": f"Usuario '{user.email}' verificado correctamente"},
    )


@admin_users.delete("/{user_id}", summary="Eliminar un usuario")
async def delete_user(
    user_id: str,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes eliminarte a ti mismo",
        )

    user = get_user_or_404(db, user_id)
    email = user.email
    persona = user.persona

    db.delete(user)

    if persona:
        adscripciones_count = db.query(AdscripcionDB).filter(
            AdscripcionDB.jefe_familia_id == persona.id
        ).count()
        if adscripciones_count == 0:
            db.delete(persona)

    db.commit()

    logger.info("Usuario eliminado: %s por: %s", email, current_user.email)

    return JSONResponse(
        status_code=200,
        content={"message": f"Usuario '{email}' eliminado correctamente"},
    )
