-- ============================================================
-- Datos iniciales (seed)
-- Catálogo de vacunas basado en el esquema de vacunación vigente (niños y adolescentes)
--
-- Orden de carga recomendado (ver README.md):
--   1) schema.sql
--   2) seed.sql                                          (este archivo)
--   3) migrations/002_agregar_canal_sms.sql
--   4) migrations/003_agregar_telegram_chat_id.sql
--   5) migrations/004_catalogo_departamentos_municipios.sql
--   6) migrations/005_centros_salud.sql
--   7) (opcional) scripts/importar_centros_salud.js con el CSV real del MSPAS
-- ============================================================

INSERT INTO vacunas (nombre, edad_recomendada_meses, dosis_numero, descripcion) VALUES
('BCG', 0, 1, 'Contra la tuberculosis - dosis única al nacer'),
('Hepatitis B', 0, 1, 'Primera dosis al nacer'),
('Pentavalente', 2, 1, 'Difteria, tos ferina, tétanos, Hib, Hepatitis B - 1ra dosis'),
('Pentavalente', 4, 2, '2da dosis'),
('Pentavalente', 6, 3, '3ra dosis'),
('Polio (OPV/IPV)', 2, 1, '1ra dosis'),
('Polio (OPV/IPV)', 4, 2, '2da dosis'),
('Polio (OPV/IPV)', 6, 3, '3ra dosis'),
('Rotavirus', 2, 1, '1ra dosis'),
('Rotavirus', 4, 2, '2da dosis'),
('Neumococo', 2, 1, '1ra dosis'),
('Neumococo', 4, 2, '2da dosis'),
('Neumococo', 12, 3, 'Refuerzo'),
('SPR (Sarampión, Paperas, Rubéola)', 12, 1, '1ra dosis'),
('SPR (Sarampión, Paperas, Rubéola)', 18, 2, 'Refuerzo'),
('DPT Refuerzo', 18, 1, 'Refuerzo difteria, tos ferina, tétanos'),
('Polio Refuerzo', 18, 1, 'Refuerzo');
-- (la migración 016 agrega Influenza, Hepatitis A, Varicela, refuerzos de 4 años, VPH y TDaP)

-- Usuario administrador inicial: NO se inserta aquí porque requiere un
-- hash bcrypt generado en tiempo real. Ver README.md, sección
-- "Crear el primer usuario administrador".
