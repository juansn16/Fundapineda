import logging
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from src.models.db_models import VerificationCodeDB

logger = logging.getLogger("funda_pineda.verification")

CODE_TTL_MINUTES = 15
CODE_MAX_ATTEMPTS = 3
MIN_CODE = 100000
MAX_CODE = 999999


def generar_codigo() -> str:
    """Codigo numerico de 6 digitos criptograficamente aleatorio.

    Usamos secrets y no random porque el modulo random es predecible: con una
    semilla conocida (o con las salidas anteriores) se podrian anticipar los
    codigos de otros usuarios.
    """
    return f"{secrets.randbelow(MAX_CODE - MIN_CODE + 1) + MIN_CODE}"


def crear_codigo(db: Session, user_id: str, ttl_minutes: int = CODE_TTL_MINUTES) -> VerificationCodeDB:
    """Reemplaza el codigo vigente del usuario por uno nuevo.

    La columna user_id es unica, asi que se elimina el registro anterior para no
   violar la restriccion.
    """
    existente = (
        db.query(VerificationCodeDB)
        .filter(VerificationCodeDB.user_id == user_id)
        .first()
    )
    if existente:
        db.delete(existente)
        db.flush()

    registro = VerificationCodeDB(
        id=str(uuid.uuid4()),
        user_id=user_id,
        code=generar_codigo(),
        attempts=0,
        max_attempts=CODE_MAX_ATTEMPTS,
        expires_at=datetime.now() + timedelta(minutes=ttl_minutes),
        created_at=datetime.now(),
    )
    db.add(registro)
    db.commit()
    return registro


def revocar_codigo(db: Session, user_id: str) -> None:
    """Borra el codigo del usuario, si existe."""
    existente = (
        db.query(VerificationCodeDB)
        .filter(VerificationCodeDB.user_id == user_id)
        .first()
    )
    if existente:
        db.delete(existente)
        db.commit()
