-- ============================================================
-- Migración 006: campos adicionales en centros_salud
--
-- El filtro de la aplicación usa 6 tipos estándar (Hospital, Centro
-- de Salud, Puesto de Salud, CAP, CAIMI, Farmacia PROAM) para que el
-- desplegable de filtro funcione de forma consistente. Pero muchas
-- fuentes reales (incluyendo listados propios) usan variantes más
-- detalladas ("Centro de Salud Tipo A", "CAP (Atención Permanente)").
--
-- En vez de perder ese detalle, se guarda en `detalle_tipo` mientras
-- `tipo_establecimiento` queda normalizado a una de las 6 categorías
-- para que el filtro siga funcionando.
-- ============================================================

ALTER TABLE centros_salud ADD COLUMN IF NOT EXISTS detalle_tipo VARCHAR(100);
ALTER TABLE centros_salud ADD COLUMN IF NOT EXISTS comunidad_sector VARCHAR(150);
ALTER TABLE centros_salud ADD COLUMN IF NOT EXISTS nivel_atencion VARCHAR(50);
ALTER TABLE centros_salud ADD COLUMN IF NOT EXISTS servicios_principales TEXT;
