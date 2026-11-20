const router = require('express').Router();
const ctrl = require('../controllers/crecimientoController');
const { autenticar, autorizar } = require('../middleware/auth');

const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro', 'enfermeria'];

router.get('/ninio/:ninioId/curvas', autenticar, autorizar(...PUEDEN_VER), ctrl.curvas);
router.get('/ninio/:ninioId', autenticar, autorizar(...PUEDEN_VER), ctrl.listarPorNinio);
router.post('/', autenticar, autorizar('administrador', 'personal_salud', 'enfermeria'), ctrl.crear);

module.exports = router;
