import json
import os
import uuid
import asyncio
import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status, Request
from fastapi.responses import JSONResponse

from src.utils.security import get_current_user, require_role
from src.models.db_models import UsuarioDB
from src.models.noticia import NoticiaCreate, NoticiaResponse, NoticiaInIndex


# --- Router ---
news = APIRouter(
    prefix="/noticias",
    tags=["noticias"],
    responses={404: {"description": "Not found"}},
)

# Lock for index.json operations
index_lock = asyncio.Lock()


# --- Helper Functions ---
async def read_json_file(file_path: str) -> any:
    """Read JSON file asynchronously."""
    try:
        if not os.path.exists(file_path):
            return None
        def _read():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return await asyncio.to_thread(_read)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parsing JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


async def write_json_file(file_path: str, data: any) -> None:
    """Write JSON file asynchronously."""
    try:
        def _write():
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        await asyncio.to_thread(_write)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing file: {str(e)}")


async def ensure_index_exists(news_dir: str) -> None:
    """Create index.json with empty array if it doesn't exist."""
    index_path = os.path.join(news_dir, "index.json")
    if not os.path.exists(index_path):
        await write_json_file(index_path, [])


async def get_index(news_dir: str) -> list:
    """Get current index.json content."""
    await ensure_index_exists(news_dir)
    index_path = os.path.join(news_dir, "index.json")
    content = await read_json_file(index_path)
    return content if isinstance(content, list) else []


async def update_index(news_dir: str, update_func) -> None:
    """Update index.json with lock protection."""
    async with index_lock:
        index_path = os.path.join(news_dir, "index.json")
        await ensure_index_exists(news_dir)
        current_index = await read_json_file(index_path)
        if not isinstance(current_index, list):
            current_index = []
        updated_index = update_func(current_index)
        await write_json_file(index_path, updated_index)


async def save_image(image: UploadFile, img_dir: str, filename: str) -> str:
    """Save uploaded image as webp."""
    try:
        from PIL import Image
        import io
        
        content = await image.read()
        img = Image.open(io.BytesIO(content))
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode == 'RGBA':
                rgb_img.paste(img, mask=img.split()[-1])
                img = rgb_img
            else:
                img = img.convert('RGB')
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        output_path = os.path.join(img_dir, filename)
        def _save():
            img.save(output_path, 'WEBP', quality=85)
        await asyncio.to_thread(_save)
        
        return f"/static/new/img/{filename}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


