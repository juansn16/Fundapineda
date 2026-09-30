import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, selectinload

from src.conf.database import get_db
from src.models.db_models import UsuarioDB, RolDB, usuario_roles
from src.models.roles import RolCreate, RolUpdate, RolResponse
from src.utils.security import require_role

logger = logging.getLogger("funda_pineda.admin_roles")

admin_roles = APIRouter(
    prefix="/admin/roles",
    tags=["admin-roles"],
    responses={404: {"description": "Not found"}},
)


# --- Helper Functions ---
def get_role_or_404(db: Session, role_id: str) -> RolDB:
    """Get role by ID or raise 404."""
    role = db.query(RolDB).filter(RolDB.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rol con ID {role_id} no encontrado"
        )
    return role


def get_user_or_404(db: Session, user_id: str) -> UsuarioDB:
    """Get user by ID or raise 404."""
    user = (
        db.query(UsuarioDB)
        .options(selectinload(UsuarioDB.roles))
        .filter(UsuarioDB.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado"
        )
    return user


def check_role_not_protected(role: RolDB, action: str = "modify") -> None:
    """Prevent modification/deletion of protected system roles based on action."""
    protected_roles = {
        "administrador": ["modify", "delete"],
        "creador_contenido": ["delete"],
        "jefe_familia": ["delete"]
    }
    
    if role.rol in protected_roles:
        if action in protected_roles[role.rol]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El rol '{role.rol}' es un rol protegido y no puede ser {action}d"
            )


def check_role_not_assigned(db: Session, role_id: str) -> None:
    """Check if role is assigned to any user before deletion."""
    assigned = db.query(usuario_roles).filter(usuario_roles.c.rol_id == role_id).first()
    if assigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el rol porque está asignado a uno o más usuarios"
        )


def check_admin_lockout(db: Session, user: UsuarioDB, role: RolDB, current_user: UsuarioDB) -> None:
    """Prevent the last administrator from removing their own admin role."""
    if role.rol != "administrador":
        return
    
    # Count how many users have the administrator role
    admin_role_db = db.query(RolDB).filter(RolDB.rol == "administrador").first()
    if not admin_role_db:
        return
    
    admin_count = db.query(usuario_roles).filter(
        usuario_roles.c.rol_id == admin_role_db.id
    ).count()
    
    # If it's the last admin and they're trying to remove themselves
    if admin_count <= 1 and user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes remover el último administrador del sistema"
        )


# --- Endpoints ---
@admin_roles.get("/", response_model=List[RolResponse], summary="Listar todos los roles")
async def list_roles(
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db)
):
    roles = db.query(RolDB).all()
    return [RolResponse.model_validate(role) for role in roles]


@admin_roles.post("/", response_model=RolResponse, status_code=201, summary="Crear nuevo rol")
async def create_role(
    rol_data: RolCreate,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db)
):
    # Check if role name already exists
    existing = db.query(RolDB).filter(RolDB.rol == rol_data.rol).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El rol '{rol_data.rol}' ya existe"
        )
    
    new_role = RolDB(
        id=str(uuid.uuid4()),
        rol=rol_data.rol,
        descripcion=rol_data.descripcion
    )
    
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    
    logger.info("Rol creado: %s por usuario: %s", rol_data.rol, current_user.email)
    
    return RolResponse.model_validate(new_role)


@admin_roles.put("/{role_id}", response_model=RolResponse, summary="Actualizar rol")
async def update_role(
    role_id: str,
    rol_data: RolUpdate,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db)
):
    role = get_role_or_404(db, role_id)
    
    # Protect system roles from modification
    check_role_not_protected(role, "modify")
    
    # Check name uniqueness if changing
    if rol_data.rol is not None and rol_data.rol != role.rol:
        existing = db.query(RolDB).filter(RolDB.rol == rol_data.rol).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El rol '{rol_data.rol}' ya existe"
            )
        role.rol = rol_data.rol
    
    if rol_data.descripcion is not None:
        role.descripcion = rol_data.descripcion
    
    db.commit()
    db.refresh(role)
    
    logger.info("Rol actualizado: %s por usuario: %s", role.rol, current_user.email)
    
    return RolResponse.model_validate(role)


@admin_roles.delete("/{role_id}", summary="Eliminar rol")
async def delete_role(
    role_id: str,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db)
):
    role = get_role_or_404(db, role_id)
    
    # Protect system roles from deletion
    check_role_not_protected(role, "delete")
    
    # Check if role is assigned
    check_role_not_assigned(db, role_id)
    
    db.delete(role)
    db.commit()
    
    logger.info("Rol eliminado: %s por usuario: %s", role.rol, current_user.email)
    
    return JSONResponse(
        status_code=200,
        content={"message": f"Rol '{role.rol}' eliminado correctamente"}
    )


@admin_roles.post("/users/{user_id}/roles/{role_id}", summary="Añadir rol a usuario")
async def add_role_to_user(
    user_id: str,
    role_id: str,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db)
):
    user = get_user_or_404(db, user_id)
    role = get_role_or_404(db, role_id)
    
    # Check if user already has this role
    if any(r.id == role.id for r in user.roles):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El usuario ya tiene asignado el rol '{role.rol}'"
        )
    
    # Add role to user (append, don't replace)
    user.roles.append(role)
    db.commit()
    
    logger.info(
        "Rol '%s' añadido al usuario %s por: %s",
        role.rol, user.email, current_user.email
    )
    
    # Return updated role list
    return JSONResponse(
        status_code=200,
        content={
            "message": f"Rol '{role.rol}' añadido correctamente al usuario",
            "user_id": user_id,
            "roles": [RolResponse.model_validate(r).model_dump() for r in user.roles]
        }
    )


@admin_roles.delete("/users/{user_id}/roles/{role_id}", summary="Remover rol de usuario")
async def remove_role_from_user(
    user_id: str,
    role_id: str,
    current_user: UsuarioDB = Depends(require_role("administrador")),
    db: Session = Depends(get_db)
):
    user = get_user_or_404(db, user_id)
    role = get_role_or_404(db, role_id)
    
    # Check if user has this role
    if not any(r.id == role.id for r in user.roles):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El usuario no tiene asignado el rol '{role.rol}'"
        )
    
    # Check admin lockout prevention
    check_admin_lockout(db, user, role, current_user)
    
    # Remove role from user
    user.roles.remove(role)
    db.commit()
    
    logger.info(
        "Rol '%s' removido del usuario %s por: %s",
        role.rol, user.email, current_user.email
    )
    
    # Return updated role list
    return JSONResponse(
        status_code=200,
        content={
            "message": f"Rol '{role.rol}' removido correctamente del usuario",
            "user_id": user_id,
            "roles": [RolResponse.model_validate(r).model_dump() for r in user.roles]
        }
    )
