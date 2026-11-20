-- ============================================================
-- Migración 012: catálogo de las 25 comunidades lingüísticas de Guatemala
-- (22 mayas + garífuna + xinka + castellano; Academia de las Lenguas Mayas
-- de Guatemala y Ley de Idiomas Nacionales).
-- Se puede asignar a cada comunidad (idioma predominante) y a cada padre
-- de familia (idioma en que prefiere ser atendido). Ambos campos son opcionales.
-- ============================================================
CREATE TABLE IF NOT EXISTS comunidades_linguisticas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  pueblo VARCHAR(20) NOT NULL
);

INSERT INTO comunidades_linguisticas (nombre, pueblo) VALUES
  ('Achi''', 'Maya'), ('Akateko', 'Maya'), ('Awakateko', 'Maya'), ('Chalchiteko', 'Maya'),
  ('Ch''orti''', 'Maya'), ('Chuj', 'Maya'), ('Itza''', 'Maya'), ('Ixil', 'Maya'),
  ('Popti'' (Jakalteko)', 'Maya'), ('K''iche''', 'Maya'), ('Kaqchikel', 'Maya'), ('Mam', 'Maya'),
  ('Mopan', 'Maya'), ('Poqomam', 'Maya'), ('Poqomchi''', 'Maya'), ('Q''anjob''al', 'Maya'),
  ('Q''eqchi''', 'Maya'), ('Sakapulteko', 'Maya'), ('Sipakapense', 'Maya'), ('Tektiteko', 'Maya'),
  ('Tz''utujil', 'Maya'), ('Uspanteko', 'Maya'),
  ('Garífuna', 'Garífuna'), ('Xinka', 'Xinka'), ('Castellano', 'Ladino')
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE comunidades ADD COLUMN IF NOT EXISTS comunidad_linguistica_id INTEGER REFERENCES comunidades_linguisticas(id) ON DELETE SET NULL;
ALTER TABLE padres ADD COLUMN IF NOT EXISTS comunidad_linguistica_id INTEGER REFERENCES comunidades_linguisticas(id) ON DELETE SET NULL;
