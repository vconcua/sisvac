/**
 * Avisos AUTOMÁTICOS a padres de familia (sección 3.7 del enunciado).
 *
 * Se ejecuta solo, una vez al día (cron local o EventBridge/Lambda), y hace dos cosas:
 *   1) Avisar a los padres de las alertas pendientes de sus hijos
 *      (vacuna atrasada, sin controles, percentiles fuera de rango).
 *   2) Recordar las vacunas que le tocan al niño en los próximos 7 días.
 *
 * Reglas para no molestar a las familias:
 *   - Mensajes amables y sin diagnósticos: invitan a acudir al centro de salud.
 *   - Nunca se repite el mismo aviso: cada envío queda registrado en
 *     `notificaciones` y se consulta antes de enviar.
 *   - Si un envío falla (por ejemplo, el padre no tiene teléfono) se reintenta
 *     al día siguiente, hasta 3 intentos en total.
 *   - Solo se avisan alertas de los últimos 30 días, para no inundar de
 *     mensajes viejos a las familias el día que se activa la función.
 */
const db = require('../config/db');
const { enviarPorCanal, resolverDestino } = require('../utils/notificaciones');
const { publicarAlertaCritica } = require('../utils/snsPublisher');
const { descifrarPadre } = require('../utils/cifrado');

const MAX_INTENTOS = 3;
const DIAS_ALERTA_VIGENTE = 30;
const DIAS_RECORDATORIO = 7;

function fechaLarga(fecha) {
  const f = new Date(fecha);
  const dd = String(f.getDate()).padStart(2, '0');
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${f.getFullYear()}`;
}

const PIE = 'Centro de Salud — Programa de Control de Crecimiento y Vacunación.';

/** Texto del aviso según el motivo de la alerta (pensado para familias, no para personal de salud). */
function mensajeParaAlerta(alerta, ninio, padre) {
  const nombre = ninio.nombre_completo;
  const cuerpoPorMotivo = {
    vacuna_atrasada:
      `Le recordamos que a ${nombre} le corresponde una dosis de vacuna que aún está pendiente. ` +
      'Le invitamos a visitar su centro de salud para ponerse al día; las vacunas lo protegen de enfermedades.',
    sin_seguimiento:
      `Hace tiempo que no vemos a ${nombre} en su control de crecimiento. ` +
      'Le invitamos a traerlo(a) al centro de salud para medir su peso y talla; así nos aseguramos de que crece sano(a).',
    percentil_peso_muy_bajo:
      `En el último control de ${nombre} nos gustaría darle seguimiento más cercano. ` +
      'Le invitamos a visitar el centro de salud para recibir orientación sobre su alimentación y crecimiento.',
    percentil_peso_bajo:
      `En el último control de ${nombre} nos gustaría darle seguimiento. ` +
      'Le invitamos a visitar el centro de salud para recibir orientación sobre su alimentación.',
    percentil_peso_alto:
      `En el último control de ${nombre} nos gustaría conversar con usted sobre su alimentación. ` +
      'Le invitamos a visitar el centro de salud para recibir orientación.',
    percentil_talla_muy_bajo:
      `En el último control de ${nombre} nos gustaría darle seguimiento a su crecimiento. ` +
      'Le invitamos a visitar el centro de salud para una revisión.',
  };
  const cuerpo = cuerpoPorMotivo[alerta.motivo] ||
    `El equipo del centro de salud desea darle seguimiento a ${nombre}. Le invitamos a visitarnos.`;
  return {
    asunto: `Aviso del centro de salud sobre ${nombre}`,
    contenido: `Estimado(a) ${padre.nombre_completo}:\n\n${cuerpo}\n\n${PIE}`,
  };
}

function mensajeRecordatorioVacuna(v, padre) {
  return {
    asunto: `Recordatorio de vacuna para ${v.nombre_ninio}`,
    contenido:
      `Estimado(a) ${padre.nombre_completo}:\n\n` +
      `Le recordamos que ${v.nombre_ninio} tiene programada la vacuna ${v.nombre_vacuna} ` +
      `(dosis ${v.dosis_numero}) para el ${fechaLarga(v.fecha_proxima_dosis)}. ` +
      'Le esperamos en su centro de salud; no olvide llevar el carnet de vacunación.\n\n' + PIE,
  };
}

/**
 * ¿Ya se envió (o se agotaron los intentos de) este aviso a este padre?
 * `clave` = { columna: 'alerta_id' | 'vacunacion_id', valor, tipo_aviso? }
 */
async function yaAvisado(cliente, padreId, clave) {
  const extra = clave.tipo_aviso ? 'AND tipo_aviso = $3' : '';
  const params = [padreId, clave.valor];
  if (clave.tipo_aviso) params.push(clave.tipo_aviso);
  const { rows } = await cliente.query(
    `SELECT
        COUNT(*) FILTER (WHERE estado IN ('enviado','pendiente')) AS ok,
        COUNT(*) FILTER (WHERE estado = 'fallido') AS fallidos
     FROM notificaciones
     WHERE padre_id = $1 AND ${clave.columna} = $2 ${extra}`,
    params
  );
  return Number(rows[0].ok) > 0 || Number(rows[0].fallidos) >= MAX_INTENTOS;
}

/** Envía por el canal preferido del padre y deja constancia en `notificaciones`. */
async function enviarYRegistrar(cliente, padre, { asunto, contenido, alerta_id = null, vacunacion_id = null, tipo_aviso }) {
  const destino = resolverDestino(padre);
  const resultado = destino
    ? await enviarPorCanal(padre.canal_preferido, destino, asunto, contenido)
    : { exito: false, error: `Sin dato de contacto para el canal ${padre.canal_preferido}` };
  await cliente.query(
    `INSERT INTO notificaciones (padre_id, alerta_id, vacunacion_id, tipo_aviso, canal, asunto, contenido, estado, enviado_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [padre.id, alerta_id, vacunacion_id, tipo_aviso, padre.canal_preferido, asunto, contenido,
      resultado.exito ? 'enviado' : 'fallido', resultado.exito ? new Date() : null]
  );
  return resultado.exito;
}