# --- Public Endpoints ---
@news.get("/", summary="Listar todas las noticias", response_model=list[NoticiaInIndex])
async def list_noticias(
    request: Request,
    include_image: bool = False
):
    news_dir = request.app.state.NEWS_DIR
    news_img_dir = request.app.state.NEWS_IMG_DIR
    index = await get_index(news_dir)
    
    # If not including images, return index as-is (lightweight)
    if not include_image:
        return index
    
    # If including images, read each image and convert to base64
    import base64
    
    async def add_image_to_item(item):
        if 'url_imagen' not in item:
            return item
        
        # Extract filename from URL
        filename = os.path.basename(item['url_imagen'])
        image_path = os.path.join(news_img_dir, filename)
        
        if not os.path.exists(image_path):
            return item
        
        def read_image():
            with open(image_path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        
        try:
            item['imagen_base64'] = await asyncio.to_thread(read_image)
            item['imagen_media_type'] = 'image/webp'
        except Exception as e:
            print(f"Error reading image {image_path}: {e}")
        
        return item
    
    # Process all items (this will be slow for many items)
    updated_index = []
    for item in index:
        updated_item = await add_image_to_item(item.copy())
        updated_index.append(updated_item)
    
    return updated_index


@news.get("/{noticia_id}", summary="Obtener noticia por ID")
async def get_noticia(
    noticia_id: str, 
    request: Request,
    include_image: bool = False
):
    news_dir = request.app.state.NEWS_DIR
    news_img_dir = request.app.state.NEWS_IMG_DIR
    noticia_path = os.path.join(news_dir, f"{noticia_id}.json")
    
    noticia = await read_json_file(noticia_path)
    if noticia is None:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    
    # Si no pide la imagen, devolver JSON normal
    if not include_image:
        return noticia
    
    # Si pide la imagen, leer y convertir a base64
    url_imagen = noticia.get("url_imagen", "")
    if not url_imagen:
        raise HTTPException(status_code=404, detail="Noticia no tiene imagen asociada")
    
    # Extraer nombre del archivo de la URL
    filename = os.path.basename(url_imagen)  # Ej: "123.webp"
    image_path = os.path.join(news_img_dir, filename)
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Archivo de imagen no encontrado")
    
    # Leer imagen y convertir a base64
    def read_image():
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    image_base64 = await asyncio.to_thread(read_image)
    
    # Agregar al JSON de respuesta
    noticia["imagen_base64"] = image_base64
    noticia["imagen_media_type"] = "image/webp"
    
    return noticia


# --- Protected Endpoints ---
@news.post("/", status_code=201, summary="Crear nueva noticia")
async def create_noticia(
    request: Request,
    titulo: str = Form(...),
    categoria: str = Form(...),
    contenido: str = Form(...),
    resumen: str = Form(...),
    image: UploadFile = File(...),
    current_user: UsuarioDB = Depends(require_role("creador_contenido"))
):
    news_dir = request.app.state.NEWS_DIR
    news_img_dir = request.app.state.NEWS_IMG_DIR
    
    # Validate with Pydantic model
    noticia_create = NoticiaCreate(titulo=titulo, categoria=categoria, contenido=contenido, resumen=resumen)
    
    noticia_id = str(uuid.uuid4())
    fecha = datetime.now().isoformat()
    
    # Save image
    img_filename = f"{noticia_id}.webp"
    url_imagen = await save_image(image, news_img_dir, img_filename)
    
    # Create noticia response with model
    noticia_data = NoticiaResponse(
        id=noticia_id,
        titulo=noticia_create.titulo,
        categoria=noticia_create.categoria,
        contenido=noticia_create.contenido,
        resumen=noticia_create.resumen,
        fecha=fecha,
        url_imagen=url_imagen
    )
    
    noticia_path = os.path.join(news_dir, f"{noticia_id}.json")
    await write_json_file(noticia_path, noticia_data.model_dump())
    
    # Update index - insert at beginning
    def add_to_index(index):
        index.insert(0, NoticiaInIndex(
            id=noticia_id,
            titulo=noticia_create.titulo,
            categoria=noticia_create.categoria,
            fecha=fecha,
            url_imagen=url_imagen
        ).model_dump())
        return index
    
    await update_index(news_dir, add_to_index)
    
    return JSONResponse(status_code=201, content=noticia_data.model_dump())


@news.put("/{noticia_id}", summary="Actualizar noticia")
async def update_noticia(
    noticia_id: str,
    request: Request,
    titulo: str = Form(...),
    categoria: str = Form(...),
    contenido: str = Form(...),
    resumen: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: UsuarioDB = Depends(require_role("creador_contenido"))
):
    news_dir = request.app.state.NEWS_DIR
    news_img_dir = request.app.state.NEWS_IMG_DIR
    
    noticia_path = os.path.join(news_dir, f"{noticia_id}.json")
    
    # Check if noticia exists
    existing = await read_json_file(noticia_path)
    if existing is None:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    
    # Validate with Pydantic model
    noticia_update = NoticiaCreate(titulo=titulo, categoria=categoria, contenido=contenido, resumen=resumen)
    
    fecha = existing.get("fecha", datetime.now().isoformat())
    url_imagen = existing.get("url_imagen", "")
    
    # Update image if provided
    if image:
        img_filename = f"{noticia_id}.webp"
        url_imagen = await save_image(image, news_img_dir, img_filename)
    
    # Update noticia response with model
    noticia_data = NoticiaResponse(
        id=noticia_id,
        titulo=noticia_update.titulo,
        categoria=noticia_update.categoria,
        contenido=noticia_update.contenido,
        resumen=noticia_update.resumen,
        fecha=fecha,
        url_imagen=url_imagen
    )
    
    await write_json_file(noticia_path, noticia_data.model_dump())
    
    # Update index
    def update_in_index(index):
        for i, item in enumerate(index):
            if item.get("id") == noticia_id:
                index[i] = NoticiaInIndex(
                    id=noticia_id,
                    titulo=noticia_update.titulo,
                    categoria=noticia_update.categoria,
                    fecha=fecha,
                    url_imagen=url_imagen
                ).model_dump()
                break
        return index
    
    await update_index(news_dir, update_in_index)
    
    return JSONResponse(status_code=200, content=noticia_data.model_dump())


@news.delete("/{noticia_id}", summary="Eliminar noticia")
async def delete_noticia(
    noticia_id: str,
    request: Request,
    current_user: UsuarioDB = Depends(require_role("creador_contenido"))
):
    news_dir = request.app.state.NEWS_DIR
    news_img_dir = request.app.state.NEWS_IMG_DIR
    
    noticia_path = os.path.join(news_dir, f"{noticia_id}.json")
    img_path = os.path.join(news_img_dir, f"{noticia_id}.webp")
    
    # Check if noticia exists
    if not os.path.exists(noticia_path):
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    
    # Delete noticia file
    def _delete_noticia():
        if os.path.exists(noticia_path):
            os.remove(noticia_path)
    await asyncio.to_thread(_delete_noticia)
    
    # Delete image if exists
    def _delete_image():
        if os.path.exists(img_path):
            os.remove(img_path)
    await asyncio.to_thread(_delete_image)
    
    # Update index - remove entry
    def remove_from_index(index):
        return [item for item in index if item.get("id") != noticia_id]
    
    await update_index(news_dir, remove_from_index)
    
    return JSONResponse(status_code=200, content={"message": "Noticia eliminada correctamente"})
