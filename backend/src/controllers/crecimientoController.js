const db = require('../config/db');
const { calcularEdadMeses, percentilPeso, percentilTalla, curvaReferencia } = require('../utils/percentiles');

/**
 * Reglas de alerta de la sección 3.5 del enunciado, con percentiles OMS:
 *   - Percentil < 5   -> posible desnutrición (peso)   / posible talla baja (talla)
 *       · por debajo del percentil 3 la alerta es CRÍTICA; entre 3 y 5 es PREVENTIVA
 *   - Percentil > 95  -> posible sobrepeso (peso), alerta PREVENTIVA
 */
async function evaluarAlertas(client, ninioId, percentilPesoVal, percentilTallaVal) {
  const alertas = [];

  if (percentilPesoVal < 3) {
    alertas.push({
      tipo: 'critica',
      motivo: 'percentil_peso_muy_bajo',
      mensaje: `El niño se encuentra por debajo del percentil 3 de peso para su edad (percentil ${percentilPesoVal}%). Posible desnutrición: requiere evaluación nutricional urgente.`,
    });
  } else if (percentilPesoVal < 5) {
    alertas.push({
      tipo: 'preventiva',
      motivo: 'percentil_peso_bajo',
      mensaje: `El niño se encuentra por debajo del percentil 5 de peso para su edad (percentil ${percentilPesoVal}%). Posible desnutrición: se recomienda seguimiento nutricional.`,
    });
  } else if (percentilPesoVal > 95) {
    alertas.push({
      tipo: 'preventiva',
      motivo: 'percentil_peso_alto',
      mensaje: `El niño se encuentra por encima del percentil 95 de peso para su edad (percentil ${percentilPesoVal}%). Posible sobrepeso: se recomienda evaluación.`,
    });
  }

  if (percentilTallaVal < 3) {
    alertas.push({
      tipo: 'critica',
      motivo: 'percentil_talla_muy_bajo',
      mensaje: `El niño se encuentra por debajo del percentil 3 de talla para su edad (percentil ${percentilTallaVal}%). Posible indicio de desnutrición crónica (talla baja).`,
    });
  } else if (percentilTallaVal < 5) {
    alertas.push({
      tipo: 'preventiva',
      motivo: 'percentil_talla_bajo',
      mensaje: `El niño se encuentra por debajo del percentil 5 de talla para su edad (percentil ${percentilTallaVal}%). Se recomienda vigilar su crecimiento en talla.`,
    });
  }

  const alertasCreadas = [];
  for (const a of alertas) {
    const { rows } = await client.query(
      `INSERT INTO alertas (ninio_id, tipo, motivo, mensaje) VALUES ($1,$2,$3,$4) RETURNING *`,
      [ninioId, a.tipo, a.motivo, a.mensaje]
    );
    alertasCreadas.push(rows[0]);
  }
  return alertasCreadas;
}

async function listarPorNinio(req, res) {
  const { rows } = await db.query(
    'SELECT * FROM registros_crecimiento WHERE ninio_id = $1 ORDER BY fecha_medicion',
    [req.params.ninioId]
  );
  res.json(rows);
}

/** Mediciones del niño + curvas de referencia OMS (P5, P50, P95) de su sexo, para dibujar peso vs edad y talla vs edad. */
async function curvas(req, res) {
  const { rows: n } = await db.query('SELECT sexo, fecha_nacimiento FROM ninios WHERE id = $1', [req.params.ninioId]);
  if (!n[0]) return res.status(404).json({ error: 'Niño no encontrado' });
  const { rows } = await db.query(
    'SELECT fecha_medicion, peso_kg, talla_cm, edad_meses_al_medir, percentil_peso, percentil_talla FROM registros_crecimiento WHERE ninio_id = $1 ORDER BY fecha_medicion',
    [req.params.ninioId]
  );
  res.json({ sexo: n[0].sexo, mediciones: rows, referencia: curvaReferencia(n[0].sexo) });
}

async function crear(req, res) {
  const client = await db.pool.connect();
  try {
    const { ninio_id, fecha_medicion, peso_kg, talla_cm } = req.body;

    const { rows: ninioRows } = await client.query('SELECT * FROM ninios WHERE id=$1', [ninio_id]);
    const ninio = ninioRows[0];
    if (!ninio) return res.status(404).json({ error: 'Niño no encontrado' });

    const fecha = fecha_medicion || new Date().toISOString().slice(0, 10);
    const edadMeses = calcularEdadMeses(ninio.fecha_nacimiento, fecha);
    const { percentil: pPeso } = percentilPeso(peso_kg, edadMeses, ninio.sexo);
    const { percentil: pTalla } = percentilTalla(talla_cm, edadMeses, ninio.sexo);

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO registros_crecimiento
        (ninio_id, fecha_medicion, peso_kg, talla_cm, edad_meses_al_medir, percentil_peso, percentil_talla, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [ninio_id, fecha, peso_kg, talla_cm, edadMeses, pPeso, pTalla, req.usuario?.id || null]
    );
    const registro = rows[0];

    const alertasCreadas = await evaluarAlertas(client, ninio_id, pPeso, pTalla);

    await client.query('COMMIT');
    res.status(201).json({ registro, alertas_generadas: alertasCreadas });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al registrar medición', detalle: error.message });
  } finally {
    client.release();
  }
}

module.exports = { listarPorNinio, curvas, crear };
