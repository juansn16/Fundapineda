from datetime import timedelta, datetime
from jose import jwt, JWTError
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import uuid, os, asyncio, shutil
import logging

from concurrent.futures import ProcessPoolExecutor
from src.utils.img_processing import procesar_firma_pesada

from src.models.registro import RegistroCompleto
from src.models.usuario import (
    Usuario as UsuarioSchema,
    ForgotPasswordRequest, ResetPasswordRequest,
)

from src.models.db_models import PersonaDB, AdscripcionDB, UsuarioDB, RolDB, UsedTokenDB
from src.conf.database import get_db
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import OperationalError, IntegrityError

from src.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    get_current_user,
    get_current_user_from_refresh,
    SECRET_KEY,
    ALGORITHM,
)
from src.utils.email_service import send_reset_email, send_verification_email
from src.utils.client_ip import get_client_ip
from src.utils.verification import crear_codigo
from src.utils.generar_pdf_adscripcion import generar_con_imagen

logger = logging.getLogger("funda_pineda.auth")

auth = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)

executor = ProcessPoolExecutor(max_workers=2)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def _enviar_codigo_verificacion(db: Session, user_id: str, email_destino: str) -> bool:
    """Genera un codigo de 6 digitos, lo persiste y lo envia por correo.

    Nunca propaga excepciones: devuelve False para que el llamador decida si el
    fallo de correo invalida la operacion (en el registro, no).
    """
    try:
        registro = crear_codigo(db, user_id)
        await send_verification_email(email_destino, registro.code)
        logger.info("Codigo de verificacion enviado a %s", email_destino)
        return True
    except Exception as email_error:
        logger.error("Error enviando el codigo de verificacion: %s", email_error)
        try:
            db.rollback()
        except Exception as rollback_error:
            logger.warning("Rollback fallido tras fallo de correo: %s", rollback_error)
        return False


