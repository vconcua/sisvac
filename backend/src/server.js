const app = require('./app');
const cron = require('node-cron');
const db = require('./config/db');
const { detectarAbandonoSeguimiento } = require('./services/seguimiento');
const { ejecutarAvisosAutomaticos } = require('./services/avisosAutomaticos');
require('dotenv').config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`SISVAC API escuchando en el puerto ${PORT}`);
});

// Diario 06:00 — marca vacunaciones atrasadas y genera alertas preventivas.
cron.schedule('0 6 * * *', async () => {
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
    console.log(`[CRON] ${rows.length} vacunaciones marcadas como atrasadas`);
  } catch (error) {
    console.error('[CRON] Error al actualizar vacunaciones atrasadas', error);
  }
}, { timezone: 'America/Guatemala' });

// Diario 06:30 — alerta por abandono de seguimiento (niños sin mediciones recientes).
cron.schedule('30 6 * * *', async () => {
  try {
    const creadas = await detectarAbandonoSeguimiento();
    console.log(`[CRON] ${creadas.length} alertas por falta de seguimiento de crecimiento`);
  } catch (error) {
    console.error('[CRON] Error al detectar abandono de seguimiento', error);
  }
}, { timezone: 'America/Guatemala' });

// Diario 07:00 — avisos AUTOMÁTICOS a padres (alertas pendientes + recordatorio de vacunas próximas).
// Corre después de las detecciones de las 06:00 y 06:30 para incluir las alertas recién creadas.
cron.schedule('0 7 * * *', async () => {
  try {
    const r = await ejecutarAvisosAutomaticos();
    console.log(`[CRON] Avisos automáticos: ${r.alertas.avisos_enviados} por alertas, ${r.vacunas.recordatorios_enviados} recordatorios de vacuna`);
  } catch (error) {
    console.error('[CRON] Error en avisos automáticos', error);
  }
}, { timezone: 'America/Guatemala' });
