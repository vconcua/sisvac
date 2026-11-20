import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';
import EsquemaVacunacion from '../components/EsquemaVacunacion.jsx';
import { puedeRegistrarClinico, obtenerRol } from '../utils/rol';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function NinioDetalle() {
  const { id } = useParams();
  const [ninio, setNinio] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [curvas, setCurvas] = useState(null); // mediciones + curvas de referencia de la OMS
  const [vacunas, setVacunas] = useState([]);
  const [form, setForm] = useState({ peso_kg: '', talla_cm: '' });
  const [mensaje, setMensaje] = useState('');
  const [qr, setQr] = useState(null);
  const [mensajeCarnet, setMensajeCarnet] = useState('');

  const cargarTodo = () => {
    api.get(`/ninios/${id}`).then((res) => setNinio(res.data));
    // consulta_limitada y enfermeria no tienen acceso a mediciones ni vacunación: se ignora el 403
    api.get(`/crecimiento/ninio/${id}`).then((res) => setRegistros(res.data)).catch(() => {});
    api.get(`/crecimiento/ninio/${id}/curvas`).then((res) => setCurvas(res.data)).catch(() => {});
    api.get(`/vacunacion/ninio/${id}`).then((res) => setVacunas(res.data)).catch(() => {});
    // el QR se genera solo al abrir la ficha (consulta_limitada no tiene acceso)
    api.get(`/carnet/ninio/${id}/qr`).then((res) => setQr(res.data)).catch(() => setQr(null));
  };

  useEffect(cargarTodo, [id]);

  const registrarMedicion = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/crecimiento', { ninio_id: id, ...form });
    setMensaje(
      data.alertas_generadas.length > 0
        ? `Medición guardada. Se generaron ${data.alertas_generadas.length} alerta(s).`
        : 'Medición guardada sin alertas.'
    );
    setForm({ peso_kg: '', talla_cm: '' });
    cargarTodo();
  };

  const aplicarDosis = async (vacunacionId, fecha) => {
    await api.put(`/vacunacion/${vacunacionId}/aplicar`, { fecha_aplicada: fecha });
    cargarTodo();
  };

  const enviarCarnet = async () => {
    setMensajeCarnet('Enviando...');
    try {
      const { data } = await api.post(`/carnet/ninio/${id}/enviar`);
      setMensajeCarnet(`Carnet enviado a ${data.enviados} padre(s)${data.fallidos ? `; ${data.fallidos} no se pudo enviar (revise su dato de contacto)` : ''}.`);
    } catch (err) {
      setMensajeCarnet(err.response?.data?.error || 'No se pudo enviar el carnet.');
    }
  };

  const imprimirCarnet = () => {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    w.document.write(`<html><head><title>Carnet ${esc(ninio.nombre_completo)}</title></head><body style="font-family:Segoe UI,sans-serif;text-align:center">
      <h2>Carnet digital de vacunación y crecimiento</h2><h3>${esc(ninio.nombre_completo)}</h3>
      <img src="${qr.qr_imagen_base64}" width="300" height="300"/>
      <p>Escanee el código con su celular y escriba el PIN.</p>
      <p style="font-size:28px;letter-spacing:6px"><strong>PIN: ${esc(qr.pin)}</strong></p>
      <p style="font-size:12px;color:#555">${esc(qr.url)}</p></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  if (!ninio) return <p>Cargando...</p>;

  // Datos de una gráfica: curvas de referencia OMS (P5, P50, P95) + las mediciones del niño, ordenadas por edad
  const armarGrafica = (campoRef, campoMedida) => {
    if (!curvas) return { datos: [], maxMeses: 24 };
    const propias = curvas.mediciones.map((m) => ({ meses: Number(m.edad_meses_al_medir), valor: Number(m[campoMedida]) }));
    const edadMax = propias.reduce((mx, p) => Math.max(mx, p.meses), Number(ninio.edad_meses) || 0);
    const maxMeses = Math.min(60, Math.max(12, Math.ceil((edadMax + 3) / 6) * 6));
    const ref = curvas.referencia[campoRef].filter((r) => r.meses <= maxMeses);
    const datos = [...ref, ...propias].sort((a, b) => a.meses - b.meses);
    return { datos, maxMeses };
  };
  const graficaPeso = armarGrafica('peso', 'peso_kg');
  const graficaTalla = armarGrafica('talla', 'talla_cm');

  const Grafica = ({ titulo, unidad, grafica, color }) => (
    <div className="card">
      <h3>{titulo}</h3>
      {curvas && curvas.mediciones.length === 0 && <p style={{ color: '#666' }}>Aún no hay mediciones: se muestran solo las curvas de referencia de la OMS.</p>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={grafica.datos} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="meses" type="number" domain={[0, grafica.maxMeses]} allowDataOverflow
            ticks={Array.from({ length: grafica.maxMeses / 6 + 1 }, (_, i) => i * 6)}
            label={{ value: 'Edad (meses)', position: 'insideBottom', offset: -10 }} />
          <YAxis domain={['auto', 'auto']} unit={` ${unidad}`} width={70} />
          <Tooltip formatter={(v) => (v === null || v === undefined ? '' : `${v} ${unidad}`)} labelFormatter={(m) => `${Number(m).toFixed(1)} meses`} />
          <Legend verticalAlign="top" />
          <Line type="monotone" dataKey="p95" stroke="#e67e22" strokeDasharray="6 4" dot={false} name="OMS P95" connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="p50" stroke="#7f8c8d" strokeDasharray="6 4" dot={false} name="OMS P50 (mediana)" connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="p5" stroke="#c0392b" strokeDasharray="6 4" dot={false} name="OMS P5" connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="valor" stroke={color} strokeWidth={3} dot={{ r: 4 }} name="Niño" connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 0 }}>
        Líneas punteadas: estándares de crecimiento infantil de la OMS para {ninio.sexo === 'M' ? 'niños' : 'niñas'} (percentiles 5, 50 y 95).
        Por debajo del P5 o por encima del P95 el sistema genera una alerta.
      </p>
    </div>
  );

  return (
    <div>
      <h1>{ninio.nombre_completo}</h1>
      <p>{ninio.edad_meses} meses · {ninio.sexo === 'M' ? 'Masculino' : 'Femenino'} · {ninio.comunidad_nombre}</p>
      <p>
        <strong>Centro de salud: </strong>
        {ninio.centro_salud_nombre
          ? `${ninio.centro_salud_nombre}${ninio.centro_salud_tipo ? ` (${ninio.centro_salud_tipo})` : ''}${ninio.centro_salud_municipio ? ` — ${ninio.centro_salud_municipio}` : ''}`
          : <span style={{ color: '#c0392b' }}>Sin asignar (la comunidad no tiene centro de salud)</span>}
      </p>
      <p>
        <strong>Padre / madre: </strong>
        {(ninio.padres || []).length === 0
          ? <span style={{ color: '#c0392b' }}>Sin vincular</span>
          : ninio.padres.map((p) => `${p.nombre}${p.telefono ? ` (${p.telefono})` : ''}`).join(', ')}
      </p>
      {!puedeRegistrarClinico() && <p style={{ color: '#666' }}>Vista de solo lectura para su rol.</p>}

      {puedeRegistrarClinico() && <div className="card">
        <h3>Registrar nueva medición</h3>
        <form onSubmit={registrarMedicion} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>Peso (kg)</label>
            <input type="number" step="0.01" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Talla (cm)</label>
            <input type="number" step="0.1" value={form.talla_cm} onChange={(e) => setForm({ ...form, talla_cm: e.target.value })} required />
          </div>
          <button type="submit" style={{ marginBottom: '0.8rem' }}>Guardar</button>
        </form>
        {mensaje && <p>{mensaje}</p>}
      </div>}

      {qr && <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <img src={qr.qr_imagen_base64 || qr.qr_imagen_url} alt="Código QR del carnet" width="160" height="160" />
        <div>
          <h3 style={{ marginTop: 0 }}>Carnet digital (QR único)</h3>
          <p>PIN de acceso: <strong style={{ fontSize: '1.3rem', letterSpacing: '0.2rem' }}>{qr.pin}</strong></p>
          <p style={{ fontSize: '0.85rem', color: '#555', wordBreak: 'break-all' }}>{qr.url}</p>
          <button onClick={imprimirCarnet}>Imprimir carnet</button>{' '}
          <a href={qr.qr_imagen_base64} download={`carnet-${ninio.nombre_completo}.png`}><button type="button">Descargar QR</button></a>{' '}
          {['administrador', 'personal_salud', 'enfermeria'].includes(obtenerRol()) && <button type="button" onClick={enviarCarnet}>Enviar carnet a los padres</button>}
          {mensajeCarnet && <p style={{ marginBottom: 0 }}>{mensajeCarnet}</p>}
        </div>
      </div>}

      <div className="card">
        <h3>Historial de mediciones</h3>
        {!curvas || curvas.mediciones.length === 0 ? <p>Aún no hay mediciones registradas.</p> : (
          <table>
            <thead><tr><th>Fecha</th><th>Edad (meses)</th><th>Peso (kg)</th><th>Talla (cm)</th><th>Percentil peso</th><th>Percentil talla</th></tr></thead>
            <tbody>
              {[...curvas.mediciones].reverse().map((m, i) => (
                <tr key={i}>
                  <td>{String(m.fecha_medicion).slice(0, 10)}</td><td>{Number(m.edad_meses_al_medir).toFixed(1)}</td>
                  <td>{m.peso_kg}</td><td>{m.talla_cm}</td><td>{m.percentil_peso}</td><td>{m.percentil_talla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Grafica titulo="Curva de crecimiento: peso vs edad" unidad="kg" grafica={graficaPeso} color="#0b6e4f" />
      <Grafica titulo="Curva de crecimiento: talla vs edad" unidad="cm" grafica={graficaTalla} color="#2c5aa0" />

      <EsquemaVacunacion fechaNacimiento={ninio.fecha_nacimiento} vacunas={vacunas} puedeAplicar={puedeRegistrarClinico()} onAplicar={aplicarDosis} />
    </div>
  );
}
