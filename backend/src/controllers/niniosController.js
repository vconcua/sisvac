const db = require('../config/db');
const { generarPIN } = require('../utils/qrGenerator');
const { calcularEdadMeses } = require('../utils/percentiles');
const { enviarCarnetEnSegundoPlano } = require('../services/carnetEnvio');
const { descifrar } = require('../utils/cifrado');

/** El PIN del carnet y los contadores de bloqueo solo se entregan por /carnet/ninio/:id/qr (roles autorizados). */
function sinSecretosQR(n) {
  const { qr_pin, qr_intentos_fallidos, qr_bloqueado_hasta, ...resto } = n;
  return resto;
}

async function listar(req, res) {
  const { comunidad_id } = req.query;
  const params = [];
  let sql = `SELECT n.*, c.nombre AS comunidad_nombre, cs.nombre AS centro_salud_nombre, cs.tipo_establecimiento AS centro_salud_tipo, mcs.nombre AS centro_salud_municipio,
       COALESCE((SELECT json_agg(json_build_object('id', p.id, 'nombre', p.nombre_completo, 'parentesco', np.parentesco) ORDER BY p.nombre_completo)
                 FROM ninio_padre np JOIN padres p ON p.id = np.padre_id WHERE np.ninio_id = n.id), '[]') AS padres
     FROM ninios n
     LEFT JOIN comunidades c ON c.id = n.comunidad_id
     LEFT JOIN centros_salud cs ON cs.id = c.centro_salud_id
     LEFT JOIN municipios mcs ON mcs.id = cs.municipio_id
     WHERE n.activo = TRUE`;
  if (comunidad_id) {
    params.push(comunidad_id);
    sql += ` AND n.comunidad_id = $${params.length}`;
  }
  sql += ' ORDER BY n.nombre_completo';
  const { rows } = await db.query(sql, params);
  res.json(rows.map((n) => ({ ...sinSecretosQR(n), edad_meses: calcularEdadMeses(n.fecha_nacimiento) })));
}

async function obtener(req, res) {
  const { rows } = await db.query(
    `SELECT n.*, c.nombre AS comunidad_nombre, cs.nombre AS centro_salud_nombre, cs.tipo_establecimiento AS centro_salud_tipo, mcs.nombre AS centro_salud_municipio,
            json_agg(json_build_object('id', p.id, 'nombre', p.nombre_completo, 'telefono', p.telefono)) FILTER (WHERE p.id IS NOT NULL) AS padres
     FROM ninios n
     LEFT JOIN comunidades c ON c.id = n.comunidad_id
     LEFT JOIN centros_salud cs ON cs.id = c.centro_salud_id
     LEFT JOIN municipios mcs ON mcs.id = cs.municipio_id
     LEFT JOIN ninio_padre np ON np.ninio_id = n.id
     LEFT JOIN padres p ON p.id = np.padre_id
     WHERE n.id = $1
     GROUP BY n.id, c.nombre, cs.nombre, cs.tipo_establecimiento, mcs.nombre`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Niño no encontrado' });
  const ninio = sinSecretosQR(rows[0]);
  ninio.edad_meses = calcularEdadMeses(ninio.fecha_nacimiento);
  // el teléfono de los padres está cifrado en la BD: se descifra solo para la respuesta
  if (ninio.padres) ninio.padres = ninio.padres.map((p) => ({ ...p, telefono: descifrar(p.telefono) }));
  res.json(ninio);
}

async function crear(req, res) {
  const { nombre_completo, fecha_nacimiento, sexo, comunidad_id, padre_id } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const pin = generarPIN();
    const { rows } = await client.query(
      `INSERT INTO ninios (nombre_completo, fecha_nacimiento, sexo, comunidad_id, qr_pin, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre_completo, fecha_nacimiento, sexo, comunidad_id, pin, req.usuario?.id || null]
    );
    const ninio = rows[0];
    if (padre_id) {
      await client.query('INSERT INTO ninio_padre (ninio_id, padre_id) VALUES ($1,$2)', [ninio.id, padre_id]);
    }
    await client.query('COMMIT');
    if (padre_id) enviarCarnetEnSegundoPlano(ninio.id, padre_id);
    const { rows: cs } = await db.query(
      `SELECT cs.nombre AS centro_salud_nombre, cs.tipo_establecimiento AS centro_salud_tipo, mcs.nombre AS centro_salud_municipio
       FROM comunidades c LEFT JOIN centros_salud cs ON cs.id = c.centro_salud_id LEFT JOIN municipios mcs ON mcs.id = cs.municipio_id
       WHERE c.id = $1`, [ninio.comunidad_id]);
    res.status(201).json({ ...ninio, ...(cs[0] || {}) });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear niño', detalle: error.message });
  } finally {
    client.release();
  }
}

async function actualizar(req, res) {
  const { nombre_completo, fecha_nacimiento, sexo, comunidad_id } = req.body;
  if (!nombre_completo || !nombre_completo.trim() || !fecha_nacimiento || !['M', 'F'].includes(sexo)) {
    return res.status(400).json({ error: 'nombre_completo, fecha_nacimiento y sexo (M/F) son requeridos' });
  }
  const { rows } = await db.query(
    `UPDATE ninios SET nombre_completo=$1, fecha_nacimiento=$2, sexo=$3, comunidad_id=$4 WHERE id=$5 RETURNING *`,
    [nombre_completo, fecha_nacimiento, sexo, comunidad_id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Niño no encontrado' });
  res.json(sinSecretosQR(rows[0]));
}

async function eliminar(req, res) {
  await db.query('UPDATE ninios SET activo = FALSE WHERE id=$1', [req.params.id]);
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
