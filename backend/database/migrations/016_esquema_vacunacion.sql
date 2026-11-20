-- Catálogo de vacunación según el esquema de vacunación vigente (niños y adolescentes).
-- Seguro de ejecutar varias veces: solo agrega dosis que faltan (por nombre + número de dosis).
-- No modifica ni borra dosis ya aplicadas.
INSERT INTO vacunas (nombre, edad_recomendada_meses, dosis_numero, descripcion)
SELECT n, e, d, t FROM (VALUES
  ('Influenza estacional', 6, 1, '1ra dosis a partir de los 6 meses; luego 1 dosis anual'),
  ('Influenza estacional', 7, 2, '2da dosis un mes después de la 1ra; luego 1 dosis anual'),
  ('Hepatitis A', 15, 1, '1ra dosis'),
  ('Hepatitis A', 21, 2, '2da dosis, 6 meses después de la 1ra'),
  ('Varicela', 15, 1, '1ra dosis'),
  ('Varicela', 48, 2, '2da dosis'),
  ('DPT Refuerzo', 48, 2, '2do refuerzo difteria, tos ferina, tétanos'),
  ('Polio Refuerzo', 48, 2, '2do refuerzo'),
  ('VPH', 108, 1, 'Niñas y niños a partir de los 9 años - 1ra dosis'),
  ('VPH', 110, 2, '2 meses después de la 1ra dosis'),
  ('VPH', 114, 3, '4 meses después de la 2da dosis'),
  ('TDaP', 120, 1, '3er refuerzo, a partir de los 10 años')
) AS v(n, e, d, t)
WHERE NOT EXISTS (SELECT 1 FROM vacunas x WHERE x.nombre = v.n AND x.dosis_numero = v.d);

-- Descripciones de las dosis que ya existían, alineadas al esquema.
UPDATE vacunas SET descripcion = '1er refuerzo difteria, tos ferina, tétanos' WHERE nombre = 'DPT Refuerzo' AND dosis_numero = 1;
UPDATE vacunas SET descripcion = '1er refuerzo' WHERE nombre = 'Polio Refuerzo' AND dosis_numero = 1;

-- Niños que ya tienen esquema: se les agregan como pendientes las dosis nuevas.
INSERT INTO vacunaciones (ninio_id, vacuna_id, fecha_proxima_dosis, estado)
SELECT n.id, v.id, (n.fecha_nacimiento + (v.edad_recomendada_meses || ' months')::interval)::date, 'pendiente'
FROM ninios n CROSS JOIN vacunas v
WHERE EXISTS (SELECT 1 FROM vacunaciones x WHERE x.ninio_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM vacunaciones y WHERE y.ninio_id = n.id AND y.vacuna_id = v.id);
