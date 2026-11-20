import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { puedeEditar } from '../utils/rol';

const FORM_VACIO = { nombre: '', ubicacion: '', departamento_id: '', municipio_id: '', centro_salud_id: '', numero_estimado_familias: '', comunidad_linguistica_id: '' };

export default function Comunidades() {
  const [comunidades, setComunidades] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [centrosSalud, setCentrosSalud] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = creando una comunidad nueva
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const editor = puedeEditar();

  const cargar = () => api.get('/comunidades').then((res) => setComunidades(res.data));

  useEffect(() => {
    cargar();
    api.get('/catalogos/departamentos').then((res) => setDepartamentos(res.data));
    api.get('/catalogos/comunidades-linguisticas').then((res) => setIdiomas(res.data));
  }, []);

  // Cada vez que cambia el departamento seleccionado, se recargan sus
  // municipios y los centros de salud de ese departamento (menús en
  // cascada), y se limpian las selecciones dependientes previas para
  // no dejar una combinación inválida.
  useEffect(() => {
    if (!form.departamento_id) {
      setMunicipios([]);
      setCentrosSalud([]);
      return;
    }
    api.get(`/catalogos/municipios?departamento_id=${form.departamento_id}`).then((res) => setMunicipios(res.data));
    api.get(`/centros-salud?departamento_id=${form.departamento_id}`).then((res) => setCentrosSalud(res.data));
  }, [form.departamento_id]);

  // Idiomas del departamento elegido primero (el castellano se omite de la zona: es de todo el país)
  const idsZona = new Set(
    idiomas.filter((i) => form.departamento_id && i.nombre !== 'Castellano' && i.departamentos.some((d) => String(d.id) === String(form.departamento_id))).map((i) => i.id)
  );
  const idiomasZona = idiomas.filter((i) => idsZona.has(i.id));
  const idiomasOtros = idiomas.filter((i) => !idsZona.has(i.id));

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      if (editandoId) {
        await api.put(`/comunidades/${editandoId}`, form);
        setMensaje('Comunidad actualizada.');
      } else {
        await api.post('/comunidades', form);
        setMensaje('Comunidad creada.');
      }
      cerrarForm();
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la comunidad');
    }
  };

  const cerrarForm = () => {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setMostrarForm(false);
  };

  // Carga una comunidad existente en el formulario para cambiarle el centro de salud (u otros datos)
  const editar = (c) => {
    setMensaje('');
    setError('');
    setEditandoId(c.id);
    setForm({
      nombre: c.nombre || '',
      ubicacion: c.ubicacion || '',
      departamento_id: c.departamento_id || '',
      municipio_id: c.municipio_id || '',
      centro_salud_id: c.centro_salud_id || '',
      numero_estimado_familias: c.numero_estimado_familias ?? '',
      comunidad_linguistica_id: c.comunidad_linguistica_id || '',
    });
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <h1>Comunidades</h1>
      <button onClick={() => (mostrarForm ? cerrarForm() : setMostrarForm(true))}>{mostrarForm ? 'Cancelar' : '+ Nueva comunidad'}</button>
      {mensaje && <p style={{ color: '#0b6e4f' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {mostrarForm && (
        <form onSubmit={guardar} className="card" style={{ marginTop: '1rem', maxWidth: 420 }}>
          {editandoId && <h3 style={{ marginTop: 0 }}>Editando comunidad</h3>}
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="Ubicación (referencia, ej. km 45 ruta al Pacífico)" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />

          <label>Departamento</label>
          <select
            value={form.departamento_id}
            onChange={(e) => setForm({ ...form, departamento_id: e.target.value, municipio_id: '', centro_salud_id: '' })}
            required
          >
            <option value="">Seleccione departamento</option>
            {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>

          <label>Municipio</label>
          <select
            value={form.municipio_id}
            onChange={(e) => setForm({ ...form, municipio_id: e.target.value })}
            required
            disabled={!form.departamento_id}
          >
            <option value="">{form.departamento_id ? 'Seleccione municipio' : 'Primero elija un departamento'}</option>
            {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>

          <label>Centro de salud que atiende esta comunidad</label>
          <select
            value={form.centro_salud_id}
            onChange={(e) => setForm({ ...form, centro_salud_id: e.target.value })}
            disabled={!form.departamento_id}
          >
            <option value="">
              {!form.departamento_id
                ? 'Primero elija un departamento'
                : centrosSalud.length === 0
                ? 'Sin centros de salud registrados en este departamento'
                : 'Sin especificar'}
            </option>
            {centrosSalud.map((cs) => <option key={cs.id} value={cs.id}>{cs.nombre}{cs.tipo_establecimiento ? ` (${cs.tipo_establecimiento})` : ''}</option>)}
          </select>

          <label>Comunidad lingüística (idioma predominante)</label>
          <select value={form.comunidad_linguistica_id} onChange={(e) => setForm({ ...form, comunidad_linguistica_id: e.target.value })}>
            <option value="">— No especificada —</option>
            {form.departamento_id && idiomasZona.length > 0 && (
              <optgroup label="Se hablan en este departamento">
                {idiomasZona.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </optgroup>
            )}
            <optgroup label={form.departamento_id ? 'Otras comunidades lingüísticas' : 'Todas'}>
              {idiomasOtros.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </optgroup>
          </select>

          <input type="number" placeholder="Familias estimadas" value={form.numero_estimado_familias}
            onChange={(e) => setForm({ ...form, numero_estimado_familias: e.target.value })} />
          <button type="submit">{editandoId ? 'Guardar cambios' : 'Guardar'}</button>
        </form>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <table>
          <thead><tr><th>Nombre</th><th>Municipio</th><th>Departamento</th><th>Centro de salud</th><th>Comunidad lingüística</th><th>Familias</th>{editor && <th></th>}</tr></thead>
          <tbody>
            {comunidades.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.municipio_nombre || c.municipio || '—'}</td>
                <td>{c.departamento_nombre || c.departamento || '—'}</td>
                <td>{c.centro_salud_nombre || '—'}</td>
                <td>{c.comunidad_linguistica_nombre || '—'}</td>
                <td>{c.numero_estimado_familias}</td>
                {editor && <td><button onClick={() => editar(c)}>{c.centro_salud_nombre ? 'Editar' : 'Asignar centro / Editar'}</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
