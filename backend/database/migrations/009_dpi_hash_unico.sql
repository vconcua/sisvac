-- ============================================================
-- Migración 009: el DPI vuelve a ser único, ahora vía su hash.
-- Ejecutar DESPUÉS de node scripts/cifrar_datos_existentes.js.
-- Si queda algún padre sin dpi_hash, esta migración falla a propósito
-- (significa que el script de cifrado no terminó).
-- ============================================================
ALTER TABLE padres ALTER COLUMN dpi_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS padres_dpi_hash_key ON padres (dpi_hash);
