const router = require('express').Router();
const ctrl = require('../controllers/padresController');
const { autenticar, autorizar } = require('../middleware/auth');

const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro', 'consulta_limitada', 'enfermeria'];

router.get('/', autenticar, autorizar(...PUEDEN_VER), ctrl.listar);
router.get('/:id', autenticar, autorizar(...PUEDEN_VER), ctrl.obtener);
// enfermeria puede INGRESAR padres nuevos y vincularlos a los niños que ella registró; nada más
router.post('/', autenticar, autorizar('administrador', 'personal_salud', 'enfermeria'), ctrl.crear);
router.put('/:id', autenticar, autorizar('administrador', 'personal_salud'), ctrl.actualizar);
router.delete('/:id', autenticar, autorizar('administrador'), ctrl.eliminar);
router.post('/:id/ninios', autenticar, autorizar('administrador', 'personal_salud', 'enfermeria'), ctrl.asociarNinio);
router.delete('/:id/ninios/:ninioId', autenticar, autorizar('administrador', 'personal_salud'), ctrl.desvincularNinio);
router.put('/:id/telegram', autenticar, autorizar('administrador', 'personal_salud'), ctrl.vincularTelegram);
router.post('/:id/avisar', autenticar, autorizar('administrador', 'personal_salud'), ctrl.enviarAviso);

module.exports = router;
