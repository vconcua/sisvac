const router = require('express').Router();
const ctrl = require('../controllers/catalogosController');
const { autenticar } = require('../middleware/auth');

router.get('/departamentos', autenticar, ctrl.listarDepartamentos);
router.get('/municipios', autenticar, ctrl.listarMunicipios);
router.get('/comunidades-linguisticas', autenticar, ctrl.listarComunidadesLinguisticas);

module.exports = router;
