const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
require('express-async-errors'); // un error dentro de un controlador async responde 500 en vez de colgar o tumbar el servidor
require('./utils/cifrado').validarConfiguracionCifrado(); // aborta con mensaje claro si falta ENCRYPTION_KEY

const authRoutes = require('./routes/authRoutes');
const comunidadesRoutes = require('./routes/comunidadesRoutes');
const padresRoutes = require('./routes/padresRoutes');
const niniosRoutes = require('./routes/niniosRoutes');
const crecimientoRoutes = require('./routes/crecimientoRoutes');
const vacunacionRoutes = require('./routes/vacunacionRoutes');
const alertasRoutes = require('./routes/alertasRoutes');
const carnetRoutes = require('./routes/carnetRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const catalogosRoutes = require('./routes/catalogosRoutes');
const centrosSaludRoutes = require('./routes/centrosSaludRoutes');
const campaniasRoutes = require('./routes/campaniasRoutes');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ estado: 'ok', servicio: 'SISVAC API' }));

// Documentación interactiva de la API (Swagger UI) y su especificación OpenAPI en JSON
app.get('/api/docs.json', (req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'SISVAC — API REST',
  swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
}));

app.use('/api/auth', authRoutes);
app.use('/api/comunidades', comunidadesRoutes);
app.use('/api/padres', padresRoutes);
app.use('/api/ninios', niniosRoutes);
app.use('/api/crecimiento', crecimientoRoutes);
app.use('/api/vacunacion', vacunacionRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/carnet', carnetRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/centros-salud', centrosSaludRoutes);
app.use('/api/campanias', campaniasRoutes);

app.use((req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
