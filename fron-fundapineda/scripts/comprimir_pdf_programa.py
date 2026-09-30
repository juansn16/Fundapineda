"""
Comprime el PDF del programa re-encodificando las imagenes a JPEG y
reagrupando los diccionarios en object streams.

El PDF de 614 paginas pesa 31,5 MB: ~26 MB son sus 222 imagenes embebidas y el
resto son diccionarios de recursos repetidos por pagina. Con pikepdf (qpdf) se
logran las dos cosas a la vez:

  * las imagenes se re-encodifican a JPEG (misma proporcion, dimension maxima
    configurable, calidad ajustable) conservando el texto extraible;
  * los diccionarios vuelven a empaquetarse en object streams (el formato
    original del archivo, que PyMuPDF pierde al guardar).

Uso:
    python scripts/comprimir_pdf_programa.py [max_dim_px] [calidad_jpg]
"""
import io
import sys
from pathlib import Path

import pikepdf
from pikepdf import PdfImage
from PIL import Image

BASE = Path(__file__).resolve().parent.parent
ORIGINAL = BASE / "private" / "docs" / "Programa_COMPLETO.pdf"
DESTINO = BASE / "public" / "Programa_PAAIS.pdf"
TMP = BASE / "public" / "Programa_PAAIS_tmp.pdf"


def tamano(n: int) -> str:
    return f"{n / 1048576:.1f} MB"


def main() -> int:
    max_dim = int(sys.argv[1]) if len(sys.argv) > 1 else 1400
    calidad = int(sys.argv[2]) if len(sys.argv) > 2 else 70

    origen = ORIGINAL if ORIGINAL.exists() else DESTINO
    if not origen.exists():
        print(f"No se encontro el PDF en {ORIGINAL}")
        return 1

    orig_size = origen.stat().st_size
    pdf = pikepdf.open(origen, allow_overwriting_input=True)
    print(f"Origen: {origen.name} ({tamano(orig_size)}), {len(pdf.pages)} paginas")

    stream_imgs = [
        o
        for o in pdf.objects
        if isinstance(o, pikepdf.Stream)
        and o.get("/Subtype") == pikepdf.Name.Image
    ]
    print(f"Imagenes embebidas: {len(stream_imgs)}")

    reenc = reduccion = sin_cambio = 0
    for obj in stream_imgs:
        try:
            pil_img = PdfImage(obj).as_pil_image()
        except Exception:
            sin_cambio += 1
            continue

        antes = len(obj.read_raw_bytes())
        w, h = pil_img.size
        if w > max_dim or h > max_dim:
            f = max_dim / max(w, h)
            pil_img = pil_img.resize((int(w * f), int(h * f)), Image.LANCZOS)

        if pil_img.mode in ("RGBA", "P", "LA", "PA"):
            fondo = Image.new("RGB", pil_img.size, (255, 255, 255))
            if pil_img.mode == "P":
                pil_img = pil_img.convert("RGBA")
            fondo.paste(pil_img, mask=pil_img.split()[-1])
            pil_jpg = fondo
        else:
            pil_jpg = pil_img.convert("RGB")

        buf = io.BytesIO()
        pil_jpg.save(buf, format="JPEG", quality=calidad, optimize=True)
        nuevo_bytes = buf.getvalue()
        nw, nh = pil_jpg.size

        if len(nuevo_bytes) >= antes:
            sin_cambio += 1
            continue

        obj["/Filter"] = pikepdf.Name.DCTDecode
        obj["/ColorSpace"] = pikepdf.Name.DeviceRGB
        if "/SMask" in obj:
            del obj["/SMask"]
        obj["/Width"] = nw
        obj["/Height"] = nh
        obj.write(nuevo_bytes)
        reenc += 1
        reduccion += antes - len(nuevo_bytes)

    pdf.save(
        TMP,
        object_stream_mode=pikepdf.ObjectStreamMode.generate,
        compress_streams=True,
        recompress_flate=False,
    )
    pdf.close()

    nuevo_size = TMP.stat().st_size
    print(f"\nReencodificadas: {reenc} ({reduccion / 1048576:.1f} MB de imagenes)")
    print(f"Sin cambio: {sin_cambio}")
    print(
        f"Comprimido: {tamano(nuevo_size)} "
        f"(era {tamano(orig_size)}, -{100 * (1 - nuevo_size / orig_size):.0f}%)"
    )

    verif = pikepdf.open(TMP)
    paginas = len(verif.pages)
    texto = 0
    palabra = verif_obj = None
    verif.close()

    # Comprobacion del texto extraible usando el texto original como referencia.
    import fitz

    orig = fitz.open(origen)
    texto_orig = sum(len(orig[i].get_text().strip()) for i in range(orig.page_count))
    orig.close()
    nuevo = fitz.open(TMP)
    texto = sum(len(nuevo[i].get_text().strip()) for i in range(nuevo.page_count))
    nuevo.close()

    print(f"Paginas: {paginas}")
    print(f"Texto extraible: {texto} chars vs original {texto_orig}")
    if paginas != 614 or abs(texto - texto_orig) > texto_orig * 0.01:
        print("AVISO: el resultado cambio demasiado, revisar antes de reemplazar.")
        return 2

    DESTINO.unlink(missing_ok=True)
    TMP.replace(DESTINO)
    print(f"\nOK: reemplazado {DESTINO.name} ({tamano(DESTINO.stat().st_size)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())