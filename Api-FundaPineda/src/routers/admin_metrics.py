import logging
from collections import Counter
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.conf.database import get_db
from src.models.db_models import PersonaDB, AdscripcionDB, UsuarioDB, RolDB
from src.utils.security import require_role

logger = logging.getLogger("funda_pineda.admin_metrics")

admin_metrics = APIRouter(
    prefix="/admin/metrics",
    tags=["admin-metrics"],
    responses={404: {"description": "Not found"}},
)

RANGOS_EDAD = [
    ("0-17", lambda a: 0 <= a <= 17),
    ("18-29", lambda a: 18 <= a <= 29),
    ("30-44", lambda a: 30 <= a <= 44),
    ("45-59", lambda a: 45 <= a <= 59),
    ("60 y más", lambda a: a >= 60),
]


def _rango_edad(fecha_nacimiento) -> str:
    if not fecha_nacimiento:
        return "Sin dato"
    edad = (date.today() - fecha_nacimiento).days // 365
    for etiqueta, condicion in RANGOS_EDAD:
        if condicion(edad):
            return etiqueta
    return "Sin dato"


def _agrupar_por_mes(fechas) -> list:
    contador = Counter()
    for f in fechas:
        if f is None:
            continue
        contador[f[:7]] += 1
    return [
        {"mes": mes, "count": total} for mes, total in sorted(contador.items())
    ]


def _agrupar_diario(fechas) -> list:
    contador = Counter()
    for f in fechas:
        if f is None:
            continue
        contador[f.strftime("%Y-%m-%d")] += 1
    return [
        {"fecha": fecha, "count": total} for fecha, total in sorted(contador.items())
    ]


def _agrupar_semanal(fechas) -> list:
    """Agrupa por semana ISO (lunes como inicio de semana)."""
    contador = Counter()
    for f in fechas:
        if f is None:
            continue
        lunes = f - timedelta(days=f.weekday())
        contador[lunes.strftime("%Y-%m-%d")] += 1
    return [
        {"semana": semana, "count": total} for semana, total in sorted(contador.items())
    ]


@admin_metrics.get("", summary="Métricas de los registros de usuarios")
async def get_metrics(
    db: Session = Depends(get_db),
    current_user: UsuarioDB = Depends(require_role("administrador")),
):
    adscritos = db.query(PersonaDB).join(
        AdscripcionDB, AdscripcionDB.jefe_familia_id == PersonaDB.id
    ).all()

    total_personas = len(adscritos)
    total_usuarios = db.query(UsuarioDB).count()
    total_adscripciones = db.query(AdscripcionDB).count()
    total_familias = len({p.nombre_familia for p in adscritos if p.nombre_familia})
    verificados = db.query(UsuarioDB).filter(UsuarioDB.verificado == 1).count()
    pendientes = total_usuarios - verificados
    activos = db.query(UsuarioDB).filter(UsuarioDB.activo == 1).count()

    nacionalidades = Counter(
        (p.nacionalidad or "Sin especificar") for p in adscritos
    )
    edades = Counter(_rango_edad(p.fecha_nacimiento) for p in adscritos)
    orden_edades = {etiqueta for etiqueta, _ in RANGOS_EDAD}
    edades_lista = sorted(
        ({"rango": rango, "count": total} for rango, total in edades.items()),
        key=lambda item: 0 if item["rango"] in orden_edades else 1,
    )

    fechas_firma = [
        a.fecha_firma for a in db.query(AdscripcionDB.fecha_firma).all()
    ]
    fechas_created = [
        u.created_at for u in db.query(UsuarioDB.created_at).all()
    ]

    return {
        "totales": {
            "personas_registradas": total_personas,
            "usuarios": total_usuarios,
            "adscripciones": total_adscripciones,
            "familias": total_familias,
            "verificados": verificados,
            "pendientes": pendientes,
            "activos": activos,
        },
        "nacionalidades": sorted(
            ({"nacionalidad": n, "count": total} for n, total in nacionalidades.items()),
            key=lambda item: item["count"],
            reverse=True,
        ),
        "edades": edades_lista,
        "registros_serie": {
            "diario": _agrupar_diario(fechas_firma),
            "semanal": _agrupar_semanal(fechas_firma),
            "mensual": _agrupar_por_mes([f.strftime("%Y-%m") if f else None for f in fechas_firma]),
        },
        "usuarios_mensual": _agrupar_por_mes(
            [f.strftime("%Y-%m") if f else None for f in fechas_created]
        ),
    }