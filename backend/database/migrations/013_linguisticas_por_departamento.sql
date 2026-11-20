-- ============================================================
-- Migración 013: en qué departamentos se habla cada comunidad lingüística
-- (relación muchos-a-muchos). Referencia general basada en la distribución
-- lingüística de Guatemala; conviene contrastarla con la ALMG si se cita
-- como fuente. El castellano se asocia a los 22 departamentos.
-- Requiere las migraciones 004 (departamentos) y 012 (comunidades lingüísticas).
-- ============================================================
CREATE TABLE IF NOT EXISTS comunidad_linguistica_departamento (
  comunidad_linguistica_id INTEGER NOT NULL REFERENCES comunidades_linguisticas(id) ON DELETE CASCADE,
  departamento_id INTEGER NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  PRIMARY KEY (comunidad_linguistica_id, departamento_id)
);

INSERT INTO comunidad_linguistica_departamento (comunidad_linguistica_id, departamento_id)
SELECT cl.id, d.id
FROM (VALUES
  ('Achi''', 'Baja Verapaz'),
  ('Akateko', 'Huehuetenango'),
  ('Awakateko', 'Huehuetenango'),
  ('Chalchiteko', 'Huehuetenango'),
  ('Ch''orti''', 'Chiquimula'),
  ('Chuj', 'Huehuetenango'),
  ('Itza''', 'Petén'),
  ('Ixil', 'Quiché'),
  ('Popti'' (Jakalteko)', 'Huehuetenango'),
  ('K''iche''', 'Quiché'),
  ('K''iche''', 'Totonicapán'),
  ('K''iche''', 'Quetzaltenango'),
  ('K''iche''', 'Sololá'),
  ('K''iche''', 'Suchitepéquez'),
  ('K''iche''', 'Retalhuleu'),
  ('Kaqchikel', 'Chimaltenango'),
  ('Kaqchikel', 'Sacatepéquez'),
  ('Kaqchikel', 'Sololá'),
  ('Kaqchikel', 'Guatemala'),
  ('Kaqchikel', 'Escuintla'),
  ('Mam', 'Huehuetenango'),
  ('Mam', 'San Marcos'),
  ('Mam', 'Quetzaltenango'),
  ('Mam', 'Retalhuleu'),
  ('Mopan', 'Petén'),
  ('Poqomam', 'Guatemala'),
  ('Poqomam', 'Jalapa'),
  ('Poqomam', 'Escuintla'),
  ('Poqomchi''', 'Alta Verapaz'),
  ('Poqomchi''', 'Baja Verapaz'),
  ('Q''anjob''al', 'Huehuetenango'),
  ('Q''eqchi''', 'Alta Verapaz'),
  ('Q''eqchi''', 'Izabal'),
  ('Q''eqchi''', 'Petén'),
  ('Q''eqchi''', 'Quiché'),
  ('Q''eqchi''', 'Baja Verapaz'),
  ('Sakapulteko', 'Quiché'),
  ('Sipakapense', 'San Marcos'),
  ('Tektiteko', 'Huehuetenango'),
  ('Tz''utujil', 'Sololá'),
  ('Uspanteko', 'Quiché'),
  ('Garífuna', 'Izabal'),
  ('Xinka', 'Santa Rosa'),
  ('Xinka', 'Jutiapa'),
  ('Xinka', 'Jalapa')
) AS v(idioma, depto)
JOIN comunidades_linguisticas cl ON cl.nombre = v.idioma
JOIN departamentos d ON d.nombre = v.depto
ON CONFLICT DO NOTHING;

-- Castellano: todo el país
INSERT INTO comunidad_linguistica_departamento (comunidad_linguistica_id, departamento_id)
SELECT cl.id, d.id FROM comunidades_linguisticas cl CROSS JOIN departamentos d WHERE cl.nombre = 'Castellano'
ON CONFLICT DO NOTHING;
