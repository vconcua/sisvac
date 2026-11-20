const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { autenticar, autorizar } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/login-padre', ctrl.loginPadre);
router.get('/usuarios', autenticar, autorizar('administrador'), ctrl.listarUsuarios);
router.post('/usuarios', autenticar, autorizar('administrador'), ctrl.crearUsuario);

module.exports = router;
