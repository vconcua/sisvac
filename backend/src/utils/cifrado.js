/**
 * Cifrado de datos personales en reposo (requisito de seguridad del enunciado).
 *
 * - Algoritmo: AES-256-GCM (cifrado autenticado: además de ocultar el dato,
 *   detecta si alguien lo alteró en la base de datos).
 * - Cada valor usa un IV aleatorio distinto, así que cifrar dos veces el mismo
 *   texto da resultados distintos (no se pueden comparar valores cifrados).
 * - Formato guardado: iv:authTag:datoCifrado (todo en base64).
 * - Como un valor cifrado no sirve para buscar ni para imponer UNICIDAD,
 *   el DPI además guarda un hash determinista (HMAC-SHA256) en `dpi_hash`.
 *
 * La clave se toma de la variable de entorno ENCRYPTION_KEY (64 caracteres
 * hexadecimales = 32 bytes). Si se pierde, los datos cifrados NO se pueden
 * recuperar; si se cambia sin recifrar, tampoco.
 */
const crypto = require('crypto');

const ALGORITMO = 'aes-256-gcm';
// iv (12 bytes -> 16 chars) : authTag (16 bytes -> 22 chars + "==") : datos
const PATRON_CIFRADO = /^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{22}==:[A-Za-z0-9+/]+={0,2}$/;

function obtenerClave() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada o es inválida. Debe tener 64 caracteres hexadecimales. ' +
      "Genera una con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, 'hex');
}

function esCifrado(valor) {
  return typeof valor === 'string' && PATRON_CIFRADO.test(valor);
}

/** Cifra un texto. null/undefined/'' se guardan como null. */
function cifrar(texto) {
  if (texto === null || texto === undefined || texto === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const datos = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${datos.toString('base64')}`;
}

/**
 * Descifra un valor. Si el valor NO tiene formato cifrado (dato antiguo en
 * texto plano, antes de correr el script de migración) se devuelve tal cual,
 * para que el sistema no se caiga durante la transición.
 */
function descifrar(valor) {
  if (valor === null || valor === undefined) return null;
  if (!esCifrado(valor)) return valor;
  const [ivB64, tagB64, datosB64] = valor.split(':');
  try {
    const decipher = crypto.createDecipheriv(ALGORITMO, obtenerClave(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(datosB64, 'base64')), decipher.final()]).toString('utf8');
  } catch (e) {
    if (e.message && e.message.startsWith('ENCRYPTION_KEY')) throw e;
    throw new Error('No se pudo descifrar el dato: la ENCRYPTION_KEY cambió o el dato fue alterado.');
  }
}

/** Hash determinista (HMAC-SHA256) para buscar/validar unicidad sin descifrar. */
function hashDeterminista(texto) {
  if (texto === null || texto === undefined || texto === '') return null;
  const clave = process.env.HASH_KEY ? Buffer.from(process.env.HASH_KEY, 'utf8') : obtenerClave();
  return crypto.createHmac('sha256', clave).update(String(texto).trim()).digest('hex');
}

/** Devuelve el padre con sus datos personales en claro y SIN campos internos. */
function descifrarPadre(padre) {
  if (!padre) return padre;
  const { dpi_hash, password_hash, ...resto } = padre;
  return {
    ...resto,
    dpi: descifrar(resto.dpi),
    telefono: descifrar(resto.telefono),
    correo: descifrar(resto.correo),
    telegram_chat_id: descifrar(resto.telegram_chat_id),
  };
}

/**
 * Llamar al arrancar: si la clave falta o es inválida, el servicio se detiene con un
 * mensaje claro (mejor que fallar después, a mitad de una petición de un usuario).
 */
function validarConfiguracionCifrado() {
  try {
    obtenerClave();
  } catch (e) {
    console.error('\n[SISVAC] ' + e.message + '\n');
    process.exit(1);
  }
}

module.exports = { cifrar, descifrar, esCifrado, hashDeterminista, descifrarPadre, validarConfiguracionCifrado };
