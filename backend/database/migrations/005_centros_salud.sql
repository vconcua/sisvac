-- ============================================================
-- Migración 005: catálogo de establecimientos de salud
-- (hospitales, centros de salud, puestos de salud, CAP, CAIMI)
--
-- IMPORTANTE: esta migración crea la TABLA VACÍA. A diferencia del
-- catálogo de departamentos/municipios, NO se incluyen datos
-- precargados de centros de salud reales, porque:
--   1) Es una lista de miles de establecimientos que cambia con
--      frecuencia (aperturas, cierres, cambios de dirección).
--   2) El propio Ministerio de Salud (MSPAS) marca su directorio
--      público como "datos en proceso de integración" — ni la fuente
--      oficial lo tiene completo y estable en este momento.
--   3) No existe una API pública estable para descargarlo automáticamente.
--
-- Para llenar esta tabla con datos reales, descarga el CSV oficial
-- desde https://establecimientosdesalud.mspas.gob.gt (tiene botón de
-- exportar a Excel/CSV/PDF con filtros por departamento, municipio y
-- tipo de establecimiento) y usa el script
-- backend/scripts/importar_centros_salud.js — ver el README de esa
-- carpeta para instrucciones detalladas.
-- ============================================================

CREATE TABLE IF NOT EXISTS centros_salud (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo_establecimiento VARCHAR(50), -- Hospital, Centro de Salud, Puesto de Salud, CAP, CAIMI, Farmacia PROAM
    departamento_id INTEGER REFERENCES departamentos(id),
    municipio_id INTEGER REFERENCES municipios(id),
    direccion TEXT,
    telefono VARCHAR(30),
    latitud NUMERIC(9,6),
    longitud NUMERIC(9,6),
    fuente VARCHAR(150) DEFAULT 'MSPAS - establecimientosdesalud.mspas.gob.gt',
    actualizado_en TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_centros_salud_departamento ON centros_salud(departamento_id);
CREATE INDEX IF NOT EXISTS idx_centros_salud_municipio ON centros_salud(municipio_id);

-- Vincula cada comunidad con el centro de salud que la atiende
-- (opcional; se deja nullable porque puede llenarse después de
-- importar el directorio real).
ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS centro_salud_id INTEGER REFERENCES centros_salud(id);
