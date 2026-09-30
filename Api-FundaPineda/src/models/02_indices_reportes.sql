-- =============================================================
-- Migración 02: Índices de apoyo para el módulo de Reportes
-- Base: funda_pineda_db  (MySQL / MariaDB)
-- Aplicar en producción:  mysql -u <user> -p <funda_pineda_db> < 02_indices_reportes.sql
-- =============================================================

-- Filtros frecuentes sobre personas
CREATE INDEX idx_personas_genero ON personas (genero);
CREATE INDEX idx_personas_nacionalidad ON personas (nacionalidad);
CREATE INDEX idx_personas_fecha_nacimiento ON personas (fecha_nacimiento);

-- Ordenación por fecha de firma y joins adscripciones->personas
CREATE INDEX idx_adscripciones_fecha_firma ON adscripciones (fecha_firma);

-- Filtro de estado de usuario
CREATE INDEX idx_usuarios_activo ON usuarios (activo);