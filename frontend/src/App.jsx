import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Ninios from './pages/Ninios.jsx';
import NinioDetalle from './pages/NinioDetalle.jsx';
import Comunidades from './pages/Comunidades.jsx';
import Padres from './pages/Padres.jsx';
import Alertas from './pages/Alertas.jsx';
import CentrosSalud from './pages/CentrosSalud.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Reportes from './pages/Reportes.jsx';
import Campanias from './pages/Campanias.jsx';
import Carnet from './pages/Carnet.jsx';
import CalendarioVacunas from './pages/CalendarioVacunas.jsx';

function RutaPrivada({ children }) {
  const token = localStorage.getItem('sisvac_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/carnet/:codigo" element={<Carnet />} />
        <Route
          path="/*"
          element={
            <RutaPrivada>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ninios" element={<Ninios />} />
                  <Route path="/ninios/:id" element={<NinioDetalle />} />
                  <Route path="/comunidades" element={<Comunidades />} />
                  <Route path="/padres" element={<Padres />} />
                  <Route path="/alertas" element={<Alertas />} />
                  <Route path="/centros-salud" element={<CentrosSalud />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/campanias" element={<Campanias />} />
                  <Route path="/calendario-vacunas" element={<CalendarioVacunas />} />
                </Routes>
              </Layout>
            </RutaPrivada>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
