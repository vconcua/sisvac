import React, { useState } from 'react';

// Etapas (columnas) del esquema infantil. Cada dosis se ubica según la edad recomendada en meses.
const ETAPAS = [
  { titulo: 'Recién nacido', min: 0, max: 0 },
  { titulo: '2 meses', min: 1, max: 2 },
  { titulo: '4 meses', min: 3, max: 4 },
  { titulo: '6 meses', min: 5, max: 11 },
  { titulo: '12 meses', sub: '(1 año)', min: 12, max: 14 },
  { titulo: '15 meses', sub: '(1 año 3 meses)', min: 15, max: 17 },
  { titulo: '18 meses', sub: '(1 año 6 meses)', min: 18, max: 20 },
  { titulo: '21 meses', sub: '(1 año 9 meses)', min: 21, max: 47 },
  { titulo: '48 meses', sub: '(4 años)', min: 48, max: 107 },
  { titulo: 'De 9 a 18 años', min: 108, max: 9999 },
];

/** Convierte 2026-10-10T00:00:00.000Z (o 2026-10-10) en 10/10/2026 sin desfase de zona horaria. */
export function formatearFecha(valor) {
  if (!valor) return '—';
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor);
}

function claseEstado(estado) {
  return estado === 'aplicada' ? 'badge-ok' : estado === 'atrasada' ? 'badge-critica' : 'badge-preventiva';
}

export default function EsquemaVacunacion({ vacunas, puedeAplicar, onAplicar, fechaNacimiento }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const minimo = fechaNacimiento ? String(fechaNacimiento).slice(0, 10) : undefined;
  const [abierta, setAbierta] = useState(null); // id de la dosis que se está registrando
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState('');

  const abrir = (v) => { setAbierta(v.id); setFecha(hoy); setError(''); };
  const guardar = async (id) => {
    try {
      await onAplicar(id, fecha);
      setAbierta(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la dosis');
    }
  };

  const columnas = ETAPAS.map((e) => ({
    ...e,
    dosis: vacunas.filter((v) => v.edad_recomendada_meses >= e.min && v.edad_recomendada_meses <= e.max),
  })).filter((c) => c.dosis.length > 0);

  const aplicadas = vacunas.filter((v) => v.estado === 'aplicada').length;

  return (
    <div className="card">
      <h3>Esquema de vacunación</h3>
      <p style={{ color: '#555', marginTop: 0 }}>
        {aplicadas} de {vacunas.length} dosis aplicadas. Cada columna es la edad a la que corresponde la dosis.
      </p>
      {vacunas.length === 0 ? (
        <p>Este niño aún no tiene esquema de vacunación generado.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div className="cal-grid" style={{ gridTemplateColumns: `repeat(${columnas.length}, minmax(165px, 1fr))`, minWidth: columnas.length * 170 }}>
            {columnas.map((c) => (
              <div key={c.titulo} className="cal-col">
                <div className="cal-head">
                  <strong>{c.titulo}</strong>
                  {c.sub && <div className="cal-sub">{c.sub}</div>}
                </div>
                <div className="cal-body">
                  {c.dosis.map((v) => (
                    <div key={v.id} className={`cal-dosis cal-dosis-${v.estado}`}>
                      <b>{v.vacuna_nombre}</b>
                      <div>Dosis {v.dosis_numero}</div>
                      <div className="cal-fecha">
                        {v.estado === 'aplicada' ? `Aplicada: ${formatearFecha(v.fecha_aplicada)}` : `Fecha: ${formatearFecha(v.fecha_proxima_dosis)}`}
                      </div>
                      <span className={`badge ${claseEstado(v.estado)}`}>{v.estado}</span>
                      {v.estado !== 'aplicada' && puedeAplicar && (
                        abierta === v.id ? (
                          <div style={{ marginTop: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#555' }}>Fecha en que se aplicó</label>
                            <input type="date" value={fecha} min={minimo} max={hoy} onChange={(e) => setFecha(e.target.value)} style={{ marginBottom: '0.4rem' }} />
                            {error && <div style={{ color: '#c0392b', fontSize: '0.75rem' }}>{error}</div>}
                            <button onClick={() => guardar(v.id)}>Guardar</button>{' '}
                            <button type="button" onClick={() => setAbierta(null)} style={{ background: '#888' }}>Cancelar</button>
                          </div>
                        ) : (
                          <div><button style={{ marginTop: '0.4rem' }} onClick={() => abrir(v)}>Marcar aplicada</button></div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
