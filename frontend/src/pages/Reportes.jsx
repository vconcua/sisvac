import React, { useEffect, useState } from 'react';
import api from '../api/api';

const REPORTES = [
  { id: 'ninios-riesgo', nombre: 'Niños en riesgo nutricional', descripcion: 'Lista nominal de niños con bajo peso, sobrepeso o talla baja según su última medición.', filtros: ['tipo', 'comunidad'] },
  { id: 'vacunas-incompletas', nombre: 'Niños con vacunas incompletas', descripcion: 'Niños con dosis cuya fecha ya venció y todavía no se han aplicado.', filtros: ['comunidad'] },
  { id: 'crecimiento-por-region', nombre: 'Crecimiento promedio por región', descripcion: 'Peso, talla y percentiles promedio por departamento (última medición de cada niño).', filtros: [] },
  { id: 'cobertura-vacunacion', nombre: 'Cobertura de vacunación', descripcion: 'Porcentaje de dosis aplicadas en cada comunidad.', filtros: [] },
];

const TIPOS = [
  { valor: '', etiqueta: 'Todos los riesgos' },
  { valor: 'bajo_peso', etiqueta: 'Bajo peso' },
  { valor: 'sobrepeso', etiqueta: 'Sobrepeso' },
  { valor: 'talla_baja', etiqueta: 'Talla baja' },
];

// /reportes/cobertura-vacunacion responde con la lista simple que usa el panel principal;
// aquí se adapta al mismo formato { titulo, columnas, filas } que los demás reportes.
function normalizar(id, data) {
  if (id === 'cobertura-vacunacion' && Array.isArray(data)) {
    return {
      titulo: 'Cobertura de vacunación por comunidad',
      columnas: [
        { key: 'comunidad', label: 'Comunidad' },
        { key: 'aplicadas', label: 'Dosis aplicadas' },
        { key: 'total', label: 'Total de dosis' },
        { key: 'porcentaje_cobertura', label: 'Cobertura (%)' },
      ],
      filas: data,
    };
  }
  return data;
}

export default function Reportes() {
  const [reporteId, setReporteId] = useState('ninios-riesgo');
  const [tipo, setTipo] = useState('');
  const [comunidadId, setComunidadId] = useState('');
  const [comunidades, setComunidades] = useState([]);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const reporte = REPORTES.find((r) => r.id === reporteId);

  const parametros = () => {
    const p = {};
    if (reporte.filtros.includes('tipo') && tipo) p.tipo = tipo;
    if (reporte.filtros.includes('comunidad') && comunidadId) p.comunidad_id = comunidadId;
    return p;
  };

  useEffect(() => {
    api.get('/comunidades').then((res) => setComunidades(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let vigente = true; // evita que una respuesta lenta pise a una más reciente
    setCargando(true);
    setError('');
    api.get(`/reportes/${reporteId}`, { params: parametros() })
      .then((res) => { if (vigente) setDatos(normalizar(reporteId, res.data)); })
      .catch((err) => { if (vigente) { setDatos(null); setError(err.response?.data?.error || 'No se pudo cargar el reporte'); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [reporteId, tipo, comunidadId]);

  const descargar = async (formato) => {
    setError('');
    try {
      const res = await api.get(`/reportes/${reporteId}/exportar`, {
        params: { ...parametros(), formato },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(res.data);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${reporteId}.${formato}`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar el reporte');
    }
  };

  return (
    <div>
      <h1>Reportes</h1>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {REPORTES.map((r) => (
          <button key={r.id} onClick={() => setReporteId(r.id)}
            style={{ background: r.id === reporteId ? '#08543c' : '#9aa5a0' }}>
            {r.nombre}
          </button>
        ))}
      </div>

      <div className="card">
        <p style={{ marginTop: 0, color: '#555' }}>{reporte.descripcion}</p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {reporte.filtros.includes('tipo') && (
            <div>
              <label>Tipo de riesgo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
              </select>
            </div>
          )}
          {reporte.filtros.includes('comunidad') && (
            <div>
              <label>Comunidad</label>
              <select value={comunidadId} onChange={(e) => setComunidadId(e.target.value)}>
                <option value="">Todas las comunidades</option>
                {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <button onClick={() => descargar('xlsx')} disabled={cargando || !datos}>Descargar Excel</button>
            <button onClick={() => descargar('pdf')} disabled={cargando || !datos}>Descargar PDF</button>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {cargando && <p>Cargando reporte...</p>}

      {datos && !cargando && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>{datos.titulo} <span style={{ color: '#888', fontWeight: 'normal' }}>({datos.filas.length} registro{datos.filas.length === 1 ? '' : 's'})</span></h3>
          <table>
            <thead>
              <tr>{datos.columnas.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {datos.filas.map((fila, i) => (
                <tr key={i}>
                  {datos.columnas.map((c) => (
                    <td key={c.key}>{fila[c.key] === null || fila[c.key] === undefined || fila[c.key] === '' ? '—' : String(fila[c.key])}</td>
                  ))}
                </tr>
              ))}
              {datos.filas.length === 0 && (
                <tr><td colSpan={datos.columnas.length}>Sin registros para los filtros seleccionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
