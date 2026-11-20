/**
 * Importa un CSV de establecimientos de salud (exportado del MSPAS o
 * preparado por el usuario, ej. desde Excel) hacia la tabla `centros_salud`.
 *
 * USO:
 *   node scripts/importar_centros_salud.js /ruta/al/archivo.csv
 *
 * Con Docker:
 *   docker compose cp mi_archivo.csv backend:/app/establecimientos.csv
 *   docker compose exec backend node scripts/importar_centros_salud.js /app/establecimientos.csv
 */
const fs = require('fs');
const db = require('../src/config/db');

const MAPEO_COLUMNAS = {
  nombre: ['nombre', 'establecimiento', 'nombre del establecimiento', 'nombre_establecimiento'],
  tipo: ['tipo', 'tipo de establecimiento', 'tipo_establecimiento', 'categoria'],
  departamento: ['departamento'],
  municipio: ['municipio', 'municipio / zona', 'municipio/zona'],
  comunidad_sector: ['comunidad / sector', 'comunidad/sector', 'comunidad', 'sector'],
  nivel_atencion: ['nivel de atencion', 'nivel_atencion', 'nivel'],
  servicios_principales: ['servicios principales', 'servicios_principales', 'servicios'],
  direccion: ['direccion', 'ubicacion'],
  telefono: ['telefono', 'tel'],
  latitud: ['latitud', 'lat'],
  longitud: ['longitud', 'lng', 'lon'],
};

function normalizarTipo(tipoOriginal) {
  const t = normalizar(tipoOriginal);
  if (!t) return null;
  if (t.includes('hospital')) return 'Hospital';
  if (t.includes('caimi')) return 'CAIMI';
  if (t.includes('cap')) return 'CAP';
  if (t.includes('puesto')) return 'Puesto de Salud';
  if (t.includes('farmacia') || t.includes('proam')) return 'Farmacia PROAM';
  if (t.includes('centro de salud')) return 'Centro de Salud';
  return null;
}

function separarZona(municipioTexto) {
  if (!municipioTexto) return { base: null, zona: null };
  const match = municipioTexto.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { base: match[1].trim(), zona: match[2].trim() };
  return { base: municipioTexto.trim(), zona: null };
}

