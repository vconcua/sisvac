import React, { useEffect, useState } from 'react';
import api from '../api/api';

const FORM_VACIO = { titulo: '', mensaje: '', comunidad_id: '', edad_min_meses: '', edad_max_meses: '', estado_vacunacion_filtro: '' };

const ETIQUETA_ESTADO = { borrador: 'Borrador', enviando: 'Enviando...', enviada: 'Enviada', interrumpida: 'Interrumpida' };
const CLASE_ESTADO = { borrador: 'badge-preventiva', enviando: 'badge-preventiva', enviada: 'badge-ok', interrumpida: 'badge-critica' };

function resumenSegmentacion(c) {
  const partes = [];
  partes.push(c.comunidad_nombre ? `Comunidad: ${c.comunidad_nombre}` : 'Todas las comunidades');
  if (c.edad_min_meses !== null && c.edad_max_meses !== null) partes.push(`niños de ${c.edad_min_meses} a ${c.edad_max_meses} meses`);
  else if (c.edad_min_meses !== null) partes.push(`niños de ${c.edad_min_meses} meses en adelante`);
  else if (c.edad_max_meses !== null) partes.push(`niños de hasta ${c.edad_max_meses} meses`);
  if (c.estado_vacunacion_filtro) partes.push(`vacunación ${c.estado_vacunacion_filtro}`);
  return partes.join(' · ');
}

