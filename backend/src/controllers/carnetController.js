const crypto = require('crypto');
const db = require('../config/db');
const { enviarCarnetAPadres } = require('../services/carnetEnvio');
const { hashDeterminista } = require('../utils/cifrado');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { calcularEdadMeses } = require('../utils/percentiles');
const { generarQRCarnet } = require('../utils/qrGenerator');
const { subirQRNinio, obtenerUrlFirmada } = require('../utils/s3Uploader');

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

function pinCorrecto(guardado, recibido) {
  const a = Buffer.from(String(guardado || ''));
  const b = Buffer.from(String(recibido || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

/** ¿El carnet exige el DPI del padre/madre? Sí cuando el niño ya tiene un padre vinculado. La pantalla pública lo consulta para saber qué pedir. */
async function accesoCarnet(req, res) {
  const { qrCodigo } = req.params;
  if (!UUID.test(qrCodigo)) return res.status(404).json({ error: 'Carnet no encontrado' });
  const { rows } = await db.query('SELECT id FROM ninios WHERE qr_codigo = $1 AND activo = TRUE', [qrCodigo]);
  if (!rows[0]) return res.status(404).json({ error: 'Carnet no encontrado' });
  const { rows: p } = await db.query('SELECT 1 FROM ninio_padre WHERE ninio_id = $1 LIMIT 1', [rows[0].id]);
  res.json({ requiere_dpi: p.length > 0 });
}

/**
 * Consulta pública del carnet: se llega escaneando el QR. Doble verificación (sección 3.7 del enunciado):
 * el PIN del carnet y la autenticación del padre/madre con su DPI (si el niño ya tiene un padre vinculado).
 */
async function consultarCarnet(req, res) {
  const { qrCodigo } = req.params;
  const { pin, dpi } = req.body || {};
  if (!UUID.test(qrCodigo)) return res.status(404).json({ error: 'Carnet no encontrado' });

  const { rows } = await db.query('SELECT * FROM ninios WHERE qr_codigo = $1 AND activo = TRUE', [qrCodigo]);
  const ninio = rows[0];
  if (!ninio) return res.status(404).json({ error: 'Carnet no encontrado' });

  if (ninio.qr_bloqueado_hasta && new Date(ninio.qr_bloqueado_hasta) > new Date()) {
    return res.status(429).json({ error: `Demasiados intentos fallidos. Intente de nuevo en ${MINUTOS_BLOQUEO} minutos.` });
  }

  // ¿exige DPI? Solo si hay padres vinculados (si no hay nadie que autenticar, basta el PIN)
  const { rows: vinculados } = await db.query('SELECT p.dpi_hash FROM padres p JOIN ninio_padre np ON np.padre_id = p.id WHERE np.ninio_id = $1', [ninio.id]);
  const exigeDpi = vinculados.length > 0;
  if (exigeDpi && !String(dpi || '').trim()) {
    return res.status(400).json({ error: 'Escriba el DPI del padre o madre y el PIN del carnet.' });
  }
  const dpiCorrecto = !exigeDpi || vinculados.some((v) => v.dpi_hash === hashDeterminista(String(dpi).trim()));

  if (!pinCorrecto(ninio.qr_pin, pin) || !dpiCorrecto) {
    const { rows: r } = await db.query(
      `UPDATE ninios SET qr_intentos_fallidos = qr_intentos_fallidos + 1,
         qr_bloqueado_hasta = CASE WHEN qr_intentos_fallidos + 1 >= $2 THEN now() + ($3 || ' minutes')::interval ELSE qr_bloqueado_hasta END
       WHERE id = $1 RETURNING qr_intentos_fallidos`, [ninio.id, MAX_INTENTOS, String(MINUTOS_BLOQUEO)]);
    const restantes = Math.max(0, MAX_INTENTOS - r[0].qr_intentos_fallidos);
    return res.status(401).json({ error: restantes > 0 ? `PIN o DPI incorrectos. Le quedan ${restantes} intento(s).` : `PIN o DPI incorrectos. Carnet bloqueado por ${MINUTOS_BLOQUEO} minutos.` });
  }
  await db.query('UPDATE ninios SET qr_intentos_fallidos = 0, qr_bloqueado_hasta = NULL WHERE id = $1 AND (qr_intentos_fallidos > 0 OR qr_bloqueado_hasta IS NOT NULL)', [ninio.id]);

  const { rows: crecimiento } = await db.query(
    'SELECT fecha_medicion, peso_kg, talla_cm, percentil_peso, percentil_talla FROM registros_crecimiento WHERE ninio_id=$1 ORDER BY fecha_medicion',
    [ninio.id]
  );
  const { rows: vacunacion } = await db.query(
    `SELECT v.nombre, v.dosis_numero, vc.estado, vc.fecha_aplicada, vc.fecha_proxima_dosis
     FROM vacunaciones vc JOIN vacunas v ON v.id = vc.vacuna_id
     WHERE vc.ninio_id = $1 ORDER BY vc.fecha_proxima_dosis`,
    [ninio.id]
  );
  const { rows: cs } = await db.query(
    `SELECT c.nombre AS comunidad, cs.nombre AS centro_salud FROM comunidades c LEFT JOIN centros_salud cs ON cs.id = c.centro_salud_id WHERE c.id = $1`, [ninio.comunidad_id]);

  res.json({
    nombre: ninio.nombre_completo,
    fecha_nacimiento: ninio.fecha_nacimiento,
    edad_meses: calcularEdadMeses(ninio.fecha_nacimiento),
    sexo: ninio.sexo,
    comunidad: cs[0]?.comunidad || null,
    centro_salud: cs[0]?.centro_salud || null,
    historial_crecimiento: crecimiento,
    esquema_vacunacion: vacunacion,
  });
}

/**
 * Genera/regenera la imagen QR del carnet de un niño. Si S3_BUCKET_NAME
 * está configurado (despliegue en AWS), la imagen se sube a S3 y se
 * devuelve una URL firmada temporal en vez del Data URL.
 */
async function obtenerImagenQR(req, res) {
  const { rows } = await db.query('SELECT * FROM ninios WHERE id=$1', [req.params.ninioId]);
  const ninio = rows[0];
  if (!ninio) return res.status(404).json({ error: 'Niño no encontrado' });

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { url, dataUrl } = await generarQRCarnet(ninio.qr_codigo, baseUrl);

  if (process.env.S3_BUCKET_NAME) {
    try {
      const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
      const key = await subirQRNinio(ninio.id, buffer);
      const urlFirmada = await obtenerUrlFirmada(key);
      return res.json({ url, qr_imagen_url: urlFirmada, qr_imagen_base64: dataUrl, pin: ninio.qr_pin, nombre: ninio.nombre_completo });
    } catch (error) {
      console.error('Error al subir QR a S3, se devuelve dataUrl como respaldo:', error.message);
    }
  }

  res.json({ url, qr_imagen_base64: dataUrl, pin: ninio.qr_pin, nombre: ninio.nombre_completo });
}

/** Reenvía el carnet (enlace + PIN) a los padres vinculados, por su canal preferido. */
async function enviarCarnet(req, res) {
  const r = await enviarCarnetAPadres(req.params.ninioId, { reenviar: true });
  if (!r) return res.status(404).json({ error: 'Niño no encontrado' });
  if (r.sin_padres) return res.status(409).json({ error: 'El niño no tiene padres vinculados. Vincule un padre o madre primero.' });
  res.json(r);
}

module.exports = { consultarCarnet, accesoCarnet, obtenerImagenQR, enviarCarnet };
