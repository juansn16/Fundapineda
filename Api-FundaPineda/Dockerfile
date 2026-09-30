# Usamos una imagen ligera de Python
FROM python:3.11-slim

WORKDIR /app

# Instalamos dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código
COPY . .

# Exponemos el puerto de FastAPI
EXPOSE 8000

# Comando para arrancar (usando proxy-headers para cuando uses Nginx en AWS)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]