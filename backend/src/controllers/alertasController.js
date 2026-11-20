const db = require('../config/db');
const { enviarPorCanal, resolverDestino } = require('../utils/notificaciones');
const { ejecutarAvisosAutomaticos } = require('../services/avisosAutomaticos');
const { publicarAlertaCritica } = require('../utils/snsPublisher');
const { descifrarPadre } = require('../utils/cifrado');
const { detectarAbandonoSeguimiento } = require('../services/seguimiento');

async function listar(req, res) {
  const { estado, tipo } = req.query;
  const condiciones = [];
  const params = [];
  if (estado) { params.push(estado); condiciones.push(`a.estado = $${params.length}`); }
  if (tipo) { params.push(tipo); condiciones.push(`a.tipo = $${params.length}`); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT a.*, n.nombre_completo AS ninio_nombre, n.comunidad_id
     FROM alertas a JOIN ninios n ON n.id = a.ninio_id
     ${where}
     ORDER BY a.creado_en DESC`,
    params
  );
  res.json(rows);
}

async function marcarAtendida(req, res) {
  const { rows } = await db.query(
    `UPDATE alertas SET estado='atendida', atendida_en=now() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Alerta no encontrada' });
  res.json(rows[0]);
}

async function notificar(req, res) {
  const { rows: alertaRows } = await db.query('SELECT * FROM alertas WHERE id=$1', [req.params.id]);
  const alerta = alertaRows[0];
  if (!alerta) return res.status(404).json({ error: 'Alerta no encontrada' });

  const { rows: padresCifrados } = await db.query(
    `SELECT p.* FROM padres p JOIN ninio_padre np ON np.padre_id = p.id WHERE np.ninio_id = $1`,
    [alerta.ninio_id]
  );

  const resultados = [];
  for (const padreCifrado of padresCifrados) {
    const padre = descifrarPadre(padreCifrado); // contacto en claro solo en memoria
    const destino = resolverDestino(padre);
    const resultadoEnvio = destino
      ? await enviarPorCanal(padre.canal_preferido, destino, 'Alerta de salud infantil', alerta.mensaje)
      : { exito: false, error: `Sin dato de contacto registrado para el canal ${padre.canal_preferido}` };

    const { rows: notifRows } = await db.query(
      `INSERT INTO notificaciones (padre_id, alerta_id, canal, asunto, contenido, estado, enviado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [padre.id, alerta.id, padre.canal_preferido, 'Alerta de salud infantil', alerta.mensaje,
       resultadoEnvio.exito ? 'enviado' : 'fallido', resultadoEnvio.exito ? new Date() : null]
    );
    resultados.push(notifRows[0]);
  }

  await db.query(`UPDATE alertas SET estado='enviada' WHERE id=$1`, [alerta.id]);

  if (alerta.tipo === 'critica') {
    await publicarAlertaCritica('Alerta crítica de salud infantil', `${alerta.mensaje} (Niño ID: ${alerta.ninio_id})`);
  }
  res.json({ alerta_id: alerta.id, notificaciones: resultados });
}

/** Ejecuta manualmente la detección de niños sin seguimiento (también corre sola cada día) */
async function detectarAbandono(req, res) {
  const creadas = await detectarAbandonoSeguimiento();
  res.json({ alertas_creadas: creadas.length, alertas: creadas });
}

/** Ejecuta manualmente los avisos automáticos (también corren solos cada día) */
async function ejecutarAvisos(req, res) {
  res.json(await ejecutarAvisosAutomaticos());
}

module.exports = { listar, marcarAtendida, notificar, detectarAbandono, ejecutarAvisos };
