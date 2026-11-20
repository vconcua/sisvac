const db = require('../config/db');
const { archivarDocumento } = require('../utils/s3Uploader');
const { generarExcel, generarPDF } = require('../utils/exportador');

// ======================= Reportes del panel (ya existían) =======================
async function resumenGeneral(req, res) {
  const [ninios, alertasPendientes, vacunasAtrasadas, comunidades] = await Promise.all([
    db.query('SELECT COUNT(*) FROM ninios WHERE activo = TRUE'),
    db.query(`SELECT COUNT(*) FROM alertas WHERE estado = 'pendiente'`),
    db.query(`SELECT COUNT(*) FROM vacunaciones WHERE estado = 'atrasada'`),
    db.query('SELECT COUNT(*) FROM comunidades'),
  ]);
  res.json({
    total_ninios: Number(ninios.rows[0].count),
    alertas_pendientes: Number(alertasPendientes.rows[0].count),
    vacunas_atrasadas: Number(vacunasAtrasadas.rows[0].count),
    total_comunidades: Number(comunidades.rows[0].count),
  });
}

async function coberturaVacunacion(req, res) {
  const { rows } = await db.query('SELECT * FROM vw_cobertura_vacunacion_comunidad ORDER BY comunidad');
  res.json(rows);
}

async function distribucionNutricional(req, res) {
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE percentil_peso < 3) AS desnutricion_severa,
      COUNT(*) FILTER (WHERE percentil_peso >= 3 AND percentil_peso < 5) AS riesgo_desnutricion,
      COUNT(*) FILTER (WHERE percentil_peso >= 5 AND percentil_peso <= 95) AS normal,
      COUNT(*) FILTER (WHERE percentil_peso > 95) AS sobrepeso
    FROM vw_ultimo_registro_ninio
  `);
  res.json(rows[0]);
}

// ============== Reportes nominales (sección 3.9 del enunciado) ==============
const DIAS_POR_MES = 30.4375;
const num = (v) => (v === null || v === undefined ? null : Number(v));
const fecha = (v) => {
  if (!v) return null;
  const f = new Date(v);
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
};

const UNIONES_UBICACION = `
  LEFT JOIN comunidades c ON c.id = n.comunidad_id
  LEFT JOIN departamentos d ON d.id = c.departamento_id`;

/** Lista NOMINAL de niños con bajo peso / sobrepeso / talla baja (según su última medición) */
async function construirNiniosRiesgo({ tipo, comunidad_id }) {
  const condiciones = ['n.activo = TRUE'];
  const params = [];
  const titulos = {
    bajo_peso: 'Niños con bajo peso',
    sobrepeso: 'Niños con sobrepeso',
    talla_baja: 'Niños con talla baja',
  };
  if (tipo === 'bajo_peso') condiciones.push('u.percentil_peso < 5');
  else if (tipo === 'sobrepeso') condiciones.push('u.percentil_peso > 95');
  else if (tipo === 'talla_baja') condiciones.push('u.percentil_talla < 5');
  else condiciones.push('(u.percentil_peso < 5 OR u.percentil_peso > 95 OR u.percentil_talla < 5)');
  if (comunidad_id) { params.push(comunidad_id); condiciones.push(`n.comunidad_id = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT n.nombre_completo AS nombre, n.sexo,
            ROUND(((CURRENT_DATE - n.fecha_nacimiento) / ${DIAS_POR_MES})::numeric, 1) AS edad_meses,
            c.nombre AS comunidad, COALESCE(d.nombre, c.departamento) AS departamento,
            u.fecha_medicion, u.peso_kg, u.talla_cm, u.percentil_peso, u.percentil_talla,
            CASE WHEN u.percentil_peso < 3 THEN 'Bajo peso severo'
                 WHEN u.percentil_peso < 5 THEN 'Bajo peso (posible desnutrición)'
                 WHEN u.percentil_peso > 95 THEN 'Sobrepeso'
                 WHEN u.percentil_talla < 5 THEN 'Talla baja' END AS categoria
     FROM ninios n
     JOIN vw_ultimo_registro_ninio u ON u.ninio_id = n.id
     ${UNIONES_UBICACION}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY u.percentil_peso, n.nombre_completo`,
    params
  );
  return {
    titulo: titulos[tipo] || 'Niños en riesgo nutricional',
    columnas: [
      { key: 'nombre', label: 'Nombre', peso: 2.2 },
      { key: 'sexo', label: 'Sexo', peso: 0.6 },
      { key: 'edad_meses', label: 'Edad (meses)', peso: 0.9 },
      { key: 'comunidad', label: 'Comunidad', peso: 1.6 },
      { key: 'departamento', label: 'Departamento', peso: 1.3 },
      { key: 'fecha_medicion', label: 'Última medición', peso: 1.1 },
      { key: 'peso_kg', label: 'Peso (kg)', peso: 0.8 },
      { key: 'talla_cm', label: 'Talla (cm)', peso: 0.8 },
      { key: 'percentil_peso', label: 'Percentil peso', peso: 0.9 },
      { key: 'percentil_talla', label: 'Percentil talla', peso: 0.9 },
      { key: 'categoria', label: 'Categoría', peso: 1.5 },
    ],
    filas: rows.map((r) => ({
      ...r,
      edad_meses: num(r.edad_meses), fecha_medicion: fecha(r.fecha_medicion),
      peso_kg: num(r.peso_kg), talla_cm: num(r.talla_cm),
      percentil_peso: num(r.percentil_peso), percentil_talla: num(r.percentil_talla),
    })),
  };
}

/** Lista NOMINAL de niños con dosis vencidas (fecha ya pasada y sin aplicar) */
async function construirVacunasIncompletas({ comunidad_id }) {
  const params = [];
  let filtro = '';
  if (comunidad_id) { params.push(comunidad_id); filtro = `AND n.comunidad_id = $${params.length}`; }
  const vencida = `v.estado <> 'aplicada' AND v.fecha_proxima_dosis <= CURRENT_DATE`;
  const { rows } = await db.query(
    `SELECT n.nombre_completo AS nombre, c.nombre AS comunidad, COALESCE(d.nombre, c.departamento) AS departamento,
            COUNT(*) FILTER (WHERE ${vencida}) AS dosis_vencidas,
            COUNT(*) FILTER (WHERE v.estado = 'aplicada') AS dosis_aplicadas,
            COUNT(*) AS total_dosis,
            MIN(v.fecha_proxima_dosis) FILTER (WHERE ${vencida}) AS vencida_desde
     FROM ninios n
     JOIN vacunaciones v ON v.ninio_id = n.id
     ${UNIONES_UBICACION}
     WHERE n.activo = TRUE ${filtro}
     GROUP BY n.id, c.nombre, d.nombre, c.departamento
     HAVING COUNT(*) FILTER (WHERE ${vencida}) > 0
     ORDER BY dosis_vencidas DESC, n.nombre_completo`,
    params
  );
  return {
    titulo: 'Niños con vacunas incompletas (dosis vencidas)',
    columnas: [
      { key: 'nombre', label: 'Nombre', peso: 2.2 },
      { key: 'comunidad', label: 'Comunidad', peso: 1.7 },
      { key: 'departamento', label: 'Departamento', peso: 1.4 },
      { key: 'dosis_vencidas', label: 'Dosis vencidas', peso: 1 },
      { key: 'dosis_aplicadas', label: 'Dosis aplicadas', peso: 1 },
      { key: 'total_dosis', label: 'Total esquema', peso: 1 },
      { key: 'avance_pct', label: 'Avance (%)', peso: 0.9 },
      { key: 'vencida_desde', label: 'Vencida desde', peso: 1.2 },
    ],
    filas: rows.map((r) => ({
      ...r,
      dosis_vencidas: num(r.dosis_vencidas), dosis_aplicadas: num(r.dosis_aplicadas), total_dosis: num(r.total_dosis),
      avance_pct: Math.round((Number(r.dosis_aplicadas) / Number(r.total_dosis)) * 100),
      vencida_desde: fecha(r.vencida_desde),
    })),
  };
}

/** Crecimiento promedio por región (departamento), con la última medición de cada niño */
async function construirCrecimientoPorRegion() {
  const { rows } = await db.query(
    `SELECT COALESCE(d.nombre, c.departamento, 'Sin departamento') AS region,
            COUNT(*) AS ninios_medidos,
            ROUND(AVG(u.peso_kg), 2) AS peso_promedio_kg,
            ROUND(AVG(u.talla_cm), 1) AS talla_promedio_cm,
            ROUND(AVG(u.percentil_peso), 1) AS percentil_peso_promedio,
            ROUND(AVG(u.percentil_talla), 1) AS percentil_talla_promedio
     FROM ninios n
     JOIN vw_ultimo_registro_ninio u ON u.ninio_id = n.id
     ${UNIONES_UBICACION}
     WHERE n.activo = TRUE
     GROUP BY 1
     ORDER BY 1`
  );
  return {
    titulo: 'Crecimiento promedio por región',
    columnas: [
      { key: 'region', label: 'Región (departamento)', peso: 2 },
      { key: 'ninios_medidos', label: 'Niños medidos', peso: 1 },
      { key: 'peso_promedio_kg', label: 'Peso promedio (kg)', peso: 1.2 },
      { key: 'talla_promedio_cm', label: 'Talla promedio (cm)', peso: 1.2 },
      { key: 'percentil_peso_promedio', label: 'Percentil peso prom.', peso: 1.3 },
      { key: 'percentil_talla_promedio', label: 'Percentil talla prom.', peso: 1.3 },
    ],
    filas: rows.map((r) => ({
      region: r.region, ninios_medidos: num(r.ninios_medidos),
      peso_promedio_kg: num(r.peso_promedio_kg), talla_promedio_cm: num(r.talla_promedio_cm),
      percentil_peso_promedio: num(r.percentil_peso_promedio), percentil_talla_promedio: num(r.percentil_talla_promedio),
    })),
  };
}

/** Cobertura de vacunación por comunidad (versión exportable) */
async function construirCobertura() {
  const { rows } = await db.query('SELECT * FROM vw_cobertura_vacunacion_comunidad ORDER BY comunidad');
  return {
    titulo: 'Cobertura de vacunación por comunidad',
    columnas: [
      { key: 'comunidad', label: 'Comunidad', peso: 2 },
      { key: 'aplicadas', label: 'Dosis aplicadas', peso: 1 },
      { key: 'total', label: 'Total de dosis', peso: 1 },
      { key: 'porcentaje_cobertura', label: 'Cobertura (%)', peso: 1 },
    ],
    filas: rows.map((r) => ({ comunidad: r.comunidad, aplicadas: num(r.aplicadas), total: num(r.total), porcentaje_cobertura: num(r.porcentaje_cobertura) })),
  };
}

const REPORTES = {
  'ninios-riesgo': construirNiniosRiesgo,
  'vacunas-incompletas': construirVacunasIncompletas,
  'crecimiento-por-region': construirCrecimientoPorRegion,
  'cobertura-vacunacion': construirCobertura,
};

/** Devuelve un reporte nominal en JSON (para mostrarlo en pantalla) */
async function obtenerReporte(req, res) {
  const construir = REPORTES[req.params.nombre];
  if (!construir) return res.status(404).json({ error: `Reporte desconocido. Opciones: ${Object.keys(REPORTES).join(', ')}` });
  try {
    res.json(await construir(req.query));
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el reporte', detalle: error.message });
  }
}

/** Descarga un reporte como Excel (xlsx) o PDF */
async function exportar(req, res) {
  const construir = REPORTES[req.params.nombre];
  if (!construir) return res.status(404).json({ error: `Reporte desconocido. Opciones: ${Object.keys(REPORTES).join(', ')}` });
  const formato = String(req.query.formato || 'xlsx').toLowerCase();
  if (!['xlsx', 'pdf'].includes(formato)) return res.status(400).json({ error: "formato debe ser 'xlsx' o 'pdf'" });
  try {
    const reporte = await construir(req.query);
    const buffer = formato === 'xlsx' ? await generarExcel(reporte) : await generarPDF(reporte);
    const nombreArchivo = `${req.params.nombre}_${new Date().toISOString().slice(0, 10)}.${formato}`;
    const tipoMime = formato === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
    archivarDocumento(buffer, nombreArchivo, tipoMime, 'reportes'); // copia en S3 (si está configurado), sin esperar
    res.setHeader('Content-Type', tipoMime);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar el reporte', detalle: error.message });
  }
}

module.exports = { resumenGeneral, coberturaVacunacion, distribucionNutricional, obtenerReporte, exportar };
