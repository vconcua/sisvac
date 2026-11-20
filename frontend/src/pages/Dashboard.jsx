import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Ilustracion from '../components/Ilustracion.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [cobertura, setCobertura] = useState([]);

  useEffect(() => {
    api.get('/reportes/resumen').then((res) => setResumen(res.data)).catch(() => {});
    api.get('/reportes/cobertura-vacunacion').then((res) => setCobertura(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="hero">
        <div className="hero-texto">
          <h1>SISVAC</h1>
          <p>Control de crecimiento infantil y vacunación. Cuidamos la salud de cada niño de nuestras comunidades.</p>
        </div>
        <Ilustracion alto={170} />
      </div>
      {resumen && (
        <div className="grid-stats">
          <div className="card">
            <div className="stat-numero">{resumen.total_ninios}</div>
            <div className="stat-label">Niños activos</div>
          </div>
          <div className="card">
            <div className="stat-numero">{resumen.alertas_pendientes}</div>
            <div className="stat-label">Alertas pendientes</div>
          </div>
          <div className="card">
            <div className="stat-numero">{resumen.vacunas_atrasadas}</div>
            <div className="stat-label">Dosis atrasadas</div>
          </div>
          <div className="card">
            <div className="stat-numero">{resumen.total_comunidades}</div>
            <div className="stat-label">Comunidades atendidas</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Cobertura de vacunación por comunidad</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={cobertura}>
            <XAxis dataKey="comunidad" />
            <YAxis unit="%" />
            <Tooltip />
            <Bar dataKey="porcentaje_cobertura" fill="#0b6e4f" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
