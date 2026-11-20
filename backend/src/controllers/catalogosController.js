const db = require('../config/db');

/** Lista los 22 departamentos de Guatemala */
async function listarDepartamentos(req, res) {
  const { rows } = await db.query('SELECT id, nombre FROM departamentos ORDER BY nombre');
  res.json(rows);
}

/**
 * Lista municipios. Si se pasa ?departamento_id=, filtra solo los
 * municipios de ese departamento (uso típico: menú desplegable en
 * cascada — primero se elige el departamento, luego se cargan sus
 * municipios).
 */
async function listarMunicipios(req, res) {
  const { departamento_id } = req.query;
  if (departamento_id) {
    const { rows } = await db.query(
      'SELECT id, nombre, departamento_id FROM municipios WHERE departamento_id = $1 ORDER BY nombre',
      [departamento_id]
    );
    return res.json(rows);
  }
  const { rows } = await db.query(
    `SELECT m.id, m.nombre, m.departamento_id, d.nombre AS departamento_nombre
     FROM municipios m JOIN departamentos d ON d.id = m.departamento_id
     ORDER BY d.nombre, m.nombre`
  );
  res.json(rows);
}

/**
 * Lista las 25 comunidades lingüísticas, cada una con los departamentos donde se habla.
 * Con ?departamento_id= devuelve solo las que se hablan en ese departamento
 * (el castellano aparece siempre, porque se asocia a todo el país).
 */
async function listarComunidadesLinguisticas(req, res) {
  const { departamento_id } = req.query;
  const params = [];
  let filtro = '';
  if (departamento_id) {
    params.push(departamento_id);
    filtro = `WHERE cl.id IN (SELECT comunidad_linguistica_id FROM comunidad_linguistica_departamento WHERE departamento_id = $1)`;
  }
  const { rows } = await db.query(
    `SELECT cl.id, cl.nombre, cl.pueblo,
            COALESCE(json_agg(json_build_object('id', d.id, 'nombre', d.nombre) ORDER BY d.nombre)
                     FILTER (WHERE d.id IS NOT NULL), '[]') AS departamentos
     FROM comunidades_linguisticas cl
     LEFT JOIN comunidad_linguistica_departamento x ON x.comunidad_linguistica_id = cl.id
     LEFT JOIN departamentos d ON d.id = x.departamento_id
     ${filtro}
     GROUP BY cl.id ORDER BY cl.nombre`,
    params
  );
  res.json(rows);
}

module.exports = { listarDepartamentos, listarMunicipios, listarComunidadesLinguisticas };
