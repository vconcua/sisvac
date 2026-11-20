const db = require('../config/db');

async function listar(req, res) {
  const { rows } = await db.query(`
    SELECT c.*, d.nombre AS departamento_nombre, m.nombre AS municipio_nombre, cs.nombre AS centro_salud_nombre, cl.nombre AS comunidad_linguistica_nombre
    FROM comunidades c
    LEFT JOIN departamentos d ON d.id = c.departamento_id
    LEFT JOIN municipios m ON m.id = c.municipio_id
    LEFT JOIN centros_salud cs ON cs.id = c.centro_salud_id
    LEFT JOIN comunidades_linguisticas cl ON cl.id = c.comunidad_linguistica_id
    ORDER BY c.nombre
  `);
  res.json(rows);
}

async function obtener(req, res) {
  const { rows } = await db.query(`
    SELECT c.*, d.nombre AS departamento_nombre, m.nombre AS municipio_nombre, cs.nombre AS centro_salud_nombre, cl.nombre AS comunidad_linguistica_nombre
    FROM comunidades c
    LEFT JOIN departamentos d ON d.id = c.departamento_id
    LEFT JOIN municipios m ON m.id = c.municipio_id
    LEFT JOIN centros_salud cs ON cs.id = c.centro_salud_id
    LEFT JOIN comunidades_linguisticas cl ON cl.id = c.comunidad_linguistica_id
    WHERE c.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Comunidad no encontrada' });
  res.json(rows[0]);
}

/**
 * Crea una comunidad. Acepta departamento_id / municipio_id / centro_salud_id
 * (recomendado, usando los catálogos oficiales) y, para compatibilidad,
 * sigue aceptando los campos de texto libre `departamento`/`municipio`
 * si no se envían los IDs del catálogo.
 */
async function crear(req, res) {
  const { nombre, ubicacion, departamento, municipio, departamento_id, municipio_id, centro_salud_id, numero_estimado_familias, comunidad_linguistica_id } = req.body;
  const { rows } = await db.query(
    `INSERT INTO comunidades (nombre, ubicacion, departamento, municipio, departamento_id, municipio_id, centro_salud_id, numero_estimado_familias, comunidad_linguistica_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [nombre, ubicacion, departamento || null, municipio || null, departamento_id || null, municipio_id || null, centro_salud_id || null, numero_estimado_familias || 0, comunidad_linguistica_id || null]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  if (!req.body.nombre || !String(req.body.nombre).trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  const { nombre, ubicacion, departamento, municipio, departamento_id, municipio_id, centro_salud_id, numero_estimado_familias, comunidad_linguistica_id } = req.body;
  const { rows } = await db.query(
    `UPDATE comunidades SET nombre=$1, ubicacion=$2, departamento=$3, municipio=$4, departamento_id=$5, municipio_id=$6, centro_salud_id=$7, numero_estimado_familias=$8, comunidad_linguistica_id=$9
     WHERE id=$10 RETURNING *`,
    [nombre, ubicacion, departamento || null, municipio || null, departamento_id || null, municipio_id || null, centro_salud_id || null, numero_estimado_familias || 0, comunidad_linguistica_id || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Comunidad no encontrada' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  await db.query('DELETE FROM comunidades WHERE id=$1', [req.params.id]);
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
