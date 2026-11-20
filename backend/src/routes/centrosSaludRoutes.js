const router = require('express').Router();
const ctrl = require('../controllers/centrosSaludController');
const { autenticar, autorizar } = require('../middleware/auth');

const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro'];

router.get('/', autenticar, autorizar(...PUEDEN_VER), ctrl.listar);
router.get('/:id', autenticar, autorizar(...PUEDEN_VER), ctrl.obtener);
router.post('/', autenticar, autorizar('administrador', 'personal_salud'), ctrl.crear);
router.put('/:id', autenticar, autorizar('administrador', 'personal_salud'), ctrl.actualizar);
router.delete('/:id', autenticar, autorizar('administrador'), ctrl.eliminar);

module.exports = router;
