import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "true").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "false").lower() == "true",
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "FundaPineda"),
    TEMPLATE_FOLDER=None,
)

fm = FastMail(conf)

async def send_verification_email(email: str, code: str):
    message = MessageSchema(
        subject="Verifica tu cuenta - FundaPineda",
        recipients=[email],
        body=(
            f"Hola,\n\n"
            f"Tu código de verificación es: {code}\n\n"
            f"Este código expira en 15 minutos.\n"
            f"Si no solicitaste este código, ignora este mensaje.\n\n"
            f"Saludos,\n"
            f"Equipo FundaPineda"
        ),
        subtype="plain",
    )
    
    await fm.send_message(message)

async def send_reset_email(email: str, token: str):
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_link = f"{base_url}/reset-password?token={token}"
    
    message = MessageSchema(
        subject="Restablecimiento de contraseña - FundaPineda",
        recipients=[email],
        body=(
            f"Hola,\n\n"
            f"Has solicitado restablecer tu contraseña.\n"
            f"Haz clic en el siguiente enlace para crear una nueva contraseña:\n\n"
            f"{reset_link}\n\n"
            f"Este enlace expira en 15 minutos.\n"
            f"Si no solicitaste este cambio, ignora este mensaje.\n\n"
            f"Saludos,\n"
            f"Equipo FundaPineda"
        ),
        subtype="plain",
    )
    
    await fm.send_message(message)

async def send_contact_notification(nombre: str, email: str, telefono: str, mensaje: str):
    to_email = os.getenv("CONTACT_NOTIFICATION_EMAIL", "contacto@fundacionpineda.org")
    message = MessageSchema(
        subject=f"Nuevo mensaje de contacto - {nombre}",
        recipients=[to_email],
        body=(
            f"Nuevo mensaje de contacto\n\n"
            f"Nombre: {nombre}\n"
            f"Email: {email}\n"
            f"Teléfono: {telefono or 'No indicado'}\n"
            f"Mensaje:\n{mensaje}\n"
        ),
        subtype="plain",
    )

    await fm.send_message(message)
