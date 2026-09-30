from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from src.conf.database import get_db
from sqlalchemy.orm import Session
from src.utils.security import get_current_user, get_password_hash
from src.utils.email_service import send_verification_email
from src.utils.verification import crear_codigo, revocar_codigo
from src.models.db_models import UsuarioDB, PersonaDB, UbicacionDB, VerificationCodeDB
from src.models.usuario import UpdateProfileRequest, VerifyCodeRequest
import uuid
import logging

logger = logging.getLogger("funda_pineda.user")

user = APIRouter(
    prefix="/user",
    tags=["user"],
    responses={404: {"description": "Not found"}},
)

@user.post("/request-verification-code", summary="Solicitar código de verificación por correo")
async def request_verification_code(
    current_user: UsuarioDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.verificado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu cuenta ya esta verificada"
        )

    try:
        registro = crear_codigo(db, current_user.id)
    except Exception as code_error:
        logger.error("Error generando el codigo de verificacion: %s", code_error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al generar el código de verificación"
        )

    try:
        await send_verification_email(current_user.email, registro.code)
    except Exception as email_error:
        logger.error("Error enviando código de verificacion: %s", str(email_error))
        revocar_codigo(db, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar el código de verificación"
        )

    logger.info("Código de verificacion generado para usuario: %s", current_user.email)

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Se ha enviado un código de verificación a tu correo electronico"
        }
    )

@user.post("/verify-code", summary="Verificar correo con código de 6 dígitos")
async def verify_code(
    datos: VerifyCodeRequest,
    current_user: UsuarioDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verification = db.query(VerificationCodeDB).filter(
        VerificationCodeDB.user_id == current_user.id
    ).first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay código pendiente. Solicita uno nuevo desde tu perfil."
        )

    if verification.expires_at < datetime.now():
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ha expirado. Solicita uno nuevo."
        )

    if verification.attempts >= verification.max_attempts:
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Solicita un nuevo código."
        )

    if verification.code != datos.code:
        verification.attempts += 1
        remaining = verification.max_attempts - verification.attempts
        db.commit()
        
        if remaining <= 0:
            db.delete(verification)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Solicita un nuevo código."
            )
        
        logger.warning(
            "Intento fallido de verificacion para usuario %s. Intento %d de %d",
            current_user.email, verification.attempts, verification.max_attempts
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Codigo incorrecto. Te quedan {remaining} intento(s)."
        )

    current_user.verificado = 1
    db.delete(verification)
    db.commit()

    logger.info("Cuenta verificada exitosamente para usuario: %s", current_user.email)

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Correo verificado exitosamente"
        }
    )

@user.get("/profile", summary="Obtener perfil completo del usuario")
async def get_profile(
    current_user: UsuarioDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    persona = current_user.persona
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron datos de persona para este usuario"
        )

    persona_data = {
        "id": persona.id,
        "cedula": persona.cedula,
        "nombre": persona.nombre,
        "apellido": persona.apellido,
        "fecha_nacimiento": str(persona.fecha_nacimiento),
        "genero": persona.genero,
        "nacionalidad": persona.nacionalidad,
        "telefono": persona.telefono,
        "nombre_familia": persona.nombre_familia,
    }

    if persona.ubicacion_id and persona.ubicacion:
        persona_data["ubicacion"] = {
            "id": persona.ubicacion.id,
            "pais": persona.ubicacion.pais,
            "estado": persona.ubicacion.estado,
            "ciudad": persona.ubicacion.ciudad,
            "direccion": persona.ubicacion.direccion
        }

    return JSONResponse(
        status_code=200,
        content={
            "id": current_user.id,
            "email": current_user.email,
            "is_verified": bool(current_user.verificado),
            "activo": bool(current_user.activo),
            "persona": persona_data,
            "roles": [rol.rol for rol in current_user.roles]
        }
    )

@user.patch("/profile", summary="Actualizar datos del usuario")
async def update_profile(
    datos: UpdateProfileRequest,
    current_user: UsuarioDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.refresh(current_user)
    persona = current_user.persona

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron datos de persona para este usuario"
        )

    cambios = []

    if datos.email is not None:
        email_lower = datos.email.lower()
        existente = db.query(UsuarioDB).filter(
            UsuarioDB.email == email_lower,
            UsuarioDB.id != current_user.id
        ).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electronico ya esta en uso por otro usuario"
            )
        if email_lower != current_user.email:
            current_user.email = email_lower
            current_user.verificado = 0
            cambios.append("email")

    if datos.password is not None:
        current_user.password_hash = get_password_hash(datos.password)
        cambios.append("password")

    if datos.telefono is not None:
        persona.telefono = datos.telefono
        cambios.append("telefono")

    if datos.direccion is not None:
        if persona.ubicacion_id:
            ubicacion = db.query(UbicacionDB).filter(
                UbicacionDB.id == persona.ubicacion_id
            ).first()
            if ubicacion:
                ubicacion.pais = datos.direccion.pais
                ubicacion.estado = datos.direccion.estado
                ubicacion.ciudad = datos.direccion.ciudad
                ubicacion.direccion = datos.direccion.direccion
            else:
                nueva_ubicacion = UbicacionDB(
                    id=str(uuid.uuid4()),
                    pais=datos.direccion.pais,
                    estado=datos.direccion.estado,
                    ciudad=datos.direccion.ciudad,
                    direccion=datos.direccion.direccion
                )
                db.add(nueva_ubicacion)
                db.flush()
                persona.ubicacion_id = nueva_ubicacion.id
        else:
            nueva_ubicacion = UbicacionDB(
                id=str(uuid.uuid4()),
                pais=datos.direccion.pais,
                estado=datos.direccion.estado,
                ciudad=datos.direccion.ciudad,
                direccion=datos.direccion.direccion
            )
            db.add(nueva_ubicacion)
            db.flush()
            persona.ubicacion_id = nueva_ubicacion.id

        cambios.append("direccion")

    db.commit()

    if "email" in cambios or "password" in cambios:
        logger.info("Usuario %s actualizo credenciales de acceso", current_user.email)

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Perfil actualizado correctamente",
            "campos_actualizados": cambios
        }
    )
