const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_NAME;

async function subirArchivo(buffer, key, contentType) {
  if (!BUCKET) {
    throw new Error('S3_BUCKET_NAME no está configurado en las variables de entorno');
  }
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType })
  );
  return { bucket: BUCKET, key };
}

async function obtenerUrlFirmada(key, expiraEnSegundos = 3600) {
  const comando = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, comando, { expiresIn: expiraEnSegundos });
}

async function subirQRNinio(ninioId, bufferPng) {
  const key = `qr/${ninioId}.png`;
  await subirArchivo(bufferPng, key, 'image/png');
  return key;
}

/**
 * Archiva en S3 un documento generado por el sistema (reportes Excel/PDF) en
 * documentos/<tipo>/<AAAA-MM-DD>/<nombre>. Es opcional: sin S3_BUCKET_NAME no hace nada,
 * y un fallo de S3 nunca debe impedir la descarga del usuario.
 */
async function archivarDocumento(buffer, nombreArchivo, contentType, tipo = 'reportes') {
  if (!BUCKET) return null;
  try {
    const fecha = new Date().toISOString().slice(0, 10);
    const limpio = String(nombreArchivo).replace(/[^A-Za-z0-9._-]/g, '_');
    const key = `documentos/${tipo}/${fecha}/${Date.now()}_${limpio}`;
    await subirArchivo(buffer, key, contentType);
    return key;
  } catch (error) {
    console.error('No se pudo archivar el documento en S3:', error.message);
    return null;
  }
}

module.exports = { subirArchivo, obtenerUrlFirmada, subirQRNinio, archivarDocumento };
