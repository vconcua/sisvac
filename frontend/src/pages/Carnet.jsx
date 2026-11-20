import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/** Página pública del carnet digital: se llega al escanear el QR y se pide el PIN de 6 dígitos. */
export default function Carnet() {
  const { codigo } = useParams();
  const [pin, setPin] = useState('');
  const [dpi, setDpi] = useState('');
  const [requiereDpi, setRequiereDpi] = useState(true);
  const [existe, setExiste] = useState(true);

  // la pantalla pide el DPI solo si el niño ya tiene un padre/madre vinculado
  useEffect(() => {
    axios.get(`${API}/carnet/${codigo}/acceso`)
      .then((r) => setRequiereDpi(r.data.requiere_dpi))
      .catch(() => setExiste(false));
  }, [codigo]);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const consultar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      // axios "limpio": un PIN incorrecto (401) no debe mandar a la pantalla de inicio de sesión
      const { data } = await axios.post(`${API}/carnet/${codigo}`, { pin, dpi });
      setDatos(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo consultar el carnet. Intente de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const caja = { maxWidth: 760, margin: '0 auto', padding: '1rem' };

  if (!datos) {
    return (
      <div style={caja}>
        <div className="card" style={{ maxWidth: 380, margin: '3rem auto', textAlign: 'center' }}>
          <h2>Carnet digital SISVAC</h2>
          {!existe ? <p style={{ color: '#c0392b' }}>Este carnet no existe o fue dado de baja. Verifique el código QR.</p> : (
            <p>{requiereDpi ? 'Para ver el carnet escriba el DPI del padre o madre y el PIN de 6 dígitos que le entregó su centro de salud.' : 'Escriba el PIN de 6 dígitos que le entregó su centro de salud.'}</p>
          )}
          <form onSubmit={consultar}>
            {requiereDpi && (
              <input inputMode="numeric" autoComplete="off" placeholder="DPI del padre o madre" value={dpi}
                onChange={(e) => setDpi(e.target.value.replace(/\D/g, ''))} style={{ textAlign: 'center' }} required />
            )}
            <input
              inputMode="numeric" autoComplete="off" maxLength={6} placeholder="PIN" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4rem' }} required
            />
            <button type="submit" disabled={!existe || cargando || pin.length !== 6 || (requiereDpi && !dpi)}>{cargando ? 'Consultando...' : 'Ver carnet'}</button>
          </form>
          {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        </div>
      </div>
    );
  }

  const grafica = datos.historial_crecimiento.map((r) => ({ fecha: String(r.fecha_medicion).slice(0, 10), peso: Number(r.peso_kg) }));
  const fecha = (f) => (f ? String(f).slice(0, 10) : '—');
  const etiqueta = { aplicada: 'Aplicada', pendiente: 'Pendiente', atrasada: 'Atrasada' };

  return (
    <div style={caja}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>{datos.nombre}</h1>
        <p>
          {datos.edad_meses} meses · {datos.sexo === 'M' ? 'Masculino' : 'Femenino'} · Nació el {fecha(datos.fecha_nacimiento)}
          {datos.comunidad ? ` · ${datos.comunidad}` : ''}
        </p>
        {datos.centro_salud && <p><strong>Centro de salud:</strong> {datos.centro_salud}</p>}
        <button onClick={() => window.print()}>Imprimir carnet</button>
      </div>

      <div className="card">
        <h3>Crecimiento</h3>
        {grafica.length === 0 ? <p>Aún no hay mediciones.</p> : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={grafica}><XAxis dataKey="fecha" /><YAxis /><Tooltip /><Line type="monotone" dataKey="peso" stroke="#0b6e4f" name="Peso (kg)" /></LineChart>
            </ResponsiveContainer>
            <table>
              <thead><tr><th>Fecha</th><th>Peso (kg)</th><th>Talla (cm)</th></tr></thead>
              <tbody>{datos.historial_crecimiento.map((r, i) => <tr key={i}><td>{fecha(r.fecha_medicion)}</td><td>{r.peso_kg}</td><td>{r.talla_cm}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </div>

      <div className="card">
        <h3>Vacunas</h3>
        {datos.esquema_vacunacion.length === 0 ? <p>Aún no tiene esquema de vacunación.</p> : (
          <table>
            <thead><tr><th>Vacuna</th><th>Aplicada</th><th>Próxima dosis</th><th>Estado</th></tr></thead>
            <tbody>
              {datos.esquema_vacunacion.map((v, i) => (
                <tr key={i}><td>{v.nombre} (dosis {v.dosis_numero})</td><td>{fecha(v.fecha_aplicada)}</td><td>{v.estado === 'aplicada' ? '—' : fecha(v.fecha_proxima_dosis)}</td><td>{etiqueta[v.estado] || v.estado}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
