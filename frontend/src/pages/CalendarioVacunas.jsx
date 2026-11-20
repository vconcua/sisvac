import React from 'react';

// Calendario de vacunación: desde el embarazo hasta el adulto mayor.
// Es una referencia fija (no depende de la base de datos).
const ETAPAS = [
  { clave: 'embarazo', titulo: 'Embarazo', vacunas: [
    { n: 'TDaP', d: 'Dosis única a partir de las 20 semanas (aplicar en cada embarazo)' },
    { n: 'Influenza estacional', d: 'Dosis única en cualquier trimestre del embarazo (aplicar en cada embarazo)' },
    { n: 'Hepatitis B', d: 'Dosis inicial a partir de las 12 semanas · 2a. dosis un mes después de la 1a. · 3a. dosis 6 meses después de la 1a.' },
  ] },
  { clave: 'rn', titulo: 'Recién nacido', vacunas: [
    { n: 'BCG', d: 'Dosis única' },
    { n: 'Hepatitis B', d: 'Dosis única' },
  ] },
  { clave: '2m', titulo: '2 meses', vacunas: [
    { n: 'Poliomielitis', d: '1a. dosis' }, { n: 'Pentavalente', d: '1a. dosis' },
    { n: 'Rotavirus', d: '1a. dosis' }, { n: 'Neumococo', d: '1a. dosis' },
  ] },
  { clave: '4m', titulo: '4 meses', vacunas: [
    { n: 'Poliomielitis', d: '2a. dosis' }, { n: 'Pentavalente', d: '2a. dosis' },
    { n: 'Rotavirus', d: '2a. dosis' }, { n: 'Neumococo', d: '2a. dosis' },
  ] },
  { clave: '6m', titulo: '6 meses', vacunas: [
    { n: 'Poliomielitis', d: '3a. dosis' }, { n: 'Pentavalente', d: '3a. dosis' },
  ] },
  { clave: '12m', titulo: '12 meses', sub: '(1 año)', vacunas: [
    { n: 'SPR', d: '1a. dosis' }, { n: 'Neumococo', d: 'Refuerzo' },
  ] },
  { clave: '15m', titulo: '15 meses', sub: '(1 año 3 meses)', vacunas: [
    { n: 'Hepatitis A', d: '1a. dosis' }, { n: 'Varicela', d: '1a. dosis' },
  ] },
  { clave: '18m', titulo: '18 meses', sub: '(1 año 6 meses)', vacunas: [
    { n: 'DPT', d: '1er. refuerzo' }, { n: 'Poliomielitis', d: '1er. refuerzo' }, { n: 'SPR', d: '2a. dosis' },
  ] },
  { clave: '21m', titulo: '21 meses', sub: '(1 año 9 meses)', vacunas: [
    { n: 'Hepatitis A', d: '2a. dosis (6 meses después de la 1a. dosis)' },
  ] },
  { clave: '48m', titulo: '48 meses', sub: '(4 años)', vacunas: [
    { n: 'DPT', d: '2o. refuerzo' }, { n: 'Poliomielitis', d: '2o. refuerzo' }, { n: 'Varicela', d: '2a. dosis' },
  ] },
  { clave: '9a', titulo: 'De 9 a 18 años', vacunas: [
    { n: 'VPH', d: 'Niñas y niños a partir de los 9 años: 1a. dosis inicial · 2a. dosis (2 meses después de la 1a.) · 3a. dosis (4 meses después de la 2a.)' },
    { n: 'Grupos priorizados', d: 'Personas con VIH, víctimas de violencia sexual' },
    { n: 'TDaP', d: 'Niñas y niños a partir de los 10 años: 3er. refuerzo' },
  ] },
  { clave: 'riesgo', titulo: 'Población de riesgo y adulto mayor', vacunas: [
    { n: 'Hepatitis B', d: '3 dosis' }, { n: 'Hepatitis A', d: '2 dosis' }, { n: 'Neumococo', d: '2 dosis' },
    { n: 'TDaP', d: 'Dosis única' },
    { n: 'VPH', d: 'Hombres y mujeres de 18 a 26 años, de 1 a 3 dosis según antecedente vacunal' },
    { n: 'Toxoide Tetánico', d: 'Esquema profiláctico según antecedente vacunal' },
    { n: 'Antirrábica', d: 'Esquema profiláctico según factor de riesgo' },
    { n: 'Sarampión-Rubéola', d: '2 dosis' },
  ] },
];

export default function CalendarioVacunas() {
  return (
    <div>
      <h1>Calendario de vacunación</h1>
      <p style={{ color: '#555' }}>Vacunas que corresponden en cada etapa de la vida, desde el embarazo hasta el adulto mayor.</p>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="cal-grid">
          {ETAPAS.map((e) => (
            <div key={e.clave} className="cal-col">
              <div className="cal-head">
                <strong>{e.titulo}</strong>
                {e.sub && <div className="cal-sub">{e.sub}</div>}
              </div>
              <div className="cal-body">
                {e.vacunas.map((v, i) => (
                  <div key={i} className="cal-vac">
                    <b>{v.n}</b>
                    <div>{v.d}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="cal-banda cal-lactancia">Lactancia materna exclusiva desde el nacimiento hasta los 6 meses (primera vacuna)</div>
        <div className="cal-banda cal-influenza">Influenza estacional: 1a. dosis a partir de los 6 meses, 2a. dosis un mes después de la primera dosis, luego administrar 1 dosis anual</div>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <h3>En caso de accidentes con heridas contaminadas, contacto o mordedura de animales</h3>
          <table>
            <tbody>
              <tr><td><b>Toxoide Tetánico</b> (vacuna antitetánica)</td><td>Según antecedente vacunal</td></tr>
              <tr><td><b>Antitoxina Tetánica</b></td><td>Dosis única según antecedente vacunal</td></tr>
              <tr><td><b>Vacuna Antirrábica</b></td><td>5 dosis los días: 0, 3, 7, 14 y 28</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Población de riesgo</h3>
          <p><b>Actividad laboral:</b> personal de salud, trabajadores de agricultura, ganadería, avicultura, piscicultura, porcicultura, saneamiento ambiental, personal de seguridad, construcción, mecánicos, carniceros, talabarteros, herreros, aserraderos, manipuladores de herramienta y equipo industrial, biólogos, veterinarios, manipuladores de alimentos.</p>
          <p><b>Enfermos crónicos:</b> cardiovasculares, respiratorios, metabólicos, renales, hepáticos, hematológicos, obesidad, etc.</p>
          <p><b>Inmunocomprometidos:</b> VIH-SIDA, trasplantados, cáncer, asplenia anatómica o funcional, reumatológicos, tratamiento con medicamentos inmunosupresores.</p>
        </div>
      </div>
    </div>
  );
}
