/**
 * Envío del carnet digital (enlace del QR + PIN) a los padres de un niño,
 * por el canal preferido de cada padre (correo, Telegram, WhatsApp o SMS).
 *
 * - Automático: se dispara cuando se vincula un padre con un niño (una sola vez por padre y niño).
 * - Manual: botón "Enviar carnet a los padres" en la ficha del niño (reenvía siempre).
 *
 * Cada envío queda registrado en la tabla notificaciones (tipo_aviso = 'carnet_digital').
 */
const db = require('../config/db');
const { enviarPorCanal, resolverDestino } = require('../utils/notificaciones');
const { descifrarPadre } = require('../utils/cifrado');

const TIPO = 'carnet_digital';

function mensajeCarnet(ninio, url) {
  return `Carnet digital de vacunación y crecimiento de ${ninio.nombre_completo}.\n` +
    `Ábralo aquí: ${url}\nPIN de acceso: ${ninio.qr_pin}\n` +
    'Guarde este mensaje y no comparta el PIN con otras personas. También puede presentar el código QR en su centro de salud.';
}

/**
 * @param {string} ninioId
 * @param {{padreId?: string, reenviar?: boolean}} opciones padreId: solo a ese padre; reenviar: aunque ya se le haya enviado
 * @returns {Promise<{enviados:number, fallidos:number, omitidos:number, sin_padres:boolean}>}
 */
async function enviarCarnetAPadres(ninioId, { padreId = null, reenviar = false } = {}) {
  const resumen = { enviados: 0, fallidos: 0, omitidos: 0, sin_padres: false };
  const { rows: n } = await db.query('SELECT * FROM ninios WHERE id = $1 AND activo = TRUE', [ninioId]);
  const ninio = n[0];
  if (!ninio) return null;

  const params = [ninioId];
  let filtro = '';
  if (padreId) { params.push(padreId); filtro = ' AND p.id = $2'; }
  const { rows } = await db.query(
    `SELECT p.* FROM padres p JOIN ninio_padre np ON np.padre_id = p.id WHERE np.ninio_id = $1${filtro}`, params);
  if (rows.length === 0) { resumen.sin_padres = true; return resumen; }

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${base}/carnet/${ninio.qr_codigo}`;
  const contenido = mensajeCarnet(ninio, url);
  const asunto = `Carnet digital de ${ninio.nombre_completo}`;

  for (const fila of rows) {
    const padre = descifrarPadre(fila); // contacto en claro solo en memoria
    if (!reenviar) {
      const { rows: previo } = await db.query(
        `SELECT 1 FROM notificaciones WHERE padre_id = $1 AND tipo_aviso = $2 AND estado = 'enviado' AND contenido LIKE $3 LIMIT 1`,
        [padre.id, TIPO, `%${ninio.qr_codigo}%`]);
      if (previo.length) { resumen.omitidos++; continue; }
    }
    const destino = resolverDestino(padre);
    const r = destino
      ? await enviarPorCanal(padre.canal_preferido, destino, asunto, contenido)
      : { exito: false, error: `Sin dato de contacto para el canal ${padre.canal_preferido}` };
    await db.query(
      `INSERT INTO notificaciones (padre_id, tipo_aviso, canal, asunto, contenido, estado, enviado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [padre.id, TIPO, padre.canal_preferido, asunto, contenido, r.exito ? 'enviado' : 'fallido', r.exito ? new Date() : null]);
    r.exito ? resumen.enviados++ : resumen.fallidos++;
  }
  return resumen;
}

/** Envío automático "sin esperar": nunca debe romper la respuesta de quien vincula. */
function enviarCarnetEnSegundoPlano(ninioId, padreId) {
  enviarCarnetAPadres(ninioId, { padreId }).catch((e) => console.error('No se pudo enviar el carnet automático:', e.message));
}

module.exports = { enviarCarnetAPadres, enviarCarnetEnSegundoPlano, mensajeCarnet };
