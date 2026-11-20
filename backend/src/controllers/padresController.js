const db = require('../config/db');
const { enviarPorCanal, resolverDestino } = require('../utils/notificaciones');
const { enviarCarnetEnSegundoPlano } = require('../services/carnetEnvio');
const { cifrar, hashDeterminista, descifrarPadre } = require('../utils/cifrado');

const SELECT_CON_NINIOS = `
  SELECT p.*, cl.nombre AS comunidad_linguistica_nombre,
         COALESCE(
           json_agg(json_build_object('id', n.id, 'nombre', n.nombre_completo))
           FILTER (WHERE n.id IS NOT NULL), '[]'
         ) AS ninios
  FROM padres p
  LEFT JOIN comunidades_linguisticas cl ON cl.id = p.comunidad_linguistica_id
  LEFT JOIN ninio_padre np ON np.padre_id = p.id
  LEFT JOIN ninios n ON n.id = np.ninio_id`;

/** Lista los padres con sus niños vinculados. Los datos personales se descifran aquí. */
async function listar(req, res) {
  const { comunidad_id } = req.query;
  const params = [];
  let where = '';
  if (comunidad_id) {
    params.push(comunidad_id);
    where = `WHERE p.comunidad_id = $${params.length}`;
  }
  const { rows } = await db.query(`${SELECT_CON_NINIOS} ${where} GROUP BY p.id, cl.nombre ORDER BY p.nombre_completo`, params);
  res.json(rows.map(descifrarPadre));
}

