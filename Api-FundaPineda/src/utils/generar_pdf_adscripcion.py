import logging
import os
import shutil
import subprocess
import sys

from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm  # Para definir el tamaño en milímetros

logger = logging.getLogger("funda_pineda.pdf")


def _convertir_a_pdf(doc_temp: str, salida_pdf: str) -> None:
    """Convierte un .docx a PDF según la plataforma.

    Windows: docx2pdf (requiere MS Word instalado).
    Linux: LibreOffice headless (docx2pdf NO esta soportado en Linux).
    """
    if sys.platform.startswith("win"):
        from docx2pdf import convert

        convert(doc_temp, salida_pdf)
        return

    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if soffice is None:
        raise RuntimeError(
            "LibreOffice no esta instalado. Instalalo con: sudo apt install libreoffice-writer"
        )

    outdir = os.path.dirname(os.path.abspath(salida_pdf))
    os.makedirs(outdir, exist_ok=True)

    resultado = subprocess.run(
        [
            soffice,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            outdir,
            os.path.abspath(doc_temp),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if resultado.returncode != 0:
        detalle = (resultado.stderr or resultado.stdout or "").strip()[-500:]
        logger.error("soffice fallo (rc=%s): %s", resultado.returncode, detalle)
        raise RuntimeError(f"LibreOffice no pudo convertir el documento a PDF: {detalle}")

    # LibreOffice nombra la salida como <nombre_docx>.pdf dentro de outdir,
    # aunque salida_pdf tenga otro nombre o este en otra carpeta.
    pdf_generado = os.path.join(
        outdir, os.path.splitext(os.path.basename(doc_temp))[0] + ".pdf"
    )
    if os.path.abspath(pdf_generado) != os.path.abspath(salida_pdf):
        os.replace(pdf_generado, salida_pdf)


def generar_con_imagen(datos, ruta_imagen, plantilla_path, salida_pdf, doc_temp=None):
    doc = DocxTemplate(plantilla_path)
    
    # 1. Crear el objeto de imagen
    # Puedes ajustar el ancho (width) o el alto (height)
    imagen_obj = InlineImage(doc, ruta_imagen, width=Mm(50), height=Mm(20))  # Ajusta el tamaño según tus necesidades
    
    # 2. Agregar la imagen al diccionario de datos
    datos['firma'] = imagen_obj
    
    # 3. Renderizar y guardar Word
    doc.render(datos)

    if doc_temp is None:
        doc_temp = os.path.join(
            os.path.dirname(plantilla_path), "..", "..", "temp_con_imagen.docx"
        )
    doc_temp = os.path.abspath(doc_temp)
    doc.save(doc_temp)

    # 4. Convertir a PDF
    try:
        _convertir_a_pdf(doc_temp, salida_pdf)
    except Exception as e:
        logger.error("Error al convertir a PDF %s -> %s: %s", doc_temp, salida_pdf, e)
        raise RuntimeError(f"No se pudo convertir el documento a PDF: {e}") from e
    finally:
        if os.path.exists(doc_temp):
            try:
                os.remove(doc_temp)
            except OSError as cleanup_error:
                logger.warning("No se pudo eliminar el temporal %s: %s", doc_temp, cleanup_error)

    if not os.path.isfile(salida_pdf) or os.path.getsize(salida_pdf) == 0:
        logger.error("El PDF no se genero o esta vacio: %s", salida_pdf)
        raise RuntimeError(f"El PDF no fue generado: {salida_pdf}")

    logger.info("Documento generado: %s", salida_pdf)
    return salida_pdf
