"""Repara la doble codificacion UTF-8 (mojibake) en archivos del frontend.

Los archivos fueron guardados con texto UTF-8 que se leyo como Latin-1 y se
re-codifico como UTF-8, de modo que 'o con tilde' quedo como 'Ã³'. La reparacion
es a nivel de bytes para no alterar BOM, CRLF/LF ni el resto del contenido:

    'Ã³' (C3 83 C2 B3)  ->  'ó' (C3 B3)
    'Ã©' (C3 83 C2 A9)  ->  'é' (C3 A9)
    'Ã­' (C3 83 C2 AD)  ->  'í' (C3 AD)
    'Ã±' (C3 83 C2 B1)  ->  'ñ' (C3 B1)
    'Ã¡' (C3 83 C2 A1)  ->  'á' (C3 A1)
    'Ãº' (C3 83 C2 BA)  ->  'ú' (C3 BA)
    'Â¿' (C3 82 C2 BF)  ->  '¿' (C2 BF)
    'â€¢' (C3 A2 E2 82 AC C2 A2) -> '•' (E2 80 A2)
"""
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

REEMPLAZOS = [
    (b"\xc3\x83\xc2\xb3", b"\xc3\xb3", "ó"),   # Ã³
    (b"\xc3\x83\xc2\xa9", b"\xc3\xa9", "é"),   # Ã©
    (b"\xc3\x83\xc2\xad", b"\xc3\xad", "í"),   # Ã\xad
    (b"\xc3\x83\xc2\xb1", b"\xc3\xb1", "ñ"),   # Ã±
    (b"\xc3\x83\xc2\xa1", b"\xc3\xa1", "á"),   # Ã¡
    (b"\xc3\x83\xc2\xba", b"\xc3\xba", "ú"),   # Ãº
    (b"\xc3\x82\xc2\xbf", b"\xc2\xbf", "¿"),   # Â¿
    (b"\xc3\xa2\xe2\x82\xac\xc2\xa2", b"\xe2\x80\xa2", "•"),  # â€¢
]

ARCHIVOS = [
    "src/pages/AboutPage.tsx",
    "src/pages/ContactPage.tsx",
    "src/pages/DoctorsPage.tsx",
    "src/pages/HomePage.tsx",
    "src/pages/LoginPage.tsx",
    "src/pages/MentoresPage.tsx",
    "src/pages/ProgramasPage.tsx",
    "src/pages/ServicesPage.tsx",
]


def main() -> int:
    total = 0
    ok = True
    for rel in ARCHIVOS:
        ruta = BASE / rel
        if not ruta.exists():
            print(f"FALTA {rel}")
            ok = False
            continue
        datos = ruta.read_bytes()
        original = datos
        cambios = 0
        for corrompido, limpio, _nombre in REEMPLAZOS:
            n = datos.count(corrompido)
            if n:
                datos = datos.replace(corrompido, limpio)
                cambios += n
        if datos == original:
            print(f"  {rel}: sin cambios")
            continue
        ruta.write_bytes(datos)
        total += cambios
        # Verificacion: no debe quedar ningun byte corrupto
        restante = sum(
            datos.count(c) for c, _l, _n in REEMPLAZOS
        )
        print(f"  {rel}: {cambios} ocurrencias corregidas"
              + ("" if restante == 0 else f" | AVISO: {restante} sin reparar"))
        if restante:
            ok = False

    print(f"\nTotal de ocurrencias reparadas: {total}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())