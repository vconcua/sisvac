/**
 * Punto de entrada para despliegue en AWS Lambda.
 * Envuelve la aplicación Express existente (src/app.js) usando
 * serverless-http, para que corra igual detrás de API Gateway
 * sin duplicar lógica de negocio.
 */
const serverless = require('serverless-http');
const app = require('./app');

exports.handler = serverless(app);
