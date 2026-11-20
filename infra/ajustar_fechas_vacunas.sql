-- Ajusta las dosis marcadas como aplicadas "hoy" para que su fecha de aplicación sea la fecha programada.
-- Solo toca dosis aplicadas hoy cuya fecha programada ya pasó. Úsalo con datos de prueba.
-- Es una aproximación: supone que la dosis se aplicó en la fecha en que le correspondía.
UPDATE vacunaciones
SET fecha_aplicada = fecha_proxima_dosis
WHERE estado = 'aplicada'
  AND fecha_aplicada::date = CURRENT_DATE
  AND fecha_proxima_dosis::date < CURRENT_DATE;
