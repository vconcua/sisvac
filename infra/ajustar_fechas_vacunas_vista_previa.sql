-- VISTA PREVIA (no modifica nada): dosis marcadas como aplicadas "hoy" cuya fecha programada ya pasó.
SELECT n.nombre_completo AS nino, v.nombre AS vacuna, v.dosis_numero AS dosis,
       vc.fecha_proxima_dosis::date AS fecha_programada,
       vc.fecha_aplicada::date AS aplicada_actual,
       vc.fecha_proxima_dosis::date AS aplicada_nueva
FROM vacunaciones vc
JOIN vacunas v ON v.id = vc.vacuna_id
JOIN ninios n ON n.id = vc.ninio_id
WHERE vc.estado = 'aplicada'
  AND vc.fecha_aplicada::date = CURRENT_DATE
  AND vc.fecha_proxima_dosis::date <> CURRENT_DATE
  AND vc.fecha_proxima_dosis::date < CURRENT_DATE
ORDER BY n.nombre_completo, v.edad_recomendada_meses, v.dosis_numero;
