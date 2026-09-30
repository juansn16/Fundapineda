from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Table, CheckConstraint, Integer, Text
from datetime import datetime
from sqlalchemy.orm import relationship
from src.conf.database import Base

usuario_roles = Table(
    "usuario_roles",
    Base.metadata,
    Column("usuario_id", String(36), ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
    Column("rol_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

class UbicacionDB(Base):
    __tablename__ = "ubicaciones"

    id = Column(String(36), primary_key=True, index=True)
    pais = Column(String(100), nullable=False)
    estado = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False)
    direccion = Column(Text, nullable=False)

    personas = relationship("PersonaDB", back_populates="ubicacion")

class PersonaDB(Base):
    __tablename__ = "personas"
    
    id = Column(String(36), primary_key=True, index=True) 
    cedula = Column(String(75), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    genero = Column(String(1), nullable=True)
    nacionalidad = Column(String(50), default="Venezolana")
    telefono = Column(String(20), nullable=False)
    nombre_familia = Column(String(100), nullable=False)
    ubicacion_id = Column(String(36), ForeignKey("ubicaciones.id", ondelete="SET NULL"), nullable=True)

    usuario = relationship("UsuarioDB", back_populates="persona", uselist=False)
    adscripciones = relationship("AdscripcionDB", back_populates="jefe_familia")
    ubicacion = relationship("UbicacionDB", back_populates="personas")

class RolDB(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, index=True)
    rol = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)

class VerificationCodeDB(Base):
    __tablename__ = "verification_codes"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True)
    code = Column(String(6), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False)

    user = relationship("UsuarioDB", back_populates="verification_code")

class UsuarioDB(Base):
    __tablename__ = "usuarios"

    id = Column(String(36), primary_key=True, index=True)
    persona_id = Column(String(36), ForeignKey("personas.id", ondelete="CASCADE"), unique=True)
    email = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    activo = Column(Integer, nullable=False, default=1)
    verificado = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.now, nullable=True)

    # Relaciones
    persona = relationship("PersonaDB", back_populates="usuario")
    roles = relationship("RolDB", secondary=usuario_roles)
    verification_code = relationship("VerificationCodeDB", back_populates="user", uselist=False)

class UsedTokenDB(Base):
    """Tokens de un solo uso ya consumidos (hoy solo los de restablecimiento).

    El id es el "jti" del JWT, unico por token, asi que un segundo uso choca
    contra la primary key y la transaccion falla. La tabla se puede purgar de
    forma periodica: las filas cuyo token ya expiro no sirven para nada.
    """
    __tablename__ = "used_tokens"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(36), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    proposito = Column(String(50), nullable=False)
    usado_en = Column(DateTime, nullable=False)

class AdscripcionDB(Base):
    __tablename__ = "adscripciones"

    id = Column(String(36), primary_key=True, index=True)
    jefe_familia_id = Column(String(36), ForeignKey("personas.id"), nullable=False)
    fecha_firma = Column(Date, nullable=False)
    ruta_firma = Column(String(255), nullable=False)
    ruta_documento_final = Column(String(255), nullable=False)
    ip_registro = Column(String(45), nullable=False)

    # Relación para acceder a los datos del jefe desde la adscripción
    jefe_familia = relationship("PersonaDB", back_populates="adscripciones")