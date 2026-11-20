import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { obtenerRol, puedeEditar } from '../utils/rol';

const FORM_VACIO = { nombre_completo: '', fecha_nacimiento: '', sexo: 'M', comunidad_id: '', padre_id: '' };
// Roles con permiso para registrar niños nuevos (consulta_limitada y encargado_centro solo ven la lista)
const PUEDEN_REGISTRAR = ['administrador', 'personal_salud', 'enfermeria'];

export default function Ninios() {
  const rol = obtenerRol();
  const puedeRegistrar = PUEDEN_REGISTRAR.includes(rol);
  const [ninios, setNinios] = useState([]);
  const [comunidades, setComunidades] = useState([]);
  const [padres, setPadres] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [editandoId, setEditandoId] = useState(null); // si hay id, el formulario edita ese niño
  const editor = puedeEditar();

  const cargar = () => api.get('/ninios').then((res) => setNinios(res.data));

  useEffect(() => {
    cargar();
    api.get('/comunidades').then((res) => setComunidades(res.data)).catch(() => {});
    api.get('/padres').then((res) => setPadres(res.data)).catch(() => {});
  }, []);

  // Centro de salud que le toca al niño: el de la comunidad elegida
  const comunidadElegida = comunidades.find((c) => String(c.id) === String(form.comunidad_id));
  const textoCentro = (nombre, tipo, municipio) =>
    `${nombre}${tipo ? ` (${tipo})` : ''}${municipio ? ` — ${municipio}` : ''}`;

  const editar = (n) => {
    setEditandoId(n.id);
    setForm({ nombre_completo: n.nombre_completo, fecha_nacimiento: String(n.fecha_nacimiento).slice(0, 10), sexo: n.sexo, comunidad_id: n.comunidad_id || '', padre_id: '' });
    setMostrarForm(true);
    setMensaje('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => { setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO); };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (editandoId) {
      try {
        const { padre_id, ...datos } = form;
        await api.put(`/ninios/${editandoId}`, datos);
        setMensaje('Datos del niño actualizados correctamente.');
        cancelar();
        cargar();
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo actualizar el niño');
      }
      return;
    }
    try {
      const { padre_id, ...datos } = form;
      const { data: ninio } = await api.post('/ninios', { ...datos, padre_id: padre_id || undefined });
      await api.post(`/vacunacion/ninio/${ninio.id}/generar-esquema`);
      setMensaje(
        `Niño "${ninio.nombre_completo}" registrado${padre_id ? ' y vinculado a su padre/madre' : ''}. ` +
        (ninio.centro_salud_nombre
          ? `Le corresponde el centro de salud: ${textoCentro(ninio.centro_salud_nombre, ninio.centro_salud_tipo, ninio.centro_salud_municipio)}.`
          : 'Su comunidad todavía no tiene centro de salud asignado.')
      );
      setMostrarForm(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar el niño');
    }
  };

  return (
    <div>
      <h1>Niños registrados</h1>
      {rol === 'enfermeria' && (
        <p style={{ color: '#666', maxWidth: 620 }}>
          Puede registrar niños nuevos y vincularlos con su padre o madre. Una vez guardados, los datos no se pueden
          editar ni eliminar; si hay un error, avise al personal de salud o al administrador.
        </p>
      )}
      {puedeRegistrar && (
        <button onClick={() => (mostrarForm ? cancelar() : setMostrarForm(true))}>
          {mostrarForm ? 'Cancelar' : '+ Registrar niño'}
        </button>
      )}
      {mensaje && <p style={{ color: '#0b6e4f' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {mostrarForm && (
        <form onSubmit={guardar} className="card" style={{ marginTop: '1rem', maxWidth: 400 }}>
          <h3 style={{ marginTop: 0 }}>{editandoId ? 'Editar datos del niño' : 'Registrar niño'}</h3>
          <input placeholder="Nombre completo" value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} required />
          <input type="date" value={form.fecha_nacimiento}
            onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} required />
          <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <select value={form.comunidad_id} onChange={(e) => setForm({ ...form, comunidad_id: e.target.value })} required>
            <option value="">Seleccione comunidad</option>
            {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {form.comunidad_id && (
            comunidadElegida?.centro_salud_nombre ? (
              <div style={{ background: '#e8f5ef', border: '1px solid #0b6e4f', borderRadius: 6, padding: '0.6rem 0.8rem', marginBottom: '0.8rem' }}>
                <strong>Centro de salud que le corresponde:</strong><br />
                {comunidadElegida.centro_salud_nombre}
                {comunidadElegida.municipio_nombre ? ` — ${comunidadElegida.municipio_nombre}` : ''}
              </div>
            ) : (
              <div style={{ background: '#fff4e5', border: '1px solid #e0a030', borderRadius: 6, padding: '0.6rem 0.8rem', marginBottom: '0.8rem' }}>
                Esta comunidad todavía no tiene un centro de salud asignado. Pídale al administrador o al personal de salud que lo asigne en <em>Comunidades</em>.
              </div>
            )
          )}
          {!editandoId && <>
            <label>Padre / madre (si ya está registrado)</label>
            <select value={form.padre_id} onChange={(e) => setForm({ ...form, padre_id: e.target.value })}>
              <option value="">— Vincular después —</option>
              {padres.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
            </select>
          </>}
          <button type="submit">{editandoId ? 'Guardar cambios' : 'Guardar'}</button>
        </form>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr><th>Nombre</th><th>Edad (meses)</th><th>Sexo</th><th>Padre / madre</th><th>Centro de salud</th><th></th></tr>
          </thead>
          <tbody>
            {ninios.map((n) => (
              <tr key={n.id}>
                <td>{n.nombre_completo}</td>
                <td>{n.edad_meses}</td>
                <td>{n.sexo === 'M' ? 'Masculino' : 'Femenino'}</td>
                <td>
                  {(n.padres || []).length === 0
                    ? <span style={{ color: '#c0392b' }}>Sin vincular</span>
                    : n.padres.map((p) => p.nombre).join(', ')}
                </td>
                <td>{n.centro_salud_nombre || <span style={{ color: '#c0392b' }}>Sin asignar</span>}</td>
                <td><Link to={`/ninios/${n.id}`}>Ver detalle</Link>{editor && <> · <a onClick={() => editar(n)} style={{ cursor: 'pointer', color: '#0b6e4f', textDecoration: 'underline' }}>Editar</a></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
