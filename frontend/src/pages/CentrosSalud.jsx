import React, { useEffect, useState } from 'react';
import api from '../api/api';

const TIPOS = ['Hospital', 'Centro de Salud', 'Puesto de Salud', 'CAP', 'CAIMI', 'Farmacia PROAM'];

const FORM_VACIO = {
  nombre: '', tipo_establecimiento: '', departamento_id: '', municipio_id: '',
  direccion: '', telefono: '', latitud: '', longitud: '',
};

export default function CentrosSalud() {
  const [centros, setCentros] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [error, setError] = useState('');

  const cargar = () => {
    const params = new URLSearchParams();
    if (filtroTexto) params.set('q', filtroTexto);
    if (filtroTipo) params.set('tipo_establecimiento', filtroTipo);
    api.get(`/centros-salud?${params.toString()}`).then((res) => setCentros(res.data));
  };

  useEffect(() => {
    cargar();
    api.get('/catalogos/departamentos').then((res) => setDepartamentos(res.data));
  }, []);

  useEffect(cargar, [filtroTexto, filtroTipo]);

  useEffect(() => {
    if (!form.departamento_id) { setMunicipios([]); return; }
    api.get(`/catalogos/municipios?departamento_id=${form.departamento_id}`).then((res) => setMunicipios(res.data));
  }, [form.departamento_id]);

  const nuevoRegistro = () => {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setError('');
    setMostrarForm(true);
  };

  const editar = async (centro) => {
    setForm({
      nombre: centro.nombre || '',
      tipo_establecimiento: centro.tipo_establecimiento || '',
      departamento_id: centro.departamento_id || '',
      municipio_id: centro.municipio_id || '',
      direccion: centro.direccion || '',
      telefono: centro.telefono || '',
      latitud: centro.latitud || '',
      longitud: centro.longitud || '',
    });
    setEditandoId(centro.id);
    setError('');
    setMostrarForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, departamento_id: form.departamento_id || null, municipio_id: form.municipio_id || null };
      if (editandoId) {
        await api.put(`/centros-salud/${editandoId}`, payload);
      } else {
        await api.post('/centros-salud', payload);
      }
      setMostrarForm(false);
      setForm(FORM_VACIO);
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el centro de salud');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este centro de salud? Las comunidades que lo tengan asignado quedarán sin centro asociado.')) return;
    await api.delete(`/centros-salud/${id}`);
    cargar();
  };

  return (
    <div>
      <h1>Centros de salud</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={nuevoRegistro}>+ Nuevo centro de salud</button>
        <input placeholder="Buscar por nombre..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} style={{ maxWidth: 220, marginBottom: 0 }} />
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ maxWidth: 220, marginBottom: 0 }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="card" style={{ marginTop: '1rem', maxWidth: 460 }}>
          <h3>{editandoId ? 'Editar centro de salud' : 'Nuevo centro de salud'}</h3>
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <input placeholder="Nombre del establecimiento" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />

          <label>Tipo de establecimiento</label>
          <select value={form.tipo_establecimiento} onChange={(e) => setForm({ ...form, tipo_establecimiento: e.target.value })}>
            <option value="">Sin especificar</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label>Departamento</label>
          <select value={form.departamento_id} onChange={(e) => setForm({ ...form, departamento_id: e.target.value, municipio_id: '' })}>
            <option value="">Sin especificar</option>
            {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>

          <label>Municipio</label>
          <select value={form.municipio_id} onChange={(e) => setForm({ ...form, municipio_id: e.target.value })} disabled={!form.departamento_id}>
            <option value="">{form.departamento_id ? 'Sin especificar' : 'Primero elija un departamento'}</option>
            {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>

          <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit">{editandoId ? 'Guardar cambios' : 'Crear'}</button>
            <button type="button" onClick={() => setMostrarForm(false)} style={{ background: '#999' }}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Municipio</th><th>Departamento</th><th>Teléfono</th><th></th></tr>
          </thead>
          <tbody>
            {centros.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.tipo_establecimiento || '—'}</td>
                <td>{c.municipio_nombre || '—'}</td>
                <td>{c.departamento_nombre || '—'}</td>
                <td>{c.telefono || '—'}</td>
                <td style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => editar(c)}>Editar</button>
                  <button onClick={() => eliminar(c.id)} style={{ background: '#c0392b' }}>Eliminar</button>
                </td>
              </tr>
            ))}
            {centros.length === 0 && (
              <tr><td colSpan={6}>No hay centros de salud registrados con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
