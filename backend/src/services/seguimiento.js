const db = require('../config/db');

const DIAS_POR_MES = 30.4375;

function formatearFecha(fecha) {
  if (!fecha) return null;
  const f = new Date(fecha);
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
}

/**
 * Regla de negocio 3.5 del enunciado: alertar cuando un niño "no tiene
 * registros en X meses" (abandono de seguimiento).
 *
 * X sale de la frecuencia pediátrica recomendada (sección 6 del enunciado):
 *   - 0 a 2 años  -> control MENSUAL    -> se alerta tras más de 2 meses sin medir
 *   - 2 a 5 años  -> control TRIMESTRAL -> se alerta tras más de 4 meses sin medir
 * (se le da un mes de gracia a cada frecuencia). Niños de 5 años o más quedan
 * fuera del programa. Si el niño nunca ha sido medido, el conteo parte de su
 * fecha de inscripción.
 *
 * Para no saturar al personal, no se crea una alerta nueva si ya hay una
 * 'sin_seguimiento' sin atender, o una creada en los últimos 30 días.
 *
 * @returns {Promise<Array>} las alertas creadas
 */
async function detectarAbandonoSeguimiento(cliente = db) {
  const { rows } = await cliente.query(`
    WITH base AS (
      SELECT n.id, n.nombre_completo,
             (CURRENT_DATE - n.fecha_nacimiento) / ${DIAS_POR_MES}::numeric AS edad_meses,
             MAX(rc.fecha_medicion) AS ultima_medicion,
             COALESCE(MAX(rc.fecha_medicion), n.creado_en::date) AS referencia
      FROM ninios n
      LEFT JOIN registros_crecimiento rc ON rc.ninio_id = n.id
      WHERE n.activo = TRUE
      GROUP BY n.id
    )
    SELECT b.id, b.nombre_completo, b.edad_meses, b.ultima_medicion,
           CASE WHEN b.edad_meses < 24 THEN 2 ELSE 4 END AS umbral_meses,
           (CURRENT_DATE - b.referencia) / ${DIAS_POR_MES}::numeric AS meses_sin_medir
    FROM base b
    WHERE b.edad_meses < 60
      AND (CURRENT_DATE - b.referencia) > (CASE WHEN b.edad_meses < 24 THEN 2 ELSE 4 END) * ${DIAS_POR_MES}::numeric
      AND NOT EXISTS (
        SELECT 1 FROM alertas a
        WHERE a.ninio_id = b.id AND a.motivo = 'sin_seguimiento'
          AND (a.estado <> 'atendida' OR a.creado_en > now() - interval '30 days')
      )
  `);

  const creadas = [];
  for (const r of rows) {
    const meses = Math.round(Number(r.meses_sin_medir) * 10) / 10;
    const umbral = Number(r.umbral_meses);
    const frecuencia = umbral === 2 ? 'mensual (menores de 2 años)' : 'trimestral (2 a 5 años)';
    const detalle = r.ultima_medicion
      ? `su última medición fue el ${formatearFecha(r.ultima_medicion)}`
      : 'no tiene ninguna medición registrada desde su inscripción';
    const mensaje = `${r.nombre_completo} lleva ${meses} meses sin control de crecimiento (${detalle}). El esquema recomendado es un control ${frecuencia}.`;
    const tipo = Number(r.meses_sin_medir) >= umbral * 2 ? 'critica' : 'preventiva';
    const { rows: nueva } = await cliente.query(
      `INSERT INTO alertas (ninio_id, tipo, motivo, mensaje) VALUES ($1,$2,'sin_seguimiento',$3) RETURNING *`,
      [r.id, tipo, mensaje]
    );
    creadas.push(nueva[0]);
  }
  return creadas;
}

module.exports = { detectarAbandonoSeguimiento };
