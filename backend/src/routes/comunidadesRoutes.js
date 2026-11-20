const router = require('express').Router();
const ctrl = require('../controllers/comunidadesController');
const { autenticar, autorizar } = require('../middleware/auth');

// Nota: "consulta_limitada" NO está en esta lista a propósito — ese
// rol solo puede ver niños y padres, no comunidades.
const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro'];

// enfermeria puede VER comunidades (solo para elegir una al registrar niños y padres)
router.get('/', autenticar, autorizar(...PUEDEN_VER, 'enfermeria'), ctrl.listar);
router.get('/:id', autenticar, autorizar(...PUEDEN_VER), ctrl.obtener);
router.post('/', autenticar, autorizar('administrador', 'personal_salud'), ctrl.crear);
router.put('/:id', autenticar, autorizar('administrador', 'personal_salud'), ctrl.actualizar);
router.delete('/:id', autenticar, autorizar('administrador'), ctrl.eliminar);

module.exports = router;
