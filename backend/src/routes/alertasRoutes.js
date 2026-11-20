const router = require('express').Router();
const ctrl = require('../controllers/alertasController');
const { autenticar, autorizar } = require('../middleware/auth');

const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro'];

router.get('/', autenticar, autorizar(...PUEDEN_VER), ctrl.listar);
router.post('/detectar-abandono', autenticar, autorizar('administrador', 'personal_salud'), ctrl.detectarAbandono);
router.post('/avisos-automaticos', autenticar, autorizar('administrador', 'personal_salud'), ctrl.ejecutarAvisos);
router.put('/:id/atender', autenticar, autorizar('administrador', 'personal_salud'), ctrl.marcarAtendida);
router.post('/:id/notificar', autenticar, autorizar('administrador', 'personal_salud'), ctrl.notificar);

module.exports = router;
