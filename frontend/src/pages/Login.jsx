import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { ROLES_SIN_PANEL } from '../utils/rol';
import Ilustracion from '../components/Ilustracion.jsx';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { correo, password });
      localStorage.setItem('sisvac_token', data.token);
      const rol = JSON.parse(atob(data.token.split('.')[1])).rol;
      navigate(ROLES_SIN_PANEL.includes(rol) ? '/ninios' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="login-pagina">
      <div className="login-lado">
        <Ilustracion alto={260} />
        <h1>SISVAC</h1>
        <p>Sistema de Control de Crecimiento Infantil y Vacunación para los centros de salud municipales.</p>
      </div>
      <div className="login-form">
    <div className="login-box">
      <h2>SISVAC</h2>
      <p>Sistema de Control de Crecimiento Infantil y Vacunación</p>
      <form onSubmit={enviar}>
        <input type="email" placeholder="Correo institucional" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%' }}>Ingresar</button>
      </form>
    </div>
      </div>
    </div>
  );
}