@auth.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    datos_registro: RegistroCompleto,
    db: Session = Depends(get_db)
):
    persona_in = datos_registro.persona
    usuario_in = datos_registro.usuario
    adscripcion_in = datos_registro.adscripcion
    temp_name = datos_registro.temp_signature_name

    # El patron del modelo ya restringe temp_name a un UUID .png, pero anadimos
    # la comprobacion de contencion como red de seguridad: aunque el modelo
    # cambiara, ninguna ruta derivada de un nombre de archivo podria salir de
    # TEMP_DIR.
    temp_dir = os.path.realpath(request.app.state.TEMP_DIR)
    temp_name = os.path.basename(temp_name)
    ruta_temp_firma = os.path.realpath(os.path.join(temp_dir, temp_name))

    if os.path.commonpath([temp_dir, ruta_temp_firma]) != temp_dir:
        logger.error("Intento de acceso fuera de TEMP_DIR: %r", temp_name)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de firma no válido."
        )

    if not os.path.isfile(ruta_temp_firma):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La firma procesada no existe o ha expirado."
        )

    firma_movida = False
    ruta_firma_final = None
    ruta_pdf_final = None

    try:
        nueva_persona = PersonaDB(**persona_in.model_dump())
        db.add(nueva_persona)
        db.flush()

        hash_seguro = get_password_hash(usuario_in.password)
        nuevo_usuario = UsuarioDB(
            id=usuario_in.id,
            persona_id=nueva_persona.id,
            email=usuario_in.email.lower(),
            password_hash=hash_seguro,
            verificado=0,
            created_at=datetime.now(),
        )

        rol_jefe = db.query(RolDB).filter(RolDB.rol == "jefe_familia").first()
        if not rol_jefe:
            rol_jefe = RolDB(id=str(uuid.uuid4()), rol="jefe_familia")
            db.add(rol_jefe)
            db.flush()
        nuevo_usuario.roles = [rol_jefe]
        db.add(nuevo_usuario)

        nombre_firma = f"firma_{nueva_persona.cedula}_{uuid.uuid4().hex[:6]}.png"
        ruta_firma_final = os.path.join(request.app.state.UPLOAD_DIR, nombre_firma)

        nombre_pdf = f"adscripcion_{nueva_persona.cedula}.pdf"
        ruta_pdf_final = os.path.join(request.app.state.DOCS_DIR, nombre_pdf)

        ruta_plantilla = os.path.join(request.app.state.TEMPLATES_DIR, "carta_adscripcion.docx")

        datos_pdf = {
            "nombre_completo": f"{persona_in.nombre} {persona_in.apellido}",
            "nacionalidad": persona_in.nacionalidad,
            "cedula": persona_in.cedula,
            "telefono": persona_in.telefono,
            "nombre_familia": persona_in.nombre_familia,
        }

        # Generar PDF usando firma desde temp (sin moverla aún)
        try:
            generar_con_imagen(
                datos_pdf,
                ruta_temp_firma,
                ruta_plantilla,
                ruta_pdf_final,
                doc_temp=os.path.join(request.app.state.TEMP_DIR, f"doc_{uuid.uuid4().hex[:6]}.docx"),
            )
        except Exception as pdf_error:
            raise Exception(f"Fallo en generacion de PDF: {str(pdf_error)}")

        # Solo si todo salió bien, mover la firma
        shutil.move(ruta_temp_firma, ruta_firma_final)
        firma_movida = True

        # Crear adscripción guardando solo el nombre del archivo, no la ruta
        # absoluta: así el proyecto se puede mover sin romper las descargas.
        nueva_adscripcion = AdscripcionDB(
            id=adscripcion_in.id,
            jefe_familia_id=nueva_persona.id,
            fecha_firma=adscripcion_in.fecha_firma,
            ip_registro=get_client_ip(request),
            ruta_firma=nombre_firma,
            ruta_documento_final=nombre_pdf
        )
        db.add(nueva_adscripcion)

        db.commit()

        access_token = create_access_token(
            data={"sub": usuario_in.email, "user_id": str(nuevo_usuario.id)},
            expires_delta=timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)))
        )
        refresh_token = create_refresh_token(data={"sub": usuario_in.email})

        # La cuenta ya existe y el PDF ya esta generado, asi que un fallo del
        # correo no debe tumbar el registro: se avisa al frontend con
        # verificacion_enviada=False y el usuario puede pedir otro codigo desde
        # su panel.
        verificacion_enviada = await _enviar_codigo_verificacion(db, nuevo_usuario.id, nuevo_usuario.email)

        logger.info("Registro exitoso para usuario: %s", usuario_in.email)

        return {
            "status": "success",
            "message": "Registro y contrato generados correctamente",
            "documento": nombre_pdf,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "verificacion_enviada": verificacion_enviada,
        }

    except Exception as e:
        try:
            db.rollback()
        except Exception as rollback_error:
            logger.warning("Rollback fallido: %s", rollback_error)

        def _eliminar(ruta):
            if ruta and os.path.exists(ruta):
                try:
                    os.remove(ruta)
                except OSError as cleanup_error:
                    logger.warning("No se pudo eliminar %s: %s", ruta, cleanup_error)

        # Limpiar firma movida si ya se había movido
        if firma_movida:
            _eliminar(ruta_firma_final)

        # Limpiar PDF generado si existe pero el registro falló
        _eliminar(ruta_pdf_final)

        # Limpiar firma temp si aún no fue movida
        if not firma_movida:
            _eliminar(ruta_temp_firma)

        logger.error("Error en registro: %s", str(e))

        if isinstance(e, OperationalError):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Base de datos no disponible"
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en el flujo de registro: {str(e)}"
        )

@auth.post("/firma", summary="Procesar firma de adscripcion")
async def procesar_firma(request: Request, file: UploadFile = File(...)):
    contenido = await file.read()
    loop = asyncio.get_event_loop()

    try:
        nombre_archivo, preview_b64 = await loop.run_in_executor(
            executor,
            procesar_firma_pesada,
            contenido,
            request.app.state.TEMP_DIR
        )

        return {
            "temp_file_name": nombre_archivo,
            "preview_base64": preview_b64
        }
    except Exception as e:
        logger.error("Error procesando firma: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error procesando imagen: {str(e)}")

@auth.post("/login", summary="Iniciar sesion y obtener Token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(UsuarioDB).filter(UsuarioDB.email == form_data.username.lower()).first()

    if not usuario:
        logger.warning("Intento de login con email no registrado: %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El correo electronico no esta registrado."
        )

    if not verify_password(form_data.password, usuario.password_hash):
        logger.warning("Contrasea incorrecta para usuario: %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contrasena incorrecta. Intente de nuevo."
        )

    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)))
    access_token = create_access_token(
        data={"sub": usuario.email, "user_id": str(usuario.id)},
        expires_delta=access_token_expires
    )

    is_verified = bool(usuario.verificado)

    response_data = {
        "access_token": access_token,
        "refresh_token": create_refresh_token(data={"sub": usuario.email}),
        "token_type": "bearer",
        "user": {
            "email": usuario.email,
            "id": usuario.id,
            "is_verified": is_verified
        }
    }

    if not is_verified:
        response_data["warning"] = "Tu cuenta no ha sido verificada. Revisa tu correo electronico para activarla."

    logger.info("Login exitoso para usuario: %s", usuario.email)

    return JSONResponse(status_code=200, content=response_data)


