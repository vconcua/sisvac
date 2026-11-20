-- Carnet digital con QR: código único por niño, PIN siempre presente y bloqueo por intentos fallidos.
-- Es seguro ejecutarla varias veces.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Todo niño debe tener PIN (los registrados antes sin PIN reciben uno)
UPDATE ninios SET qr_pin = lpad((floor(random() * 900000) + 100000)::int::text, 6, '0') WHERE qr_pin IS NULL;

-- 2) El código QR no se puede repetir entre niños
CREATE UNIQUE INDEX IF NOT EXISTS ux_ninios_qr_codigo ON ninios(qr_codigo);

-- 3) Protección contra adivinar el PIN
ALTER TABLE ninios ADD COLUMN IF NOT EXISTS qr_intentos_fallidos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ninios ADD COLUMN IF NOT EXISTS qr_bloqueado_hasta TIMESTAMPTZ;