async function obtener(req, res) {
  const { rows } = await db.query(`${SELECT_CON_NINIOS} WHERE p.id = $1 GROUP BY p.id, cl.nombre`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Padre no encontrado' });
  res.json(descifrarPadre(rows[0]));
}

/**
 * Regla del rol "enfermeria": puede vincular padre↔niño únicamente cuando ella misma
 * registró al niño o al padre (es parte de su ingreso). Los demás roles con permiso
 * de escritura no tienen esta restricción.
 */
async function puedeVincular(req, ninioId, padreId) {
  if (req.usuario?.rol !== 'enfermeria') return true;
  const { rows } = await db.query(
    `SELECT (SELECT creado_por FROM ninios WHERE id = $1) AS n, (SELECT creado_por FROM padres WHERE id = $2) AS p`,
    [ninioId, padreId]
  );
  const uid = req.usuario.id;
  return !!rows[0] && (rows[0].n === uid || rows[0].p === uid);
}

async function crear(req, res) {
  const { nombre_completo, dpi, telefono, correo, telegram_chat_id, canal_preferido, comunidad_id, comunidad_linguistica_id } = req.body;
  if (!nombre_completo || !nombre_completo.trim() || !dpi || !String(dpi).trim()) {
    return res.status(400).json({ error: 'nombre_completo y dpi son requeridos' });
  }
  const dpiLimpio = String(dpi).trim();
  if (req.body.ninio_id && req.usuario?.rol === 'enfermeria' && !(await puedeVincular(req, req.body.ninio_id, null))) {
    return res.status(403).json({ error: 'Solo puede vincular niños que usted mismo registró' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO padres (nombre_completo, dpi, dpi_hash, telefono, correo, telegram_chat_id, canal_preferido, comunidad_id, creado_por, comunidad_linguistica_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        nombre_completo.trim(),
        cifrar(dpiLimpio),
        hashDeterminista(dpiLimpio),
        cifrar(telefono || null),
        cifrar(correo || null),
        cifrar(telegram_chat_id || null),
        canal_preferido || 'email',
        comunidad_id || null,
        req.usuario?.id || null,
        comunidad_linguistica_id || null,
      ]
    );
    // Si se eligió un niño al registrar al padre, se vincula en el acto (con las mismas reglas que /ninios)
    if (req.body.ninio_id) {
      await db.query(
        `INSERT INTO ninio_padre (ninio_id, padre_id, parentesco) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [req.body.ninio_id, rows[0].id, req.body.parentesco || 'padre/madre']
      );
      enviarCarnetEnSegundoPlano(req.body.ninio_id, rows[0].id); // carnet automático al padre recién vinculado
    }
    res.status(201).json(descifrarPadre(rows[0]));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'DPI ya registrado' });
    res.status(500).json({ error: 'Error al crear padre', detalle: error.message });
  }
}

async function actualizar(req, res) {
  const { nombre_completo, dpi, telefono, correo, telegram_chat_id, canal_preferido, comunidad_id, comunidad_linguistica_id } = req.body;
  if (!nombre_completo || !nombre_completo.trim()) return res.status(400).json({ error: 'nombre_completo es requerido' });
  const dpiLimpio = dpi === undefined || dpi === null ? null : String(dpi).trim();
  if (dpi !== undefined && dpi !== null && !dpiLimpio) return res.status(400).json({ error: 'El DPI no puede quedar vacío' });
  try {
    const { rows } = await db.query(
      `UPDATE padres SET nombre_completo=$1, telefono=$2, correo=$3, telegram_chat_id=$4, canal_preferido=COALESCE($5, canal_preferido), comunidad_id=$6, comunidad_linguistica_id=$7,
              dpi = COALESCE($9, dpi), dpi_hash = COALESCE($10, dpi_hash)
       WHERE id=$8 RETURNING *`,
      [nombre_completo.trim(), cifrar(telefono || null), cifrar(correo || null), cifrar(telegram_chat_id || null), canal_preferido || null,
        comunidad_id || null, comunidad_linguistica_id || null, req.params.id,
        dpiLimpio ? cifrar(dpiLimpio) : null, dpiLimpio ? hashDeterminista(dpiLimpio) : null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Padre no encontrado' });
    res.json(descifrarPadre(rows[0]));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese DPI ya está registrado en otro padre/madre' });
    throw error;
  }
}

async function eliminar(req, res) {
  await db.query('DELETE FROM padres WHERE id=$1', [req.params.id]);
  res.status(204).send();
}

/** Vincula un niño EXISTENTE a este padre (relación muchos-a-muchos) */
async function asociarNinio(req, res) {
  const { ninio_id, parentesco } = req.body;
  if (!ninio_id) return res.status(400).json({ error: 'ninio_id es requerido' });
  if (!(await puedeVincular(req, ninio_id, req.params.id))) {
    return res.status(403).json({ error: 'Solo puede vincular niños o padres que usted mismo registró' });
  }
  await db.query(
    `INSERT INTO ninio_padre (ninio_id, padre_id, parentesco) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [ninio_id, req.params.id, parentesco || 'padre/madre']
  );
  enviarCarnetEnSegundoPlano(ninio_id, req.params.id); // carnet automático (una sola vez por padre y niño)
  res.status(201).json({ mensaje: 'Niño vinculado correctamente' });
}

/** Desvincula un niño de este padre, sin borrar a ninguno de los dos */
async function desvincularNinio(req, res) {
  await db.query('DELETE FROM ninio_padre WHERE padre_id=$1 AND ninio_id=$2', [req.params.id, req.params.ninioId]);
  res.status(204).send();
}

async function vincularTelegram(req, res) {
  const { telegram_chat_id } = req.body;
  const { rows } = await db.query(
    `UPDATE padres SET telegram_chat_id=$1 WHERE id=$2 RETURNING *`,
    [cifrar(telegram_chat_id || null), req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Padre no encontrado' });
  res.json(descifrarPadre(rows[0]));
}

/** Envía un aviso MANUAL a un padre (no ligado a una alerta automática). */
async function enviarAviso(req, res) {
  const { mensaje, asunto } = req.body;
  if (!mensaje || !mensaje.trim()) return res.status(400).json({ error: 'El mensaje es requerido' });

  const { rows: padreRows } = await db.query('SELECT * FROM padres WHERE id=$1', [req.params.id]);
  if (!padreRows[0]) return res.status(404).json({ error: 'Padre no encontrado' });
  const padre = descifrarPadre(padreRows[0]); // datos de contacto en claro, solo en memoria

  const destino = resolverDestino(padre);
  const resultadoEnvio = destino
    ? await enviarPorCanal(padre.canal_preferido, destino, asunto || 'Aviso del centro de salud', mensaje)
    : { exito: false, error: `Sin dato de contacto registrado para el canal ${padre.canal_preferido}` };

  const { rows: notifRows } = await db.query(
    `INSERT INTO notificaciones (padre_id, alerta_id, canal, asunto, contenido, estado, enviado_en)
     VALUES ($1, NULL, $2, $3, $4, $5, $6) RETURNING *`,
    [padre.id, padre.canal_preferido, asunto || 'Aviso del centro de salud', mensaje,
     resultadoEnvio.exito ? 'enviado' : 'fallido', resultadoEnvio.exito ? new Date() : null]
  );

  if (!resultadoEnvio.exito) {
    return res.status(502).json({ error: 'No se pudo enviar el aviso', detalle: resultadoEnvio.error, notificacion: notifRows[0] });
  }
  res.status(201).json(notifRows[0]);
}

module.exports = {
  listar, obtener, crear, actualizar, eliminar,
  asociarNinio, desvincularNinio, vincularTelegram, enviarAviso,
};