@auth.get("/me", summary="Obtener usuario actual con roles")
async def get_current_user_info(
    current_user: UsuarioDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Recargar usuario con relaciones
    user_with_data = (
        db.query(UsuarioDB)
        .options(selectinload(UsuarioDB.roles), selectinload(UsuarioDB.persona))
        .filter(UsuarioDB.id == current_user.id)
        .first()
    )
    
    if not user_with_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return {
        "id": user_with_data.id,
        "email": user_with_data.email,
        "is_verified": bool(user_with_data.verificado),
        "persona": {
            "id": user_with_data.persona.id,
            "cedula": user_with_data.persona.cedula,
            "nombre": user_with_data.persona.nombre,
            "apellido": user_with_data.persona.apellido,
            "telefono": user_with_data.persona.telefono,
            "fecha_nacimiento": str(user_with_data.persona.fecha_nacimiento),
            "genero": user_with_data.persona.genero,
            "nacionalidad": user_with_data.persona.nacionalidad,
            "nombre_familia": user_with_data.persona.nombre_familia,
        } if user_with_data.persona else None,
        "roles": [rol.rol for rol in user_with_data.roles]
    }


@auth.post("/refresh", summary="Renovar token de acceso")
async def refresh_token(
    current_user: UsuarioDB = Depends(get_current_user_from_refresh)
):
    try:
        email = current_user.email
        new_access_token = create_access_token(
            data={"sub": email, "user_id": str(current_user.id)}
        )

        logger.info("Token renovado exitosamente para usuario: %s", email)

        return {"access_token": new_access_token, "token_type": "bearer"}

    except JWTError:
        logger.warning("JWTError en refresh token: token invalido o expirado")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado o invalido, inicie sesion",
            headers={"WWW-Authenticate": "Bearer"}
        )

@auth.post("/forgot-password", summary="Solicitar restablecimiento de contraseña")
async def forgot_password(
    datos: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    usuario = db.query(UsuarioDB).filter(UsuarioDB.email == datos.email.lower()).first()

    if not usuario:
        logger.warning("Intento de recovery para email no registrado: %s", datos.email)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El correo electronico no esta registrado."
        )

    reset_token = create_password_reset_token(data={"sub": usuario.email})

    try:
        await send_reset_email(usuario.email, reset_token)
    except Exception as email_error:
        logger.error("Error enviando email de reset: %s", str(email_error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar el correo de restablecimiento"
        )

    logger.info("Token de reset generado y enviado a: %s", usuario.email)

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Se ha enviado un enlace de restablecimiento a tu correo electronico"
        }
    )

@auth.post("/reset-password", summary="Restablecer contraseña con token")
async def reset_password(
    datos: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(datos.token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "password_reset":
            logger.warning("Intento de reset con token de tipo incorrecto: %r", payload.get("type"))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token invalido para restablecimiento de contraseña"
            )

        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token invalido o expirado"
            )

        usuario = db.query(UsuarioDB).filter(UsuarioDB.email == email.lower()).first()
        if not usuario:
            logger.warning("Usuario no encontrado durante reset de contraseña: %s", email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        nuevo_hash = get_password_hash(datos.new_password)
        usuario.password_hash = nuevo_hash

        # Un token de reset es de un solo uso. El id es el "jti" del JWT, unico
        # por token, asi que la primary key bloquea el segundo intento con un
        # error de integridad que traducimos a un 401 limpio, no a un 500.
        jti = payload.get("jti")
        try:
            db.add(UsedTokenDB(
                id=jti,
                user_id=usuario.id,
                proposito="password_reset",
                usado_en=datetime.now(),
            ))
            db.commit()
        except IntegrityError:
            db.rollback()
            logger.warning("Reutilizacion de token de reset rechazada para: %s", email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Este enlace ya fue utilizado. Solicita uno nuevo."
            )

        logger.info("Contraseña restablecida exitosamente para usuario: %s", email)

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Contraseña actualizada correctamente"
            }
        )

    except JWTError:
        logger.warning("JWTError en reset-password: token invalido o expirado")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expirado o invalido"
        )