async function padresDelNinio(cliente, ninioId) {
  const { rows } = await cliente.query(
    `SELECT p.* FROM padres p JOIN ninio_padre np ON np.padre_id = p.id WHERE np.ninio_id = $1`,
    [ninioId]
  );
  return rows.map(descifrarPadre); // contacto en claro solo en memoria
}

/** 1) Avisa a los padres de las alertas pendientes recientes. */
async function avisarAlertasPendientes(cliente = db) {
  const resumen = { alertas_revisadas: 0, alertas_avisadas: 0, avisos_enviados: 0, avisos_fallidos: 0, sin_padres_vinculados: 0 };
  const { rows: alertas } = await cliente.query(
    `SELECT a.*, n.nombre_completo
     FROM alertas a JOIN ninios n ON n.id = a.ninio_id
     WHERE a.estado = 'pendiente' AND n.activo = TRUE
       AND a.creado_en > now() - interval '${DIAS_ALERTA_VIGENTE} days'
     ORDER BY a.creado_en`
  );
  for (const alerta of alertas) {
    resumen.alertas_revisadas++;
    const padres = await padresDelNinio(cliente, alerta.ninio_id);
    if (padres.length === 0) { resumen.sin_padres_vinculados++; continue; }
    let algunoEnviado = false;
    for (const padre of padres) {
      if (await yaAvisado(cliente, padre.id, { columna: 'alerta_id', valor: alerta.id })) continue;
      const msg = mensajeParaAlerta(alerta, alerta, padre);
      const ok = await enviarYRegistrar(cliente, padre, { ...msg, alerta_id: alerta.id, tipo_aviso: 'alerta_automatica' });
      if (ok) { resumen.avisos_enviados++; algunoEnviado = true; } else resumen.avisos_fallidos++;
    }
    if (algunoEnviado) {
      await cliente.query(`UPDATE alertas SET estado = 'enviada' WHERE id = $1 AND estado = 'pendiente'`, [alerta.id]);
      resumen.alertas_avisadas++;
      if (alerta.tipo === 'critica') {
        try {
          await publicarAlertaCritica('Alerta crítica de salud infantil', `${alerta.mensaje} (Niño ID: ${alerta.ninio_id})`);
        } catch (e) { console.error('[AVISOS] No se pudo publicar en SNS:', e.message); }
      }
    }
  }
  return resumen;
}

/** 2) Recuerda las vacunas que vencen en los próximos 7 días (a los 7 y a 1 día de la fecha). */
async function recordarVacunasProximas(cliente = db) {
  const resumen = { vacunas_revisadas: 0, recordatorios_enviados: 0, recordatorios_fallidos: 0, sin_padres_vinculados: 0 };
  const { rows } = await cliente.query(
    `SELECT v.id, v.ninio_id, v.fecha_proxima_dosis, vac.nombre AS nombre_vacuna, vac.dosis_numero,
            n.nombre_completo AS nombre_ninio, (v.fecha_proxima_dosis - CURRENT_DATE) AS dias_restantes
     FROM vacunaciones v
     JOIN vacunas vac ON vac.id = v.vacuna_id
     JOIN ninios n ON n.id = v.ninio_id
     WHERE v.estado = 'pendiente' AND n.activo = TRUE
       AND v.fecha_proxima_dosis BETWEEN CURRENT_DATE AND CURRENT_DATE + ${DIAS_RECORDATORIO}
     ORDER BY v.fecha_proxima_dosis`
  );
  for (const v of rows) {
    resumen.vacunas_revisadas++;
    const tipo = Number(v.dias_restantes) <= 1 ? 'recordatorio_vacuna_1d' : 'recordatorio_vacuna_7d';
    const padres = await padresDelNinio(cliente, v.ninio_id);
    if (padres.length === 0) { resumen.sin_padres_vinculados++; continue; }
    for (const padre of padres) {
      if (await yaAvisado(cliente, padre.id, { columna: 'vacunacion_id', valor: v.id, tipo_aviso: tipo })) continue;
      const ok = await enviarYRegistrar(cliente, padre, { ...mensajeRecordatorioVacuna(v, padre), vacunacion_id: v.id, tipo_aviso: tipo });
      if (ok) resumen.recordatorios_enviados++; else resumen.recordatorios_fallidos++;
    }
  }
  return resumen;
}

/** Corrida completa diaria. */
async function ejecutarAvisosAutomaticos(cliente = db) {
  const alertas = await avisarAlertasPendientes(cliente);
  const vacunas = await recordarVacunasProximas(cliente);
  return { alertas, vacunas };
}

module.exports = { ejecutarAvisosAutomaticos, avisarAlertasPendientes, recordarVacunasProximas, mensajeParaAlerta };
