const router = require('express').Router();
const ctrl = require('../controllers/campaniasController');
const { autenticar, autorizar } = require('../middleware/auth');

const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro'];
const PUEDEN_GESTIONAR = ['administrador', 'personal_salud'];

router.get('/', autenticar, autorizar(...PUEDEN_VER), ctrl.listar);
router.get('/:id/destinatarios', autenticar, autorizar(...PUEDEN_VER), ctrl.destinatarios);
router.post('/', autenticar, autorizar(...PUEDEN_GESTIONAR), ctrl.crear);
router.post('/:id/enviar', autenticar, autorizar(...PUEDEN_GESTIONAR), ctrl.enviar);
router.delete('/:id', autenticar, autorizar(...PUEDEN_GESTIONAR), ctrl.eliminar);

module.exports = router;
