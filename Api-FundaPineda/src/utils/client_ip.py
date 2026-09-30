import ipaddress
import logging
import os

from fastapi import Request

logger = logging.getLogger("funda_pineda.client_ip")

# Tamaño máximo de la columna ip_registro en la base de datos.
MAX_IP_LENGTH = 45


def _trusted_proxies() -> set[str]:
    raw = os.getenv("TRUSTED_PROXIES", "").strip()
    if not raw:
        return set()
    return {item.strip() for item in raw.split(",") if item.strip()}


def _normalize(value: str) -> str | None:
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        parsed = ipaddress.ip_address(candidate)
    except ValueError:
        return None
    # ::ffff:127.0.0.1 es un IPv4 mapeado en IPv6; guardamos el IPv4 plano.
    mapped = getattr(parsed, "ipv4_mapped", None)
    return str(mapped) if mapped else str(parsed)


def _is_trusted(host: str) -> bool:
    normalized = _normalize(host)
    return normalized is not None and normalized in _trusted_proxies()


def get_client_ip(request: Request) -> str:
    """Resuelve la IP real del cliente.

    Solo se leen las cabeceras X-Forwarded-For / X-Real-IP cuando la conexión
    inmediata (peer) pertenece a TRUSTED_PROXIES. Sin esa lista, se devuelve
    siempre el peer directo, que es el único valor que no puede ser falsificado
    por el cliente.
    """
    peer = request.client.host if request.client else ""

    if _is_trusted(peer):
        forwarded = request.headers.get("x-forwarded-for", "")
        candidates = [part for part in forwarded.split(",") if part.strip()]
        candidates.append(request.headers.get("x-real-ip", ""))

        for candidate in candidates:
            resolved = _normalize(candidate)
            if resolved and not _is_trusted(resolved):
                return resolved[:MAX_IP_LENGTH]

    resolved_peer = _normalize(peer)
    if resolved_peer:
        return resolved_peer[:MAX_IP_LENGTH]

    logger.warning("No se pudo resolver la IP del cliente para %s", request.url.path)
    return "desconocida"[:MAX_IP_LENGTH]
