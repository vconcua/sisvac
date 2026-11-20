const router = require('express').Router();
const ctrl = require('../controllers/vacunacionController');
const { autenticar, autorizar } = require('../middleware/auth');

const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro', 'enfermeria'];

router.get('/catalogo', autenticar, autorizar(...PUEDEN_VER), ctrl.listarCatalogo);
// enfermeria genera el esquema solo de los niños que ella ingresó (se valida en el controlador)
router.post('/ninio/:ninioId/generar-esquema', autenticar, autorizar('administrador', 'personal_salud', 'enfermeria'), ctrl.generarEsquemaParaNinio);
router.get('/ninio/:ninioId', autenticar, autorizar(...PUEDEN_VER), ctrl.listarPorNinio);
router.put('/:id/aplicar', autenticar, autorizar('administrador', 'personal_salud', 'enfermeria'), ctrl.aplicarDosis);
router.post('/actualizar-atrasadas', autenticar, autorizar('administrador', 'personal_salud'), ctrl.actualizarAtrasadas);

module.exports = router;
