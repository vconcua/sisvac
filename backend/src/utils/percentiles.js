/**
 * Cálculo de edad en meses y percentiles de crecimiento con el método LMS (Lambda-Mu-Sigma)
 * y las tablas OFICIALES de la OMS (Patrones de Crecimiento Infantil 2006, 0 a 60 meses):
 * peso para la edad y talla (longitud/estatura) para la edad, por sexo. Ver oms_tablas.js.
 *
 * Entre dos meses de la tabla se interpola linealmente. Fuera de 0-60 meses se usa el valor del
 * extremo (el programa atiende de 0 a 5 años).
 */
const { PESO_PARA_EDAD, LONGITUD_PARA_EDAD, ESTATURA_PARA_EDAD } = require('./oms_tablas');

// Z-scores de los percentiles que se dibujan en las curvas de referencia
const Z_PERCENTIL = { p3: -1.8808, p5: -1.6449, p15: -1.0364, p50: 0, p85: 1.0364, p95: 1.6449, p97: 1.8808 };

/** La OMS mide LONGITUD (acostado) antes de los 24 meses y ESTATURA (de pie) desde los 24. */
function tablaTalla(sexo, edadMeses) {
  return edadMeses < 24 ? LONGITUD_PARA_EDAD[sexo] : ESTATURA_PARA_EDAD[sexo];
}

function calcularEdadMeses(fechaNacimiento, fechaMedicion = new Date()) {
  const nacimiento = new Date(fechaNacimiento);
  const medicion = new Date(fechaMedicion);
  const diffMs = medicion - nacimiento;
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  return Math.round((diffDias / 30.4375) * 100) / 100;
}

function interpolarLMS(filas, edadMeses) {
  const fila = (f) => ({ L: f[1], M: f[2], S: f[3] });
  if (edadMeses <= filas[0][0]) return fila(filas[0]);
  if (edadMeses >= filas[filas.length - 1][0]) return fila(filas[filas.length - 1]);

  for (let i = 0; i < filas.length - 1; i++) {
    const a = filas[i];
    const b = filas[i + 1];
    if (edadMeses >= a[0] && edadMeses <= b[0]) {
      const frac = (edadMeses - a[0]) / (b[0] - a[0]);
      return {
        L: a[1] + frac * (b[1] - a[1]),
        M: a[2] + frac * (b[2] - a[2]),
        S: a[3] + frac * (b[3] - a[3]),
      };
    }
  }
  return fila(filas[filas.length - 1]);
}

function calcularZScore(valorMedido, L, M, S) {
  if (Math.abs(L) < 1e-6) {
    return Math.log(valorMedido / M) / S;
  }
  return (Math.pow(valorMedido / M, L) - 1) / (L * S);
}

function zScoreAPercentil(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) prob = 1 - prob;
  return Math.round(prob * 10000) / 100;
}

function percentilPeso(pesoKg, edadMeses, sexo) {
  const { L, M, S } = interpolarLMS(PESO_PARA_EDAD[sexo], edadMeses);
  const z = calcularZScore(pesoKg, L, M, S);
  return { zScore: Math.round(z * 100) / 100, percentil: zScoreAPercentil(z) };
}

function percentilTalla(tallaCm, edadMeses, sexo) {
  const { L, M, S } = interpolarLMS(tablaTalla(sexo, edadMeses), edadMeses);
  const z = calcularZScore(tallaCm, L, M, S);
  return { zScore: Math.round(z * 100) / 100, percentil: zScoreAPercentil(z) };
}

/** Valor (kg o cm) que corresponde a un z-score en una edad: inversa de calcularZScore. */
function valorParaZ(L, M, S, z) {
  if (Math.abs(L) < 1e-6) return M * Math.exp(S * z);
  return M * Math.pow(1 + L * S * z, 1 / L);
}

/**
 * Curvas de referencia de la OMS para dibujar la gráfica: para cada mes de 0 a 60,
 * el peso y la talla de los percentiles 5, 50 y 95 (y 3/97 por si se necesitan).
 * @returns {{peso: Array, talla: Array}} filas { meses, p3, p5, p50, p95, p97 }
 */
function curvaReferencia(sexo) {
  const redondear = (n) => Math.round(n * 100) / 100;
  const construir = (obtenerFilas) => {
    const filas = [];
    for (let m = 0; m <= 60; m++) {
      const { L, M, S } = interpolarLMS(obtenerFilas(m), m);
      const fila = { meses: m };
      for (const [nombre, z] of Object.entries(Z_PERCENTIL)) {
        if (['p3', 'p5', 'p50', 'p95', 'p97'].includes(nombre)) fila[nombre] = redondear(valorParaZ(L, M, S, z));
      }
      filas.push(fila);
    }
    return filas;
  };
  return { peso: construir(() => PESO_PARA_EDAD[sexo]), talla: construir((m) => tablaTalla(sexo, m)) };
}

module.exports = { calcularEdadMeses, percentilPeso, percentilTalla, curvaReferencia };
