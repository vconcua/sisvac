-- ============================================================
-- Migración 011: rol "enfermeria" + avisos automáticos a padres
--
-- 1) Rol enfermeria: puede ingresar niños y padres NUEVOS (y vincularlos
--    entre sí), pero no puede editarlos, eliminarlos ni desvincularlos
--    después. Para que solo pueda vincular lo que ella misma ingresó,
--    cada niño y cada padre guarda quién lo registró (creado_por).
-- 2) Avisos automáticos: cada notificación queda marcada con su tipo
--    (tipo_aviso) y, si es recordatorio, con la vacunación a la que se
--    refiere. Con eso el sistema nunca envía el mismo aviso dos veces.
-- ============================================================

ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'enfermeria';

ALTER TABLE ninios ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE padres ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS tipo_aviso VARCHAR(30);
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS vacunacion_id UUID REFERENCES vacunaciones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notificaciones_vacunacion ON notificaciones(vacunacion_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_alerta_padre ON notificaciones(alerta_id, padre_id);
