const db = require('../config/db');

const TIPOS_VALIDOS = ['Hospital', 'Centro de Salud', 'Puesto de Salud', 'CAP', 'CAIMI', 'Farmacia PROAM'];

async function listar(req, res) {
  const { departamento_id, municipio_id, tipo_establecimiento, q } = req.query;
  const condiciones = [];
  const params = [];

  if (departamento_id) { params.push(departamento_id); condiciones.push(`cs.departamento_id = $${params.length}`); }
  if (municipio_id) { params.push(municipio_id); condiciones.push(`cs.municipio_id = $${params.length}`); }
  if (tipo_establecimiento) { params.push(tipo_establecimiento); condiciones.push(`cs.tipo_establecimiento = $${params.length}`); }
  if (q) { params.push(`%${q}%`); condiciones.push(`cs.nombre ILIKE $${params.length}`); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT cs.*, d.nombre AS departamento_nombre, m.nombre AS municipio_nombre
     FROM centros_salud cs
     LEFT JOIN departamentos d ON d.id = cs.departamento_id
     LEFT JOIN municipios m ON m.id = cs.municipio_id
     ${where}
     ORDER BY cs.nombre`,
    params
  );
  res.json(rows);
}

async function obtener(req, res) {
  const { rows } = await db.query(
    `SELECT cs.*, d.nombre AS departamento_nombre, m.nombre AS municipio_nombre
     FROM centros_salud cs
     LEFT JOIN departamentos d ON d.id = cs.departamento_id
     LEFT JOIN municipios m ON m.id = cs.municipio_id
     WHERE cs.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Centro de salud no encontrado' });
  res.json(rows[0]);
}

async function crear(req, res) {
  const { nombre, tipo_establecimiento, departamento_id, municipio_id, direccion, telefono, latitud, longitud } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  if (tipo_establecimiento && !TIPOS_VALIDOS.includes(tipo_establecimiento)) {
    return res.status(400).json({ error: `tipo_establecimiento debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const { rows } = await db.query(
    `INSERT INTO centros_salud (nombre, tipo_establecimiento, departamento_id, municipio_id, direccion, telefono, latitud, longitud, fuente)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Registro manual') RETURNING *`,
    [
      nombre.trim(),
      tipo_establecimiento || null,
      departamento_id || null,
      municipio_id || null,
      direccion || null,
      telefono || null,
      latitud || null,
      longitud || null,
    ]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { nombre, tipo_establecimiento, departamento_id, municipio_id, direccion, telefono, latitud, longitud } = req.body;

  if (tipo_establecimiento && !TIPOS_VALIDOS.includes(tipo_establecimiento)) {
    return res.status(400).json({ error: `tipo_establecimiento debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const { rows } = await db.query(
    `UPDATE centros_salud
     SET nombre=$1, tipo_establecimiento=$2, departamento_id=$3, municipio_id=$4,
         direccion=$5, telefono=$6, latitud=$7, longitud=$8, actualizado_en=now()
     WHERE id=$9 RETURNING *`,
    [
      nombre,
      tipo_establecimiento || null,
      departamento_id || null,
      municipio_id || null,
      direccion || null,
      telefono || null,
      latitud || null,
      longitud || null,
      req.params.id,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Centro de salud no encontrado' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  // Antes de borrar, se desvincula de cualquier comunidad que lo tuviera
  // asignado, para no dejar referencias rotas.
  await db.query('UPDATE comunidades SET centro_salud_id = NULL WHERE centro_salud_id = $1', [req.params.id]);
  const { rowCount } = await db.query('DELETE FROM centros_salud WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Centro de salud no encontrado' });
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar, TIPOS_VALIDOS };