export default function Campanias() {
  const [campanias, setCampanias] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState(null); // { id, total, sin_contacto, destinatarios }

  const cargar = () => api.get('/campanias').then((res) => setCampanias(res.data));

  useEffect(() => {
    cargar();
    api.get('/comunidades').then((res) => setComunidades(res.data)).catch(() => {});
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await api.post('/campanias', form);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      setMensaje('Campaña creada como borrador. Revisa los destinatarios antes de enviarla.');
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear la campaña');
    }
  };

  const verDestinatarios = async (id) => {
    setError('');
    if (vistaPrevia && vistaPrevia.id === id) { setVistaPrevia(null); return; }
    try {
      const { data } = await api.get(`/campanias/${id}/destinatarios`);
      setVistaPrevia({ id, ...data });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo calcular los destinatarios');
    }
  };

  const enviar = async (c) => {
    setError('');
    setMensaje('');
    try {
      const { data } = await api.get(`/campanias/${c.id}/destinatarios`);
      if (data.total === 0) { setError('Esta campaña no tiene destinatarios con los filtros elegidos.'); return; }
      const aviso = `Se enviará "${c.titulo}" a ${data.total} padre(s)/madre(s)` +
        (data.sin_contacto ? ` (${data.sin_contacto} no tienen dato de contacto y quedarán como fallidos)` : '') +
        '. Esta acción no se puede deshacer. ¿Continuar?';
      if (!window.confirm(aviso)) return;
      const res = await api.post(`/campanias/${c.id}/enviar`);
      setMensaje(`Campaña enviada: ${res.data.total_enviados} enviados, ${res.data.total_fallidos} fallidos.`);
      setVistaPrevia(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar la campaña');
    }
    cargar();
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar el borrador "${c.titulo}"?`)) return;
    setError('');
    try {
      await api.delete(`/campanias/${c.id}`);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <h1>Campañas de comunicación</h1>
      <p style={{ color: '#666', maxWidth: 650 }}>
        Envía un mismo mensaje a muchas familias a la vez (jornadas de vacunación, controles médicos).
        Cada padre lo recibe por su canal preferido. Segmenta por comunidad, edad del niño y estado de vacunación.
      </p>

      <button onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? 'Cancelar' : '+ Nueva campaña'}</button>

      {mostrarForm && (
        <form onSubmit={guardar} className="card" style={{ marginTop: '1rem', maxWidth: 520 }}>
          <input placeholder="Título (ej. Jornada de vacunación)" value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength={200} />
          <textarea placeholder="Mensaje que recibirán los padres" value={form.mensaje} rows={4}
            onChange={(e) => setForm({ ...form, mensaje: e.target.value })} required
            style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e0e0e0', marginBottom: '0.8rem' }} />

          <h4 style={{ margin: '0.5rem 0' }}>¿A quiénes enviar? (opcional, sin filtros llega a todos)</h4>
          <label>Comunidad</label>
          <select value={form.comunidad_id} onChange={(e) => setForm({ ...form, comunidad_id: e.target.value })}>
            <option value="">Todas las comunidades</option>
            {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div style={{ flex: 1 }}>
              <label>Edad mínima del niño (meses)</label>
              <input type="number" min="0" value={form.edad_min_meses}
                onChange={(e) => setForm({ ...form, edad_min_meses: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Edad máxima (meses)</label>
              <input type="number" min="0" value={form.edad_max_meses}
                onChange={(e) => setForm({ ...form, edad_max_meses: e.target.value })} />
            </div>
          </div>

          <label>Estado de vacunación del niño</label>
          <select value={form.estado_vacunacion_filtro} onChange={(e) => setForm({ ...form, estado_vacunacion_filtro: e.target.value })}>
            <option value="">Cualquiera</option>
            <option value="atrasada">Con dosis atrasadas</option>
            <option value="pendiente">Con dosis pendientes</option>
            <option value="aplicada">Con dosis aplicadas</option>
          </select>

          <button type="submit">Guardar como borrador</button>
        </form>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {mensaje && <p style={{ color: '#0b6e4f' }}>{mensaje}</p>}

      <div className="card" style={{ marginTop: '1rem', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Campaña</th><th>Segmentación</th><th>Estado</th><th>Resultado</th><th></th></tr>
          </thead>
          <tbody>
            {campanias.map((c) => (
              <React.Fragment key={c.id}>
                <tr>
                  <td><strong>{c.titulo}</strong><br /><span style={{ color: '#777', fontSize: '0.85rem' }}>{c.mensaje.length > 70 ? c.mensaje.slice(0, 70) + '…' : c.mensaje}</span></td>
                  <td style={{ fontSize: '0.9rem' }}>{resumenSegmentacion(c)}</td>
                  <td><span className={`badge ${CLASE_ESTADO[c.estado] || 'badge-preventiva'}`}>{ETIQUETA_ESTADO[c.estado] || c.estado}</span></td>
                  <td>
                    {c.total_destinatarios === null || c.total_destinatarios === undefined
                      ? '—'
                      : `${c.total_enviados} de ${c.total_destinatarios} enviados${c.total_fallidos ? ` (${c.total_fallidos} fallidos)` : ''}`}
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button onClick={() => verDestinatarios(c.id)}>{vistaPrevia && vistaPrevia.id === c.id ? 'Ocultar' : 'Ver destinatarios'}</button>
                    {c.estado === 'borrador' && <button onClick={() => enviar(c)}>Enviar</button>}
                    {c.estado === 'borrador' && <button onClick={() => eliminar(c)} style={{ background: '#c0392b' }}>Eliminar</button>}
                  </td>
                </tr>
                {vistaPrevia && vistaPrevia.id === c.id && (
                  <tr>
                    <td colSpan={5}>
                      <div className="card" style={{ margin: 0 }}>
                        <strong>{vistaPrevia.total} destinatario(s)</strong>
                        {vistaPrevia.sin_contacto > 0 && (
                          <span style={{ color: '#e67e22' }}> — {vistaPrevia.sin_contacto} sin dato de contacto para su canal preferido (no recibirán el mensaje)</span>
                        )}
                        <ul style={{ columns: 2, marginBottom: 0 }}>
                          {vistaPrevia.destinatarios.map((d) => (
                            <li key={d.id}>{d.nombre} <span style={{ color: '#888' }}>({d.canal_preferido}{d.tiene_contacto ? '' : ', sin contacto'})</span></li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {campanias.length === 0 && <tr><td colSpan={5}>Todavía no hay campañas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