function normalizar(texto) {
  return (texto || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parsearCSV(contenido) {
  const primeraLinea = contenido.split(/\r?\n/, 1)[0] || '';
  const delimitador = (primeraLinea.match(/;/g) || []).length > (primeraLinea.match(/,/g) || []).length ? ';' : ',';

  const filas = [];
  let filaActual = [];
  let campoActual = '';
  let dentroDeComillas = false;

  for (let i = 0; i < contenido.length; i++) {
    const char = contenido[i];
    const siguiente = contenido[i + 1];

    if (dentroDeComillas) {
      if (char === '"' && siguiente === '"') { campoActual += '"'; i++; }
      else if (char === '"') { dentroDeComillas = false; }
      else { campoActual += char; }
    } else {
      if (char === '"') dentroDeComillas = true;
      else if (char === delimitador) { filaActual.push(campoActual); campoActual = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && siguiente === '\n') continue;
        filaActual.push(campoActual);
        if (filaActual.some((c) => c.trim() !== '')) filas.push(filaActual);
        filaActual = [];
        campoActual = '';
      } else { campoActual += char; }
    }
  }
  if (campoActual !== '' || filaActual.length > 0) {
    filaActual.push(campoActual);
    filas.push(filaActual);
  }
  return filas;
}

function construirIndiceColumnas(encabezado) {
  const encabezadoNormalizado = encabezado.map(normalizar);
  const indices = {};
  for (const [campo, candidatos] of Object.entries(MAPEO_COLUMNAS)) {
    const idx = encabezadoNormalizado.findIndex((col) => candidatos.includes(col));
    indices[campo] = idx;
    if (idx === -1) {
      console.warn(`⚠️  Columna no encontrada para "${campo}" (candidatos probados: ${candidatos.join(', ')})`);
    }
  }
  return indices;
}

async function cargarCatalogo() {
  const { rows: departamentos } = await db.query('SELECT id, nombre FROM departamentos');
  const { rows: municipios } = await db.query('SELECT id, nombre, departamento_id FROM municipios');
  const mapaDepartamentos = new Map(departamentos.map((d) => [normalizar(d.nombre), d.id]));
  const mapaMunicipios = new Map(municipios.map((m) => [`${m.departamento_id}::${normalizar(m.nombre)}`, m.id]));
  return { mapaDepartamentos, mapaMunicipios };
}

async function main() {
  const rutaArchivo = process.argv[2];
  if (!rutaArchivo) {
    console.error('Uso: node scripts/importar_centros_salud.js /ruta/al/archivo.csv');
    process.exit(1);
  }
  if (!fs.existsSync(rutaArchivo)) {
    console.error(`No se encontró el archivo: ${rutaArchivo}`);
    process.exit(1);
  }

  const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
  const filas = parsearCSV(contenido);
  if (filas.length < 2) {
    console.error('El archivo no parece tener datos (¿está vacío?)');
    process.exit(1);
  }

  const encabezado = filas[0];
  console.log('Encabezado detectado en el CSV:', encabezado.join(' | '));
  const idx = construirIndiceColumnas(encabezado);

  const { mapaDepartamentos, mapaMunicipios } = await cargarCatalogo();

  let insertados = 0;
  let sinDepartamento = 0;
  let sinMunicipio = 0;
  let tipoNoReconocido = 0;
  const departamentosNoEncontrados = new Set();
  const municipiosNoEncontrados = new Set();

  for (let f = 1; f < filas.length; f++) {
    const fila = filas[f];
    const nombre = idx.nombre >= 0 ? fila[idx.nombre]?.trim() : null;
    if (!nombre) continue;

    const depTexto = idx.departamento >= 0 ? fila[idx.departamento]?.trim() : null;
    const munTextoCrudo = idx.municipio >= 0 ? fila[idx.municipio]?.trim() : null;
    const { base: munBase, zona } = separarZona(munTextoCrudo);

    let departamentoId = null;
    let municipioId = null;

    if (depTexto) {
      departamentoId = mapaDepartamentos.get(normalizar(depTexto)) || null;
      if (!departamentoId) { sinDepartamento++; departamentosNoEncontrados.add(depTexto); }
    }
    if (munBase && departamentoId) {
      municipioId = mapaMunicipios.get(`${departamentoId}::${normalizar(munBase)}`) || null;
      if (!municipioId) { sinMunicipio++; municipiosNoEncontrados.add(`${munBase} (${depTexto})`); }
    }

    const tipoOriginal = idx.tipo >= 0 ? fila[idx.tipo]?.trim() || null : null;
    const tipoNormalizado = normalizarTipo(tipoOriginal);
    if (tipoOriginal && !tipoNormalizado) tipoNoReconocido++;

    const comunidadSectorOriginal = idx.comunidad_sector >= 0 ? fila[idx.comunidad_sector]?.trim() || null : null;
    const comunidadSector = zona
      ? [zona, comunidadSectorOriginal].filter(Boolean).join(' — ')
      : comunidadSectorOriginal;

    await db.query(
      `INSERT INTO centros_salud
        (nombre, tipo_establecimiento, detalle_tipo, departamento_id, municipio_id,
         comunidad_sector, nivel_atencion, servicios_principales, direccion, telefono, latitud, longitud, fuente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        nombre,
        tipoNormalizado,
        tipoOriginal,
        departamentoId,
        municipioId,
        comunidadSector,
        idx.nivel_atencion >= 0 ? fila[idx.nivel_atencion]?.trim() || null : null,
        idx.servicios_principales >= 0 ? fila[idx.servicios_principales]?.trim() || null : null,
        idx.direccion >= 0 ? fila[idx.direccion]?.trim() || null : null,
        idx.telefono >= 0 ? fila[idx.telefono]?.trim() || null : null,
        idx.latitud >= 0 && fila[idx.latitud] ? Number(fila[idx.latitud]) || null : null,
        idx.longitud >= 0 && fila[idx.longitud] ? Number(fila[idx.longitud]) || null : null,
        'Listado propio del estudiante',
      ]
    );
    insertados++;
  }

  console.log('\n============ Resumen de la importación ============');
  console.log(`Establecimientos insertados: ${insertados}`);
  console.log(`Sin departamento reconocido: ${sinDepartamento}`);
  console.log(`Sin municipio reconocido: ${sinMunicipio}`);
  console.log(`Tipo no reconocido (queda solo en detalle_tipo): ${tipoNoReconocido}`);
  if (departamentosNoEncontrados.size) {
    console.log('\nDepartamentos no reconocidos:', [...departamentosNoEncontrados].join(', '));
  }
  if (municipiosNoEncontrados.size) {
    console.log('\nMunicipios no reconocidos:', [...municipiosNoEncontrados].join(', '));
  }
  console.log('=====================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
