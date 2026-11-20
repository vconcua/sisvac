const router = require('express').Router();
const ctrl = require('../controllers/carnetController');
const { autenticar, autorizar } = require('../middleware/auth');

router.get('/:qrCodigo/acceso', ctrl.accesoCarnet);
router.post('/:qrCodigo', ctrl.consultarCarnet);
router.get('/ninio/:ninioId/qr', autenticar, autorizar('administrador', 'personal_salud', 'encargado_centro', 'enfermeria'), ctrl.obtenerImagenQR);
router.post('/ninio/:ninioId/enviar', autenticar, autorizar('administrador', 'personal_salud', 'enfermeria'), ctrl.enviarCarnet);

module.exports = router;
