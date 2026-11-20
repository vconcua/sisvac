import React, { useEffect, useState } from 'react';
import api from '../api/api';

const ROLES = [
  { valor: 'administrador', etiqueta: 'Administrador — control total' },
  { valor: 'personal_salud', etiqueta: 'Personal de salud — crear y editar' },
  { valor: 'encargado_centro', etiqueta: 'Encargado de centro — solo reportes' },
  { valor: 'enfermeria', etiqueta: 'Enfermería — registra niños y padres nuevos, sin poder editarlos después' },
  { valor: 'consulta_limitada', etiqueta: 'Consulta limitada — solo ver niños y padres, sin editar nada' },
];

const FORM_VACIO = { nombre_completo: '', correo: '', password: '', confirmar_password: '', rol: 'personal_salud', centro_salud: '' };

export default function Usuarios() {
  const [form, setForm] = useState(FORM_VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  const cargar = () => api.get('/auth/usuarios').then((res) => setUsuarios(res.data)).catch(() => setError('No se pudo cargar la lista de usuarios'));
  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (form.password !== form.confirmar_password) return setError('Las contraseñas no coinciden');
    try {
      const { confirmar_password, ...datos } = form;
      const { data } = await api.post('/auth/usuarios', datos);
      cargar();
      setMensaje(`Usuario "${data.nombre_completo}" creado con rol "${data.rol}".`);
      setForm(FORM_VACIO);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el usuario');
    }
  };

  return (
    <div>
      <h1>Usuarios del sistema</h1>
      <p style={{ color: '#666', maxWidth: 600 }}>
        Crea cuentas de acceso para el personal. El rol "Enfermería" puede registrar niños y padres de nuevo ingreso (y vincularlos entre sí), pero una vez guardados no puede editarlos, eliminarlos ni desvincularlos. El rol "Consulta limitada" es ideal para
        personal administrativo o auditoría: solo puede ver la lista de niños y padres,
        sin poder crear, editar ni eliminar nada, ni acceder a comunidades, centros de
        salud, vacunación, alertas o reportes.
      </p>

      <form onSubmit={guardar} className="card" style={{ marginTop: '1rem', maxWidth: 440 }}>
        <input placeholder="Nombre completo" value={form.nombre_completo}
          onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} required />
        <input type="email" placeholder="Correo institucional" value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
        <input type="password" placeholder="Contraseña" value={form.password} autoComplete="new-password"
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input type="password" placeholder="Confirmar contraseña" value={form.confirmar_password} autoComplete="new-password"
          onChange={(e) => setForm({ ...form, confirmar_password: e.target.value })} required />

        <label>Rol</label>
        <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
          {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
        </select>

        <input placeholder="Centro de salud (opcional, texto libre)" value={form.centro_salud}
          onChange={(e) => setForm({ ...form, centro_salud: e.target.value })} />

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {mensaje && <p style={{ color: '#0b6e4f' }}>{mensaje}</p>}

        <button type="submit">Crear usuario</button>
      </form>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Usuarios registrados ({usuarios.length})</h3>
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Centro de salud</th><th>Estado</th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre_completo}</td>
                <td>{u.correo}</td>
                <td>{(ROLES.find((r) => r.valor === u.rol) || {}).etiqueta?.split(' — ')[0] || u.rol}</td>
                <td>{u.centro_salud || '—'}</td>
                <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={5}>No hay usuarios para mostrar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
