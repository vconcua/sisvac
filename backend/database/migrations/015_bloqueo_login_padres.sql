-- Bloqueo del inicio de sesión de padres (DPI + PIN) tras intentos fallidos. Seguro de ejecutar varias veces.
ALTER TABLE padres ADD COLUMN IF NOT EXISTS login_intentos_fallidos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE padres ADD COLUMN IF NOT EXISTS login_bloqueado_hasta TIMESTAMPTZ;
