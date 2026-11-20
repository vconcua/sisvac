const db = require('../config/db');

async function listarCatalogo(req, res) {
  const { rows } = await db.query('SELECT * FROM vacunas ORDER BY edad_recomendada_meses, dosis_numero');
  res.json(rows);
}

async function generarEsquemaParaNinio(req, res) {
  const { ninioId } = req.params;
  const { rows: catalogo } = await db.query('SELECT * FROM vacunas');
  const { rows: ninioRows } = await db.query('SELECT * FROM ninios WHERE id=$1', [ninioId]);
  const ninio = ninioRows[0];
  if (!ninio) return res.status(404).json({ error: 'Niño no encontrado' });
  if (req.usuario?.rol === 'enfermeria' && ninio.creado_por !== req.usuario.id) {
    return res.status(403).json({ error: 'Solo puede generar el esquema de niños que usted mismo registró' });
  }

  // Idempotente: si el niño ya tiene una dosis de esa vacuna, no se vuelve a crear
  const { rows: yaTiene } = await db.query('SELECT vacuna_id FROM vacunaciones WHERE ninio_id=$1', [ninioId]);
  const existentes = new Set(yaTiene.map((r) => r.vacuna_id));

  const insertados = [];
  for (const vacuna of catalogo) {
    if (existentes.has(vacuna.id)) continue;
    const fechaProxima = new Date(ninio.fecha_nacimiento);
    fechaProxima.setMonth(fechaProxima.getMonth() + vacuna.edad_recomendada_meses);
    const { rows } = await db.query(
      `INSERT INTO vacunaciones (ninio_id, vacuna_id, fecha_proxima_dosis, estado)
       VALUES ($1,$2,$3,'pendiente') RETURNING *`,
      [ninioId, vacuna.id, fechaProxima.toISOString().slice(0, 10)]
    );
    insertados.push(rows[0]);
  }
  res.status(201).json(insertados);
}

async function listarPorNinio(req, res) {
  const { rows } = await db.query(
    `SELECT vc.*, v.nombre AS vacuna_nombre, v.dosis_numero, v.edad_recomendada_meses,
            -- una dosis pendiente cuya fecha ya pasó se muestra como atrasada sin esperar a la tarea diaria
            CASE WHEN vc.estado = 'pendiente' AND vc.fecha_proxima_dosis < CURRENT_DATE THEN 'atrasada' ELSE vc.estado END AS estado
     FROM vacunaciones vc
     JOIN vacunas v ON v.id = vc.vacuna_id
     WHERE vc.ninio_id = $1
     ORDER BY v.edad_recomendada_meses, v.dosis_numero`,
    [req.params.ninioId]
  );
  res.json(rows);
}

async function aplicarDosis(req, res) {
  const { fecha_aplicada } = req.body;
  const hoy = new Date().toISOString().slice(0, 10);
  const fecha = fecha_aplicada || hoy;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
    return res.status(400).json({ error: 'La fecha de aplicación no es válida (use AAAA-MM-DD)' });
  }
  if (fecha > hoy) return res.status(400).json({ error: 'La fecha de aplicación no puede ser futura' });

  const { rows: previo } = await db.query(
    `SELECT n.fecha_nacimiento FROM vacunaciones vc JOIN ninios n ON n.id = vc.ninio_id WHERE vc.id = $1`,
    [req.params.id]
  );
  if (!previo[0]) return res.status(404).json({ error: 'Registro de vacunación no encontrado' });
  const nacimiento = new Date(previo[0].fecha_nacimiento).toISOString().slice(0, 10);
  if (fecha < nacimiento) return res.status(400).json({ error: 'La fecha de aplicación no puede ser anterior al nacimiento del niño' });

  const { rows } = await db.query(
    `UPDATE vacunaciones SET estado='aplicada', fecha_aplicada=$1, aplicada_por=$2
     WHERE id=$3 RETURNING *`,
    [fecha, req.usuario?.id || null, req.params.id]
  );
  res.json(rows[0]);
}

async function actualizarAtrasadas(req, res) {
  const { rows } = await db.query(
    `UPDATE vacunaciones SET estado='atrasada'
     WHERE estado='pendiente' AND fecha_proxima_dosis < CURRENT_DATE
     RETURNING *`
  );
  res.json({ actualizadas: rows.length, registros: rows });
}

module.exports = { listarCatalogo, generarEsquemaParaNinio, listarPorNinio, aplicarDosis, actualizarAtrasadas };
