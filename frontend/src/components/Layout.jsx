import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/** Decodifica el payload del JWT (sin verificar firma, solo para leer el rol en la UI) */
function obtenerRolDeToken() {
  try {
    const token = localStorage.getItem('sisvac_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.rol || null;
  } catch {
    return null;
  }
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const rol = obtenerRolDeToken();

  const cerrarSesion = () => {
    localStorage.removeItem('sisvac_token');
    navigate('/login');
  };

  // Enlaces visibles para todos los roles con acceso al panel.
  const enlaces = [
    { ruta: '/', etiqueta: 'Panel principal', roles: ['administrador', 'personal_salud', 'encargado_centro'] },
    { ruta: '/ninios', etiqueta: 'Niños', roles: ['administrador', 'personal_salud', 'encargado_centro', 'consulta_limitada', 'enfermeria'] },
    { ruta: '/padres', etiqueta: 'Padres de familia', roles: ['administrador', 'personal_salud', 'encargado_centro', 'consulta_limitada', 'enfermeria'] },
    { ruta: '/comunidades', etiqueta: 'Comunidades', roles: ['administrador', 'personal_salud', 'encargado_centro'] },
    { ruta: '/centros-salud', etiqueta: 'Centros de salud', roles: ['administrador', 'personal_salud', 'encargado_centro'] },
    { ruta: '/calendario-vacunas', etiqueta: 'Calendario de vacunas', roles: ['administrador', 'personal_salud', 'encargado_centro', 'consulta_limitada', 'enfermeria'] },
    { ruta: '/alertas', etiqueta: 'Alertas', roles: ['administrador', 'personal_salud', 'encargado_centro'] },
    { ruta: '/reportes', etiqueta: 'Reportes', roles: ['administrador', 'personal_salud', 'encargado_centro'] },
    { ruta: '/campanias', etiqueta: 'Campañas', roles: ['administrador', 'personal_salud'] },
    { ruta: '/usuarios', etiqueta: 'Usuarios', roles: ['administrador'] },
  ];

  const enlacesVisibles = enlaces.filter((e) => !rol || e.roles.includes(rol));

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>SISVAC</h2>
        {enlacesVisibles.map((e) => (
          <Link key={e.ruta} to={e.ruta} className={location.pathname === e.ruta ? 'activo' : ''}>
            {e.etiqueta}
          </Link>
        ))}
        <a onClick={cerrarSesion} style={{ cursor: 'pointer', marginTop: '2rem', opacity: 0.8 }}>
          Cerrar sesión
        </a>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}
