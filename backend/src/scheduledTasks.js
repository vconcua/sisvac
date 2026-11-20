/**
 * Tareas programadas para AWS Lambda (invocadas por EventBridge).
 * Sustituyen a los cron de src/server.js, que solo funcionan en servidores
 * de larga duración.
 */
const db = require('./config/db');
const { publicarAlertaCritica } = require('./utils/snsPublisher');
const { detectarAbandonoSeguimiento } = require('./services/seguimiento');
const { ejecutarAvisosAutomaticos } = require('./services/avisosAutomaticos');

exports.handler = async () => {
  try {
    const { rows } = await db.query(
      `UPDATE vacunaciones SET estado='atrasada'
       WHERE estado='pendiente' AND fecha_proxima_dosis < CURRENT_DATE
       RETURNING ninio_id, vacuna_id`
    );
    for (const registro of rows) {
      await db.query(
        `INSERT INTO alertas (ninio_id, tipo, motivo, mensaje)
         VALUES ($1, 'preventiva', 'vacuna_atrasada', 'El niño tiene una dosis de vacunación pendiente y atrasada.')`,
        [registro.ninio_id]
      );
    }
    console.log(`[LAMBDA CRON] ${rows.length} vacunaciones marcadas como atrasadas`);
    if (rows.length > 0) {
      await publicarAlertaCritica('Vacunas atrasadas detectadas',
        `Se detectaron ${rows.length} dosis de vacunación atrasadas en la revisión automática de hoy.`);
    }
    return { statusCode: 200, body: JSON.stringify({ actualizadas: rows.length }) };
  } catch (error) {
    console.error('[LAMBDA CRON] Error al actualizar vacunaciones atrasadas', error);
    throw error;
  }
};

/** Alerta por abandono de seguimiento (programar 1 vez al día en EventBridge) */
exports.abandonoHandler = async () => {
  const creadas = await detectarAbandonoSeguimiento();
  console.log(`[LAMBDA CRON] ${creadas.length} alertas por falta de seguimiento`);
  return { statusCode: 200, body: JSON.stringify({ alertas_creadas: creadas.length }) };
};

/** Avisos automáticos a padres (programar 1 vez al día en EventBridge, después de los otros dos) */
exports.avisosHandler = async () => {
  const resumen = await ejecutarAvisosAutomaticos();
  console.log('[LAMBDA CRON] Avisos automáticos', JSON.stringify(resumen));
  return { statusCode: 200, body: JSON.stringify(resumen) };
};
