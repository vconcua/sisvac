-- ============================================================
-- Migración 008: preparar la tabla padres para datos CIFRADOS
-- (requisito de seguridad: cifrado de datos personales)
--
-- Un dato cifrado ocupa más espacio que el original, así que se amplían
-- las columnas a TEXT. Como un DPI cifrado ya no sirve para garantizar
-- unicidad (cada cifrado es distinto), se quita el UNIQUE de `dpi` y se
-- agrega `dpi_hash` (hash determinista) que asumirá ese rol en la 009.
--
-- ORDEN: 008 -> node scripts/cifrar_datos_existentes.js -> 009
-- ============================================================
ALTER TABLE padres ALTER COLUMN dpi TYPE TEXT;
ALTER TABLE padres ALTER COLUMN telefono TYPE TEXT;
ALTER TABLE padres ALTER COLUMN correo TYPE TEXT;
ALTER TABLE padres ALTER COLUMN telegram_chat_id TYPE TEXT;
ALTER TABLE padres DROP CONSTRAINT IF EXISTS padres_dpi_key;
ALTER TABLE padres ADD COLUMN IF NOT EXISTS dpi_hash VARCHAR(64);
