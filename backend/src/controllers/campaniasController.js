const db = require('../config/db');
const { enviarPorCanal, resolverDestino } = require('../utils/notificaciones');
const { descifrarPadre } = require('../utils/cifrado');

const ESTADOS_VACUNACION = ['pendiente', 'aplicada', 'atrasada'];
const DIAS_POR_MES = 30.4375;

/**
 * Padres que cumplen la segmentación de una campaña. Un padre es destinatario
 * si tiene AL MENOS UN hijo activo que cumpla TODOS los filtros indicados:
 *   - comunidad del niño
 *   - edad del niño en meses (mínima y/o máxima)
 *   - estado de vacunación (el niño tiene alguna dosis en ese estado)
 * Cada padre aparece una sola vez aunque tenga varios hijos que califiquen.
 */
async function obtenerDestinatarios(filtros) {
  const { rows } = await db.query(
    `SELECT DISTINCT p.*
     FROM padres p
     JOIN ninio_padre np ON np.padre_id = p.id
     JOIN ninios n ON n.id = np.ninio_id AND n.activo = TRUE
     WHERE ($1::uuid IS NULL OR n.comunidad_id = $1::uuid)
       AND ($2::numeric IS NULL OR (CURRENT_DATE - n.fecha_nacimiento) / ${DIAS_POR_MES} >= $2::numeric)
       AND ($3::numeric IS NULL OR (CURRENT_DATE - n.fecha_nacimiento) / ${DIAS_POR_MES} <= $3::numeric)
       AND ($4::estado_vacunacion IS NULL OR EXISTS (
             SELECT 1 FROM vacunaciones v WHERE v.ninio_id = n.id AND v.estado = $4::estado_vacunacion))
     ORDER BY p.nombre_completo`,
    [filtros.comunidad_id || null, filtros.edad_min_meses ?? null, filtros.edad_max_meses ?? null, filtros.estado_vacunacion_filtro || null]
  );
  return rows;
}

function leerEdad(valor) {
  if (valor === undefined || valor === null || valor === '') return { valor: null };
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return { error: true };
  return { valor: n };
}

async function listar(req, res) {
  const { rows } = await db.query(
    `SELECT c.*, com.nombre AS comunidad_nombre
     FROM campanias c LEFT JOIN comunidades com ON com.id = c.comunidad_id
     ORDER BY c.creado_en DESC`
  );
  res.json(rows);
}

async function crear(req, res) {
  const titulo = (req.body.titulo || '').trim();
  const mensaje = (req.body.mensaje || '').trim();
  if (!titulo || titulo.length > 200) return res.status(400).json({ error: 'El título es requerido (máximo 200 caracteres)' });
  if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' });

  const min = leerEdad(req.body.edad_min_meses);
  const max = leerEdad(req.body.edad_max_meses);
  if (min.error || max.error) return res.status(400).json({ error: 'Las edades deben ser números de meses mayores o iguales a 0' });
  if (min.valor !== null && max.valor !== null && min.valor > max.valor) {
    return res.status(400).json({ error: 'La edad mínima no puede ser mayor que la máxima' });
  }
  const estado = req.body.estado_vacunacion_filtro || null;
  if (estado && !ESTADOS_VACUNACION.includes(estado)) {
    return res.status(400).json({ error: `estado_vacunacion_filtro debe ser: ${ESTADOS_VACUNACION.join(', ')}` });
  }

  const { rows } = await db.query(
    `INSERT INTO campanias (titulo, mensaje, comunidad_id, edad_min_meses, edad_max_meses, estado_vacunacion_filtro, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [titulo, mensaje, req.body.comunidad_id || null, min.valor, max.valor, estado, req.usuario?.id || null]
  );
  res.status(201).json(rows[0]);
}

/** Vista previa de a quiénes llegaría la campaña. NO expone datos de contacto. */
async function destinatarios(req, res) {
  const { rows } = await db.query('SELECT * FROM campanias WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Campaña no encontrada' });
  const padres = (await obtenerDestinatarios(rows[0])).map(descifrarPadre);
  const lista = padres.map((p) => ({
    id: p.id, nombre: p.nombre_completo, canal_preferido: p.canal_preferido,
    tiene_contacto: Boolean(resolverDestino(p)),
  }));
  res.json({ total: lista.length, sin_contacto: lista.filter((p) => !p.tiene_contacto).length, destinatarios: lista });
}

/** Envía la campaña a todos los destinatarios, cada uno por su canal preferido. Solo se puede enviar una vez. */
async function enviar(req, res) {
  // "Candado": solo UNA petición logra pasar de borrador a enviando (evita envíos dobles por doble clic)
  const { rows: bloqueada } = await db.query(
    `UPDATE campanias SET estado = 'enviando' WHERE id = $1 AND estado = 'borrador' RETURNING *`, [req.params.id]
  );
  if (!bloqueada[0]) {
    const { rows } = await db.query('SELECT estado FROM campanias WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Campaña no encontrada' });
    return res.status(409).json({ error: `La campaña ya está en estado "${rows[0].estado}" y no se puede enviar de nuevo` });
  }
  const campania = bloqueada[0];
  let enviados = 0;
  let fallidos = 0;
  let total = 0;
  try {
    const padres = (await obtenerDestinatarios(campania)).map(descifrarPadre);
    total = padres.length;
    for (const padre of padres) {
      const destino = resolverDestino(padre);
      const resultado = destino
        ? await enviarPorCanal(padre.canal_preferido, destino, campania.titulo, campania.mensaje)
        : { exito: false, error: `Sin dato de contacto para el canal ${padre.canal_preferido}` };
      await db.query(
        `INSERT INTO notificaciones (padre_id, alerta_id, campania_id, canal, asunto, contenido, estado, enviado_en)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)`,
        [padre.id, campania.id, padre.canal_preferido, campania.titulo, campania.mensaje,
         resultado.exito ? 'enviado' : 'fallido', resultado.exito ? new Date() : null]
      );
      resultado.exito ? enviados++ : fallidos++;
    }
    const { rows } = await db.query(
      `UPDATE campanias SET estado='enviada', total_destinatarios=$2, total_enviados=$3, total_fallidos=$4, enviada_en=now()
       WHERE id=$1 RETURNING *`, [campania.id, total, enviados, fallidos]
    );
    res.json(rows[0]);
  } catch (error) {
    await db.query(
      `UPDATE campanias SET estado='interrumpida', total_destinatarios=$2, total_enviados=$3, total_fallidos=$4 WHERE id=$1`,
      [campania.id, total, enviados, fallidos]
    );
    res.status(500).json({ error: 'El envío se interrumpió', detalle: error.message, enviados_antes_del_error: enviados });
  }
}

/** Solo se pueden eliminar campañas que todavía son borrador */
async function eliminar(req, res) {
  const { rows } = await db.query(`DELETE FROM campanias WHERE id = $1 AND estado = 'borrador' RETURNING id`, [req.params.id]);
  if (rows[0]) return res.status(204).send();
  const { rows: existe } = await db.query('SELECT estado FROM campanias WHERE id = $1', [req.params.id]);
  if (!existe[0]) return res.status(404).json({ error: 'Campaña no encontrada' });
  res.status(409).json({ error: 'Solo se pueden eliminar campañas en borrador (las enviadas quedan como historial)' });
}

module.exports = { listar, crear, destinatarios, enviar, eliminar };
