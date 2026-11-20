const router = require('express').Router();
const ctrl = require('../controllers/reportesController');
const { autenticar, autorizar } = require('../middleware/auth');

// "consulta_limitada" NO tiene acceso a reportes (solo ve niños y padres)
const PUEDEN_VER = ['administrador', 'personal_salud', 'encargado_centro'];

router.get('/resumen', autenticar, autorizar(...PUEDEN_VER), ctrl.resumenGeneral);
router.get('/cobertura-vacunacion', autenticar, autorizar(...PUEDEN_VER), ctrl.coberturaVacunacion);
router.get('/distribucion-nutricional', autenticar, autorizar(...PUEDEN_VER), ctrl.distribucionNutricional);

// Reportes nominales: /ninios-riesgo, /vacunas-incompletas, /crecimiento-por-region, /cobertura-vacunacion
router.get('/:nombre/exportar', autenticar, autorizar(...PUEDEN_VER), ctrl.exportar);
router.get('/:nombre', autenticar, autorizar(...PUEDEN_VER), ctrl.obtenerReporte);

module.exports = router;
