-- ============================================================
-- Migración 003: separa el chat_id de Telegram del número de
-- teléfono en la tabla `padres`.
--
-- NOTA: en este proyecto consolidado, schema.sql ya incluye la
-- columna `telegram_chat_id` desde el inicio. Esta migración usa
-- IF NOT EXISTS y es segura de ejecutar de todas formas. Se conserva
-- por si se aplica sobre una base de datos creada con una versión
-- anterior del schema (donde el chat_id se guardaba en `telefono`).
-- ============================================================

ALTER TABLE padres ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

UPDATE padres
SET telegram_chat_id = telefono
WHERE canal_preferido = 'telegram' AND telegram_chat_id IS NULL AND telefono IS NOT NULL;
