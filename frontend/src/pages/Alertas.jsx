import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { puedeEditar } from '../utils/rol';

export default function Alertas() {
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState('pendiente');
  const [mensaje, setMensaje] = useState('');

  const cargar = () => api.get(`/alertas?estado=${filtro}`).then((res) => setAlertas(res.data));
  useEffect(cargar, [filtro]);

  const notificar = async (id) => {
    await api.post(`/alertas/${id}/notificar`);
    cargar();
  };

  const atender = async (id) => {
    await api.put(`/alertas/${id}/atender`);
    cargar();
  };

  // Revisa ahora mismo qué niños llevan demasiado tiempo sin control de crecimiento
  // (esta revisión también corre sola todos los días).
  const detectarAbandono = async () => {
    setMensaje('Revisando...');
    try {
      const { data } = await api.post('/alertas/detectar-abandono');
      setMensaje(data.alertas_creadas === 0
        ? 'Revisión terminada: ningún niño nuevo sin seguimiento.'
        : `Revisión terminada: se crearon ${data.alertas_creadas} alerta(s) por falta de seguimiento.`);
      cargar();
    } catch (err) {
      setMensaje(err.response?.data?.error || 'No se pudo ejecutar la revisión');
    }
  };

  // Dispara ahora los avisos automáticos a padres (también corren solos todos los días a las 07:00).
  const enviarAvisos = async () => {
    setMensaje('Enviando avisos...');
    try {
      const { data } = await api.post('/alertas/avisos-automaticos');
      const a = data.alertas, v = data.vacunas;
      setMensaje(`Listo: ${a.avisos_enviados} aviso(s) por alertas y ${v.recordatorios_enviados} recordatorio(s) de vacuna enviados` +
        `${a.avisos_fallidos + v.recordatorios_fallidos > 0 ? `; ${a.avisos_fallidos + v.recordatorios_fallidos} no se pudieron enviar (falta contacto o error)` : ''}.`);
      cargar();
    } catch (err) {
      setMensaje(err.response?.data?.error || 'No se pudieron enviar los avisos');
    }
  };

  const editor = puedeEditar();

  return (
    <div>
      <h1>Alertas</h1>
      <p style={{ color: '#666', maxWidth: 680 }}>
        Todos los días a las 7:00 el sistema avisa solo a los padres de familia: les escribe por su canal preferido cuando
        hay una alerta nueva de su hijo y les recuerda las vacunas de la próxima semana. Aquí puede adelantar ese envío.
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ maxWidth: 220, marginBottom: 0 }}>
          <option value="pendiente">Pendientes</option>
          <option value="enviada">Enviadas</option>
          <option value="atendida">Atendidas</option>
        </select>
        {editor && <button onClick={detectarAbandono}>Buscar niños sin seguimiento</button>}
        {editor && <button onClick={enviarAvisos}>Enviar avisos a padres ahora</button>}
        {mensaje && <span>{mensaje}</span>}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <table>
          <thead><tr><th>Niño</th><th>Tipo</th><th>Mensaje</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            {alertas.map((a) => (
              <tr key={a.id}>
                <td>{a.ninio_nombre}</td>
                <td><span className={`badge ${a.tipo === 'critica' ? 'badge-critica' : 'badge-preventiva'}`}>{a.tipo}</span></td>
                <td>{a.mensaje}</td>
                <td>{new Date(a.creado_en).toLocaleDateString('es-GT')}</td>
                <td>
                  {editor && a.estado === 'pendiente' && <button onClick={() => notificar(a.id)}>Notificar</button>}{' '}
                  {editor && a.estado !== 'atendida' && <button onClick={() => atender(a.id)}>Marcar atendida</button>}
                </td>
              </tr>
            ))}
            {alertas.length === 0 && <tr><td colSpan={5}>No hay alertas con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
