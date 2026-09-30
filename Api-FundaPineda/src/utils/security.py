import bcrypt
import os
import logging
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, selectinload
from src.conf.database import get_db
from src.models.db_models import UsuarioDB

load_dotenv()

logger = logging.getLogger("funda_pineda.security")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "tu_super_llave_secreta_generada_con_openssl":
    raise ValueError("SECRET_KEY no esta configurada correctamente en .env")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# bcrypt trunca silenciosamente a 72 bytes. Si hashearamos el hash truncado pero
# verificaramos la cadena completa, toda contrasena de mas de 72 bytes fallaria
# al iniciar sesion. Ambos lados deben usar exactamente el mismo recorte.
BCRYPT_MAX_BYTES = 72

def _bcrypt_bytes(password: str) -> bytes:
    return password.encode('utf-8')[:BCRYPT_MAX_BYTES]

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(_bcrypt_bytes(password), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(_bcrypt_bytes(plain_password), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    ahora_utc = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = ahora_utc + expires_delta
    else:
        expire = ahora_utc + timedelta(minutes=15)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    ahora_utc = datetime.now(timezone.utc)
    expires = ahora_utc + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = data.copy()
    to_encode.update({"exp": expires, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_password_reset_token(data: dict, expires_minutes: int = 15):
    """Token de un solo uso para restablecer la contrasena.

    Lleva type="password_reset", no "access". get_current_user rechaza todo lo
    que no sea "access", asi que este token no abre ninguna ruta protegida: solo
    sirve para /auth/reset-password.
    """
    ahora_utc = datetime.now(timezone.utc)
    to_encode = data.copy()
    to_encode.update({
        "exp": ahora_utc + timedelta(minutes=expires_minutes),
        "type": "password_reset",
        "jti": os.urandom(16).hex(),
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la identidad del usuario",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        token_type = payload.get("type")
        if token_type != "access":
            logger.warning("Intento de uso de token no-access para ruta protegida")
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
    except JWTError:
        logger.warning("JWTError al decodificar token: token invalido o expirado")
        raise credentials_exception

    user = db.query(UsuarioDB).filter(UsuarioDB.email == email).first()
    
    if user is None:
        logger.warning("Usuario no encontrado en DB para email: %s", email)
        raise credentials_exception
        
    return user

async def get_current_user_from_refresh(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la identidad del usuario",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        token_type = payload.get("type")
        if token_type != "refresh":
            logger.warning("Intento de uso de token no-refresh para ruta de refresh")
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
    except JWTError:
        logger.warning("JWTError al decodificar token refresh: token invalido o expirado")
        raise credentials_exception

    user = db.query(UsuarioDB).filter(UsuarioDB.email == email).first()
    
    if user is None:
        logger.warning("Usuario no encontrado en DB para email: %s", email)
        raise credentials_exception
        
    return user

async def get_current_active_user(
    current_user: UsuarioDB = Depends(get_current_user)
):
    return current_user

def require_role(*required_roles: str):
    async def role_checker(
        current_user: UsuarioDB = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Re-consultar usuario con roles explícitamente cargados
        user = (
            db.query(UsuarioDB)
            .options(selectinload(UsuarioDB.roles))
            .filter(UsuarioDB.id == current_user.id)
            .first()
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )
        
        user_roles = [rol.rol for rol in user.roles]
        
        if not any(role in user_roles for role in required_roles):
            logger.warning(
                "Usuario %s sin permisos. Roles requeridos: %s. Roles actuales: %s",
                user.email,
                required_roles,
                user_roles
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para acceder a este recurso"
            )
        return user
    
    return role_checker
