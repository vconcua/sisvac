import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { obtenerRol, obtenerIdUsuario, puedeEditar } from '../utils/rol';

const PUEDEN_REGISTRAR = ['administrador', 'personal_salud', 'enfermeria'];
const FORM_VACIO = { nombre_completo: '', dpi: '', telefono: '', correo: '', telegram_chat_id: '', canal_preferido: 'email', comunidad_id: '', comunidad_linguistica_id: '', ninio_id: '' };

export default function Padres() {
  const rol = obtenerRol();
  const editor = puedeEditar();                       // administrador / personal_salud
  const puedeRegistrar = PUEDEN_REGISTRAR.includes(rol);
  const [error, setError] = useState('');
  const [padres, setPadres] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [ninios, setNinios] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [idiomas, setIdiomas] = useState([]);
  const [editandoId, setEditandoId] = useState(null); // si hay id, el formulario edita a ese padre/madre

  // Para el panel de "vincular niño" y "enviar aviso" por fila
  const [padreActivoId, setPadreActivoId] = useState(null);
  const [panelActivo, setPanelActivo] = useState(null); // 'vincular' | 'aviso' | null
  const [ninioSeleccionado, setNinioSeleccionado] = useState('');
  const [avisoAsunto, setAvisoAsunto] = useState('');
  const [avisoMensaje, setAvisoMensaje] = useState('');
  const [mensajeEstado, setMensajeEstado] = useState('');

  const miId = obtenerIdUsuario();
  const niniosElegibles = rol === 'enfermeria' ? ninios.filter((n) => n.creado_por === miId) : ninios;

  const cargar = () => api.get('/padres').then((res) => setPadres(res.data));
  useEffect(() => {
    cargar();
    api.get('/comunidades').then((res) => setComunidades(res.data));
    api.get('/ninios').then((res) => setNinios(res.data));
    api.get('/catalogos/comunidades-linguisticas').then((res) => setIdiomas(res.data)).catch(() => {});
  }, []);

  const editar = (p) => {
    setEditandoId(p.id);
    setForm({
      nombre_completo: p.nombre_completo || '', dpi: p.dpi || '', telefono: p.telefono || '', correo: p.correo || '',
      telegram_chat_id: p.telegram_chat_id || '', canal_preferido: p.canal_preferido || 'email',
      comunidad_id: p.comunidad_id || '', comunidad_linguistica_id: p.comunidad_linguistica_id || '', ninio_id: '',
    });
    setMostrarForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => { setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO); };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (editandoId) {
      try {
        const { ninio_id, ...datos } = form;
        await api.put(`/padres/${editandoId}`, datos);
        cancelar();
        cargar();
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo actualizar al padre/madre');
      }
      return;
    }
    try {
      const { ninio_id, ...datos } = form;
      await api.post('/padres', { ...datos, ninio_id: ninio_id || undefined });
      setForm(FORM_VACIO);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar al padre/madre');
    }
  };

  const destinoParaMostrar = (p) => {
    if (p.canal_preferido === 'email') return p.correo;
    if (p.canal_preferido === 'telegram') return p.telegram_chat_id || '(sin vincular)';
    return p.telefono;
  };

  const abrirPanel = (padreId, panel) => {
    setPadreActivoId(padreId);
    setPanelActivo(panel);
    setNinioSeleccionado('');
    setAvisoAsunto('');
    setAvisoMensaje('');
    setMensajeEstado('');
  };

  const vincularNinio = async (padreId) => {
    if (!ninioSeleccionado) return;
    setError('');
    try {
      await api.post(`/padres/${padreId}/ninios`, { ninio_id: ninioSeleccionado });
      setPanelActivo(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo vincular');
    }
  };

  const desvincularNinio = async (padreId, ninioId) => {
    await api.delete(`/padres/${padreId}/ninios/${ninioId}`);
    cargar();
  };

  const enviarAviso = async (padreId) => {
    setMensajeEstado('Enviando...');
    try {
      await api.post(`/padres/${padreId}/avisar`, { asunto: avisoAsunto, mensaje: avisoMensaje });
      setMensajeEstado('✅ Aviso enviado correctamente');
      setTimeout(() => setPanelActivo(null), 1200);
    } catch (err) {
      setMensajeEstado(`❌ ${err.response?.data?.error || 'No se pudo enviar'}`);
    }
  };

  return (
    <div>
      <h1>Padres de familia</h1>
      {rol === 'enfermeria' && (
        <p style={{ color: '#666', maxWidth: 620 }}>
          Puede registrar padres de familia nuevos y vincularlos con los niños que usted registró. Una vez guardados,
          los datos no se pueden editar ni eliminar; si hay un error, avise al personal de salud o al administrador.
        </p>
      )}
      {puedeRegistrar && (
        <button onClick={() => (mostrarForm ? cancelar() : setMostrarForm(true))}>{mostrarForm ? 'Cancelar' : '+ Nuevo padre/madre'}</button>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {mostrarForm && (
        <form onSubmit={guardar} className="card" style={{ marginTop: '1rem', maxWidth: 420 }}>
          <h3 style={{ marginTop: 0 }}>{editandoId ? 'Editar datos del padre/madre' : 'Registrar padre/madre'}</h3>
          <input placeholder="Nombre completo" value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} required />
          <input placeholder="DPI" value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} required />
          <input placeholder="Teléfono (WhatsApp / SMS)" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <input placeholder="Correo" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          <select value={form.canal_preferido} onChange={(e) => setForm({ ...form, canal_preferido: e.target.value })}>
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
          {form.canal_preferido === 'telegram' && (
            <input placeholder="Chat ID de Telegram" value={form.telegram_chat_id} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })} />
          )}
          <select value={form.comunidad_id} onChange={(e) => setForm({ ...form, comunidad_id: e.target.value })} required>
            <option value="">Seleccione comunidad</option>
            {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label>Comunidad lingüística / idioma (opcional)</label>
          <select value={form.comunidad_linguistica_id} onChange={(e) => setForm({ ...form, comunidad_linguistica_id: e.target.value })}>
            <option value="">— No especificada —</option>
            {idiomas.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
          {!editandoId && <>
            <label>Niño(a) de este padre/madre (opcional)</label>
            <select value={form.ninio_id} onChange={(e) => setForm({ ...form, ninio_id: e.target.value })}>
              <option value="">— Vincular después —</option>
              {niniosElegibles.map((n) => <option key={n.id} value={n.id}>{n.nombre_completo}</option>)}
            </select>
          </>}
          <button type="submit">{editandoId ? 'Guardar cambios' : 'Guardar'}</button>
        </form>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr><th>Nombre</th><th>DPI</th><th>Idioma</th><th>Canal preferido</th><th>Contacto</th><th>Niños vinculados</th><th></th></tr>
          </thead>
          <tbody>
            {padres.map((p) => (
              <React.Fragment key={p.id}>
                <tr>
                  <td>{p.nombre_completo}</td>
                  <td>{p.dpi}</td>
                  <td>{p.comunidad_linguistica_nombre || '—'}</td>
                  <td>{p.canal_preferido}</td>
                  <td>{destinoParaMostrar(p)}</td>
                  <td>
                    {p.ninios.length === 0
                      ? <span style={{ color: '#999' }}>Ninguno</span>
                      : p.ninios.map((n) => (
                          <span key={n.id} className="badge badge-ok" style={{ marginRight: '0.3rem' }}>
                            {n.nombre}{' '}
                            {editor && <a onClick={() => desvincularNinio(p.id, n.id)} style={{ cursor: 'pointer', color: 'white', textDecoration: 'underline' }}>✕</a>}
                          </span>
                        ))
                    }
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    {puedeRegistrar && <button onClick={() => abrirPanel(p.id, 'vincular')}>+ Vincular niño</button>}
                    {editor && <button onClick={() => editar(p)}>Editar</button>}
                    {editor && <button onClick={() => abrirPanel(p.id, 'aviso')}>Enviar aviso</button>}
                  </td>
                </tr>

                {padreActivoId === p.id && panelActivo === 'vincular' && (
                  <tr>
                    <td colSpan={7}>
                      <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select value={ninioSeleccionado} onChange={(e) => setNinioSeleccionado(e.target.value)} style={{ marginBottom: 0, maxWidth: 300 }}>
                          <option value="">Seleccione un niño</option>
                          {(rol === 'enfermeria' && p.creado_por !== miId ? niniosElegibles : ninios).map((n) => <option key={n.id} value={n.id}>{n.nombre_completo}</option>)}
                        </select>
                        <button onClick={() => vincularNinio(p.id)}>Vincular</button>
                        <button onClick={() => setPanelActivo(null)} style={{ background: '#999' }}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}

                {padreActivoId === p.id && panelActivo === 'aviso' && (
                  <tr>
                    <td colSpan={7}>
                      <div className="card">
                        <input placeholder="Asunto (opcional)" value={avisoAsunto} onChange={(e) => setAvisoAsunto(e.target.value)} />
                        <textarea
                          placeholder={`Mensaje para ${p.nombre_completo} (se enviará por ${p.canal_preferido})`}
                          value={avisoMensaje}
                          onChange={(e) => setAvisoMensaje(e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e0e0e0', marginBottom: '0.8rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button onClick={() => enviarAviso(p.id)} disabled={!avisoMensaje.trim()}>Enviar</button>
                          <button onClick={() => setPanelActivo(null)} style={{ background: '#999' }}>Cancelar</button>
                          {mensajeEstado && <span>{mensajeEstado}</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
