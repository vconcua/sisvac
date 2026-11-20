/**
 * Cifra los datos personales que ya estaban guardados en texto plano en la
 * tabla `padres` (dpi, telefono, correo, telegram_chat_id) y calcula dpi_hash.
 * Es seguro correrlo más de una vez: omite lo que ya está cifrado.
 *
 * Uso (Docker):
 *   docker compose cp backend/scripts/cifrar_datos_existentes.js backend:/app/scripts/
 *   docker compose exec backend node scripts/cifrar_datos_existentes.js
 */
require('dotenv').config();
const db = require('../src/config/db');
const { cifrar, descifrar, esCifrado, hashDeterminista } = require('../src/utils/cifrado');

async function main() {
  const { rows } = await db.query('SELECT id, dpi, telefono, correo, telegram_chat_id, dpi_hash FROM padres');
  let actualizados = 0;

  for (const p of rows) {
    const nuevo = {
      dpi: esCifrado(p.dpi) ? p.dpi : cifrar(p.dpi),
      telefono: !p.telefono || esCifrado(p.telefono) ? p.telefono : cifrar(p.telefono),
      correo: !p.correo || esCifrado(p.correo) ? p.correo : cifrar(p.correo),
      telegram_chat_id: !p.telegram_chat_id || esCifrado(p.telegram_chat_id) ? p.telegram_chat_id : cifrar(p.telegram_chat_id),
      dpi_hash: p.dpi_hash || hashDeterminista(descifrar(p.dpi)),
    };
    const cambio = Object.keys(nuevo).some((k) => nuevo[k] !== p[k]);
    if (!cambio) continue;
    await db.query(
      'UPDATE padres SET dpi=$1, telefono=$2, correo=$3, telegram_chat_id=$4, dpi_hash=$5 WHERE id=$6',
      [nuevo.dpi, nuevo.telefono, nuevo.correo, nuevo.telegram_chat_id, nuevo.dpi_hash, p.id]
    );
    actualizados++;
  }
  console.log(`Padres revisados: ${rows.length} | cifrados/actualizados ahora: ${actualizados}`);
  process.exit(0);
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
