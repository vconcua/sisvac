# SISVAC — Referencia de la API REST

> **Documentación interactiva (Swagger / OpenAPI 3):** con el sistema en marcha abre **http://localhost:4000/api/docs** (especificación en JSON: `/api/docs.json`). Desde ahí se puede iniciar sesión con *Authorize* y probar cada ruta.

Todas las rutas (excepto `/api/health` y `/api/auth/login`) exigen el encabezado `Authorization: Bearer <token>` obtenido en el inicio de sesión.
La columna **Roles** indica quién puede llamar a cada ruta; cualquier otro rol recibe `403`. (Generado a partir del código de `backend/src/routes/`.)

Roles: `administrador` (A), `personal_salud` (PS), `encargado_centro` (EC), `consulta_limitada` (CL), `enfermeria` (EN).

| Método | Ruta | Roles |
|---|---|---|
| GET | `/api/alertas` | A, PS, EC |
| POST | `/api/alertas/detectar-abandono` | A, PS |
| POST | `/api/alertas/avisos-automaticos` | A, PS |
| PUT | `/api/alertas/:id/atender` | A, PS |
| POST | `/api/alertas/:id/notificar` | A, PS |
| POST | `/api/auth/login` | público (sin token) |
| POST | `/api/auth/login-padre` | público (DPI + PIN; bloqueo 15 min tras 5 fallos) |
| GET | `/api/auth/usuarios` | A |
| POST | `/api/auth/usuarios` | A |
| GET | `/api/campanias` | A, PS, EC |
| GET | `/api/campanias/:id/destinatarios` | A, PS, EC |
| POST | `/api/campanias` | A, PS |
| POST | `/api/campanias/:id/enviar` | A, PS |
| DELETE | `/api/campanias/:id` | A, PS |
| GET | `/api/carnet/:qrCodigo/acceso` | público (indica si se requiere DPI) |
| POST | `/api/carnet/:qrCodigo` | público (PIN + DPI del padre vinculado; bloqueo 15 min tras 5 fallos) |
| GET | `/api/carnet/ninio/:ninioId/qr` | A, PS, EC, EN |
| POST | `/api/carnet/ninio/:ninioId/enviar` | A, PS, EN |
| GET | `/api/catalogos/departamentos` | cualquier usuario autenticado |
| GET | `/api/catalogos/municipios` | cualquier usuario autenticado |
| GET | `/api/catalogos/comunidades-linguisticas` (opcional `?departamento_id=`) | cualquier usuario autenticado |
| GET | `/api/centros-salud` | A, PS, EC |
| GET | `/api/centros-salud/:id` | A, PS, EC |
| POST | `/api/centros-salud` | A, PS |
| PUT | `/api/centros-salud/:id` | A, PS |
| DELETE | `/api/centros-salud/:id` | A |
| GET | `/api/comunidades` | A, PS, EC, EN |
| GET | `/api/comunidades/:id` | A, PS, EC |
| POST | `/api/comunidades` | A, PS |
| PUT | `/api/comunidades/:id` | A, PS |
| DELETE | `/api/comunidades/:id` | A |
| GET | `/api/crecimiento/ninio/:ninioId/curvas` | A, PS, EC, EN |
| GET | `/api/crecimiento/ninio/:ninioId` | A, PS, EC, EN |
| POST | `/api/crecimiento` | A, PS, EN |
| GET | `/api/ninios` | A, PS, EC, CL, EN |
| GET | `/api/ninios/:id` | A, PS, EC, CL, EN |
| POST | `/api/ninios` | A, PS, EN |
| PUT | `/api/ninios/:id` | A, PS |
| DELETE | `/api/ninios/:id` | A |
| GET | `/api/padres` | A, PS, EC, CL, EN |
| GET | `/api/padres/:id` | A, PS, EC, CL, EN |
| POST | `/api/padres` | A, PS, EN |
| PUT | `/api/padres/:id` | A, PS |
| DELETE | `/api/padres/:id` | A |
| POST | `/api/padres/:id/ninios` | A, PS, EN |
| DELETE | `/api/padres/:id/ninios/:ninioId` | A, PS |
| PUT | `/api/padres/:id/telegram` | A, PS |
| POST | `/api/padres/:id/avisar` | A, PS |
| GET | `/api/reportes/resumen` | A, PS, EC |
| GET | `/api/reportes/cobertura-vacunacion` | A, PS, EC |
| GET | `/api/reportes/distribucion-nutricional` | A, PS, EC |
| GET | `/api/reportes/:nombre/exportar` | A, PS, EC |
| GET | `/api/reportes/:nombre` | A, PS, EC |
| GET | `/api/vacunacion/catalogo` | A, PS, EC, EN |
| POST | `/api/vacunacion/ninio/:ninioId/generar-esquema` | A, PS, EN |
| GET | `/api/vacunacion/ninio/:ninioId` | A, PS, EC, EN |
| PUT | `/api/vacunacion/:id/aplicar` | A, PS, EN |
| POST | `/api/vacunacion/actualizar-atrasadas` | A, PS |

`/api/auth/login`, `/api/auth/login-padre`, `/api/auth/usuarios` y `/api/health` se documentan en `authRoutes.js` (login público; alta de usuarios solo `administrador`).

## Notas de comportamiento

- **Avisos automáticos:** `POST /api/alertas/avisos-automaticos` ejecuta lo mismo que corre solo cada día a las 07:00 (hora de Guatemala): avisa a los padres de alertas pendientes (últimos 30 días) y recuerda las vacunas de los próximos 7 días. Nunca repite un aviso; reintenta hasta 3 veces los que fallan.
- **Rol `enfermeria`:** puede crear niños y padres y vincularlos, pero solo si ella registró al niño o al padre (campo `creado_por`). No puede editar, eliminar ni desvincular.
- **Reportes:** `GET /api/reportes/:nombre` devuelve `{titulo, columnas, filas}`; agregando `/exportar?formato=xlsx|pdf` descarga el archivo. Nombres: `ninios-riesgo`, `vacunas-incompletas`, `crecimiento-por-region`, `cobertura-vacunacion`.
- **Campañas:** crear (borrador) → ver destinatarios (vista previa) → enviar. Un padre recibe una sola vez aunque tenga varios hijos; no se puede enviar dos veces la misma campaña.
- **Cifrado:** DPI, teléfono, correo y chat de Telegram de los padres se guardan cifrados (AES-256-GCM); la API los devuelve ya descifrados a los roles autorizados.
