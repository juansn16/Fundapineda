import io
import os
import uuid
import base64
from PIL import Image, ImageEnhance, ImageOps
from rembg import remove

def procesar_firma_pesada(contenido_imagen: bytes, temp_dir: str) -> tuple:
    # 1. Cargamos la imagen original con sus colores (convertida a RGBA para transparencia)
    img_original = Image.open(io.BytesIO(contenido_imagen)).convert("RGBA")

    # 2. Creamos una versión de "ayuda" para rembg (la que ya probaste con 160)
    gris = ImageOps.grayscale(img_original)
    potenciador = ImageEnhance.Contrast(gris)
    gris = potenciador.enhance(3.0) 
    
    # Aplicamos tu valor óptimo de 160
    umbral = 160
    mascara_limpia = gris.point(lambda x: 0 if x < umbral else 255, '1')

    # Creamos una imagen temporal blanca y pegamos la firma filtrada
    img_para_rembg = Image.new("RGBA", img_original.size, (255, 255, 255, 255))
    img_para_rembg.paste(img_original, mask=ImageOps.invert(mascara_limpia.convert('L')))

    # 3. Quitamos el fondo usando rembg sobre la imagen pre-limpiada
    resultado_sin_fondo = remove(img_para_rembg)

    # --- EL TRUCO PARA RECUPERAR EL COLOR ---
    # Usamos el canal ALFA (la transparencia) del resultado de rembg 
    # para aplicárselo a la imagen ORIGINAL.
    alfa = resultado_sin_fondo.getchannel('A')
    img_original.putalpha(alfa)
    
    # El resultado final es la imagen original pero con el recorte perfecto de rembg
    resultado_final = img_original

    # 4. Guardado y Preview (como ya lo tenías)
    buffered = io.BytesIO()
    resultado_final.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    preview_url = f"data:image/png;base64,{img_base64}"

    nombre_archivo = f"{uuid.uuid4()}.png"
    ruta_temp = os.path.join(temp_dir, nombre_archivo)
    resultado_final.save(ruta_temp, format="PNG")

    return nombre_archivo, preview_url