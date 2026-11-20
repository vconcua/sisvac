-- ============================================================
-- Migración 002: agrega el canal 'sms' (enviado vía Amazon SNS)
-- al enum de notificaciones.
--
-- NOTA: en este proyecto consolidado, schema.sql ya crea el enum
-- canal_notificacion incluyendo 'sms' desde el inicio. Esta migración
-- usa IF NOT EXISTS y por lo tanto es segura de ejecutar de todas
-- formas (no falla, simplemente no hace nada si 'sms' ya existe).
-- Se conserva por si este catálogo de migraciones se aplica sobre
-- una base de datos creada con una versión anterior del schema.
-- ============================================================

ALTER TYPE canal_notificacion ADD VALUE IF NOT EXISTS 'sms';
