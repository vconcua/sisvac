-- ============================================================
-- Migración 010: envío masivo de campañas (sección 3.8 del enunciado)
-- La tabla `campanias` ya existía (título, mensaje y filtros de
-- segmentación); aquí se agrega el seguimiento del envío y se vincula
-- cada notificación enviada con su campaña.
-- Estados: borrador -> enviando -> enviada  (o 'interrumpida' si falla a medias)
-- ============================================================
ALTER TABLE campanias ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'borrador';
ALTER TABLE campanias ADD COLUMN IF NOT EXISTS total_destinatarios INTEGER;
ALTER TABLE campanias ADD COLUMN IF NOT EXISTS total_enviados INTEGER;
ALTER TABLE campanias ADD COLUMN IF NOT EXISTS total_fallidos INTEGER;
ALTER TABLE campanias ADD COLUMN IF NOT EXISTS enviada_en TIMESTAMP;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS campania_id UUID REFERENCES campanias(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notificaciones_campania ON notificaciones(campania_id);
