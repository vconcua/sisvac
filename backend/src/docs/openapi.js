/**
 * Especificación OpenAPI 3 (Swagger) de la API REST de SISVAC.
 * Se muestra en  GET /api/docs  (interfaz Swagger UI)  y  GET /api/docs.json  (JSON crudo).
 *
 * Cada endpoint se describe una sola vez en la lista ENDPOINTS; abajo se convierte al formato OpenAPI.
 * Los roles de cada ruta deben coincidir con backend/src/routes/ (hay una prueba automática que lo verifica).
 */
const ROL = {
  A: 'administrador', PS: 'personal_salud', EC: 'encargado_centro', CL: 'consulta_limitada', EN: 'enfermeria',
};
const TODOS = ['A', 'PS', 'EC', 'CL', 'EN'];

const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const uuid = { type: 'string', format: 'uuid' };
const json = (schema, ejemplo) => ({ required: true, content: { 'application/json': { schema, ...(ejemplo ? { example: ejemplo } : {}) } } });
const lista = (n) => ({ type: 'array', items: ref(n) });

// ---------------------------------------------------------------- esquemas
const schemas = {
  Error: { type: 'object', properties: { error: { type: 'string', example: 'Recurso no encontrado' } } },
  LoginRequest: { type: 'object', required: ['correo', 'password'], properties: { correo: { type: 'string', example: 'admin@centrosalud.gob.gt' }, password: { type: 'string', example: 'TuClaveSegura123' } } },
  LoginResponse: { type: 'object', properties: { token: { type: 'string', description: 'JWT; enviarlo como Authorization: Bearer <token>' }, usuario: ref('Usuario') } },
  LoginPadreRequest: { type: 'object', required: ['dpi', 'pin'], properties: { dpi: { type: 'string', example: '2000000000101' }, pin: { type: 'string', example: '123456' } } },
  Usuario: { type: 'object', properties: { id: uuid, nombre_completo: { type: 'string' }, correo: { type: 'string' }, rol: { type: 'string', enum: Object.values(ROL) }, centro_salud: { type: 'string', nullable: true } } },
  UsuarioNuevo: {
    type: 'object', required: ['nombre_completo', 'correo', 'password', 'rol'],
    properties: { nombre_completo: { type: 'string' }, correo: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, rol: { type: 'string', enum: Object.values(ROL) }, centro_salud: { type: 'string' } },
  },
  Ninio: {
    type: 'object',
    properties: {
      id: uuid, nombre_completo: { type: 'string' }, fecha_nacimiento: { type: 'string', format: 'date' }, sexo: { type: 'string', enum: ['M', 'F'] },
      comunidad_id: uuid, comunidad_nombre: { type: 'string' }, edad_meses: { type: 'number' }, qr_codigo: { type: 'string', format: 'uuid', description: 'Identificador único del carnet QR' },
      centro_salud_nombre: { type: 'string', nullable: true }, centro_salud_tipo: { type: 'string', nullable: true }, centro_salud_municipio: { type: 'string', nullable: true },
      padres: { type: 'array', items: { type: 'object', properties: { id: uuid, nombre: { type: 'string' } } } },
    },
  },
  NinioNuevo: {
    type: 'object', required: ['nombre_completo', 'fecha_nacimiento', 'sexo', 'comunidad_id'],
    properties: { nombre_completo: { type: 'string', example: 'Ana María Pérez' }, fecha_nacimiento: { type: 'string', format: 'date', example: '2026-03-01' }, sexo: { type: 'string', enum: ['M', 'F'] }, comunidad_id: uuid, padre_id: { ...uuid, description: 'Opcional: vincula al padre/madre al registrar' } },
  },
  Padre: {
    type: 'object',
    properties: {
      id: uuid, nombre_completo: { type: 'string' }, dpi: { type: 'string' }, telefono: { type: 'string', example: '+50255551234' }, correo: { type: 'string' }, telegram_chat_id: { type: 'string' },
      canal_preferido: { type: 'string', enum: ['email', 'telegram', 'whatsapp', 'sms'] }, comunidad_id: uuid, comunidad_linguistica_id: uuid,
      ninios: { type: 'array', items: { type: 'object', properties: { id: uuid, nombre: { type: 'string' } } } },
    },
    description: 'DPI, teléfono, correo y Telegram se guardan cifrados (AES-256-GCM) y la API los devuelve descifrados a los roles autorizados.',
  },
  PadreNuevo: {
    type: 'object', required: ['nombre_completo', 'dpi'],
    properties: {
      nombre_completo: { type: 'string' }, dpi: { type: 'string' }, telefono: { type: 'string', example: '+50255551234' }, correo: { type: 'string', format: 'email' }, telegram_chat_id: { type: 'string' },
      canal_preferido: { type: 'string', enum: ['email', 'telegram', 'whatsapp', 'sms'], default: 'email' }, comunidad_id: uuid, comunidad_linguistica_id: uuid,
      ninio_id: { ...uuid, description: 'Opcional: vincula al niño y le envía el carnet digital' }, parentesco: { type: 'string', example: 'madre' },
    },
  },
  Medicion: { type: 'object', required: ['ninio_id', 'peso_kg', 'talla_cm'], properties: { ninio_id: uuid, fecha_medicion: { type: 'string', format: 'date', description: 'Por omisión, hoy' }, peso_kg: { type: 'number', example: 6.8 }, talla_cm: { type: 'number', example: 63.5 } } },
  RegistroCrecimiento: { type: 'object', properties: { id: uuid, ninio_id: uuid, fecha_medicion: { type: 'string', format: 'date' }, peso_kg: { type: 'number' }, talla_cm: { type: 'number' }, edad_meses_al_medir: { type: 'number' }, percentil_peso: { type: 'number' }, percentil_talla: { type: 'number' } } },
  Vacunacion: { type: 'object', properties: { id: uuid, ninio_id: uuid, vacuna_nombre: { type: 'string' }, dosis_numero: { type: 'integer' }, fecha_proxima_dosis: { type: 'string', format: 'date' }, fecha_aplicada: { type: 'string', format: 'date', nullable: true }, estado: { type: 'string', enum: ['pendiente', 'aplicada', 'atrasada'] } } },
  Vacuna: { type: 'object', properties: { id: uuid, nombre: { type: 'string' }, edad_recomendada_meses: { type: 'integer' }, dosis_numero: { type: 'integer' }, descripcion: { type: 'string' } } },
  Alerta: { type: 'object', properties: { id: uuid, ninio_id: uuid, tipo: { type: 'string', enum: ['critica', 'preventiva'] }, motivo: { type: 'string' }, mensaje: { type: 'string' }, estado: { type: 'string', enum: ['pendiente', 'atendida'] }, creado_en: { type: 'string', format: 'date-time' } } },
  Comunidad: { type: 'object', properties: { id: uuid, nombre: { type: 'string' }, ubicacion: { type: 'string' }, departamento_id: uuid, municipio_id: uuid, centro_salud_id: { ...uuid, nullable: true }, numero_estimado_familias: { type: 'integer' }, comunidad_linguistica_id: { ...uuid, nullable: true } } },
  ComunidadNueva: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string' }, ubicacion: { type: 'string' }, departamento_id: uuid, municipio_id: uuid, centro_salud_id: uuid, numero_estimado_familias: { type: 'integer' }, comunidad_linguistica_id: uuid } },
  CentroSalud: { type: 'object', properties: { id: uuid, nombre: { type: 'string' }, tipo_establecimiento: { type: 'string', example: 'Centro de Salud' }, departamento_id: uuid, municipio_id: uuid, direccion: { type: 'string' }, telefono: { type: 'string' }, latitud: { type: 'number' }, longitud: { type: 'number' } } },
  CentroSaludNuevo: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string' }, tipo_establecimiento: { type: 'string' }, departamento_id: uuid, municipio_id: uuid, direccion: { type: 'string' }, telefono: { type: 'string' }, latitud: { type: 'number' }, longitud: { type: 'number' } } },
  CampaniaNueva: {
    type: 'object', required: ['titulo', 'mensaje'],
    properties: { titulo: { type: 'string', maxLength: 200 }, mensaje: { type: 'string' }, comunidad_id: uuid, edad_min_meses: { type: 'integer', minimum: 0 }, edad_max_meses: { type: 'integer', minimum: 0 }, estado_vacunacion_filtro: { type: 'string', enum: ['pendiente', 'aplicada', 'atrasada'] } },
  },
  Campania: { type: 'object', properties: { id: uuid, titulo: { type: 'string' }, mensaje: { type: 'string' }, estado: { type: 'string', example: 'borrador' }, comunidad_nombre: { type: 'string' } } },
  Aviso: { type: 'object', required: ['mensaje'], properties: { asunto: { type: 'string' }, mensaje: { type: 'string' } } },
  CarnetPublico: {
    type: 'object',
    properties: {
      nombre: { type: 'string' }, fecha_nacimiento: { type: 'string', format: 'date' }, edad_meses: { type: 'number' }, sexo: { type: 'string' }, comunidad: { type: 'string' }, centro_salud: { type: 'string' },
      historial_crecimiento: { type: 'array', items: { type: 'object' } }, esquema_vacunacion: { type: 'array', items: { type: 'object' } },
    },
  },
  Reporte: { type: 'object', properties: { titulo: { type: 'string' }, columnas: { type: 'array', items: { type: 'string' } }, filas: { type: 'array', items: { type: 'array', items: {} } } } },
};

// --------------------------------------------------------------- parámetros
const p = (name, desc, extra = {}) => ({ name, in: 'path', required: true, description: desc, schema: { ...uuid, ...extra } });
const q = (name, desc, schema = { type: 'string' }) => ({ name, in: 'query', required: false, description: desc, schema });
const P = {
  id: p('id', 'Identificador (UUID)'),
  ninioId: p('ninioId', 'Identificador del niño (UUID)'),
  padreNinio: p('ninioId', 'Identificador del niño (UUID)'),
  comunidadQ: q('comunidad_id', 'Filtrar por comunidad (UUID)'),
};

// ---------------------------------------------------------- lista de rutas
// [método, ruta, etiqueta, resumen, roles | 'publico' | 'autenticado', opciones]
const ENDPOINTS = [
  // Autenticación
  ['post', '/auth/login', 'Autenticación', 'Iniciar sesión (personal)', 'publico', { body: json(ref('LoginRequest')), ok: ['200', 'Token JWT y datos del usuario', ref('LoginResponse')], err: ['400', '401'] }],
  ['post', '/auth/login-padre', 'Autenticación', 'Iniciar sesión de un padre/madre con DPI + PIN del carnet (bloqueo 15 min tras 5 intentos fallidos)', 'publico', { body: json(ref('LoginPadreRequest')), ok: ['200', 'Token y niños del padre'], err: ['400', '401', '429'] }],
  ['get', '/auth/usuarios', 'Autenticación', 'Listar usuarios del sistema', ['A'], { ok: ['200', 'Lista de usuarios', lista('Usuario')] }],
  ['post', '/auth/usuarios', 'Autenticación', 'Crear un usuario (cualquier rol)', ['A'], { body: json(ref('UsuarioNuevo')), ok: ['201', 'Usuario creado', ref('Usuario')], err: ['400', '409'] }],

  // Niños
  ['get', '/ninios', 'Niños', 'Listar niños (con padres y centro de salud)', ['A', 'PS', 'EC', 'CL', 'EN'], { params: [P.comunidadQ], ok: ['200', 'Lista de niños', lista('Ninio')] }],
  ['get', '/ninios/{id}', 'Niños', 'Obtener un niño', ['A', 'PS', 'EC', 'CL', 'EN'], { params: [P.id], ok: ['200', 'Niño', ref('Ninio')], err: ['404'] }],
  ['post', '/ninios', 'Niños', 'Registrar un niño (genera su QR y PIN automáticamente)', ['A', 'PS', 'EN'], { body: json(ref('NinioNuevo')), ok: ['201', 'Niño creado, con qr_codigo y qr_pin', ref('Ninio')], err: ['400'] }],
  ['put', '/ninios/{id}', 'Niños', 'Modificar los datos de un niño', ['A', 'PS'], { params: [P.id], body: json(ref('NinioNuevo')), ok: ['200', 'Niño actualizado', ref('Ninio')], err: ['400', '404'] }],
  ['delete', '/ninios/{id}', 'Niños', 'Dar de baja a un niño (borrado lógico)', ['A'], { params: [P.id], ok: ['204', 'Eliminado'] }],

  // Padres
  ['get', '/padres', 'Padres', 'Listar padres con sus niños', ['A', 'PS', 'EC', 'CL', 'EN'], { params: [P.comunidadQ], ok: ['200', 'Lista de padres', lista('Padre')] }],
  ['get', '/padres/{id}', 'Padres', 'Obtener un padre/madre', ['A', 'PS', 'EC', 'CL', 'EN'], { params: [P.id], ok: ['200', 'Padre', ref('Padre')], err: ['404'] }],
  ['post', '/padres', 'Padres', 'Registrar un padre/madre (opcionalmente vinculado a un niño)', ['A', 'PS', 'EN'], { body: json(ref('PadreNuevo')), ok: ['201', 'Padre creado', ref('Padre')], err: ['400', '403', '409'] }],
  ['put', '/padres/{id}', 'Padres', 'Modificar los datos de un padre/madre (incluye corregir el DPI)', ['A', 'PS'], { params: [P.id], body: json(ref('PadreNuevo')), ok: ['200', 'Padre actualizado', ref('Padre')], err: ['400', '404', '409'] }],
  ['delete', '/padres/{id}', 'Padres', 'Eliminar un padre/madre', ['A'], { params: [P.id], ok: ['204', 'Eliminado'] }],
  ['post', '/padres/{id}/ninios', 'Padres', 'Vincular un niño existente (le envía el carnet digital)', ['A', 'PS', 'EN'], { params: [P.id], body: json({ type: 'object', required: ['ninio_id'], properties: { ninio_id: uuid, parentesco: { type: 'string', example: 'madre' } } }), ok: ['201', 'Vinculado'], err: ['400', '403'] }],
  ['delete', '/padres/{id}/ninios/{ninioId}', 'Padres', 'Desvincular un niño de un padre', ['A', 'PS'], { params: [P.id, P.padreNinio], ok: ['204', 'Desvinculado'] }],
  ['put', '/padres/{id}/telegram', 'Padres', 'Guardar el chat_id de Telegram del padre', ['A', 'PS'], { params: [P.id], body: json({ type: 'object', properties: { telegram_chat_id: { type: 'string' } } }), ok: ['200', 'Padre actualizado', ref('Padre')], err: ['404'] }],
  ['post', '/padres/{id}/avisar', 'Padres', 'Enviar un aviso manual por su canal preferido', ['A', 'PS'], { params: [P.id], body: json(ref('Aviso'), { asunto: 'Recordatorio', mensaje: 'Le esperamos en el centro de salud.' }), ok: ['200', 'Aviso enviado'], err: ['400', '404'] }],

  // Crecimiento
  ['get', '/crecimiento/ninio/{ninioId}/curvas', 'Crecimiento', 'Mediciones del niño + curvas de referencia OMS (P3, P5, P50, P95, P97) de 0 a 60 meses, para graficar peso y talla vs edad', ['A', 'PS', 'EC', 'EN'], { params: [P.ninioId], ok: ['200', 'Mediciones y referencia OMS'], err: ['404'] }],
  ['get', '/crecimiento/ninio/{ninioId}', 'Crecimiento', 'Historial de peso y talla de un niño', ['A', 'PS', 'EC', 'EN'], { params: [P.ninioId], ok: ['200', 'Mediciones', lista('RegistroCrecimiento')] }],
  ['post', '/crecimiento', 'Crecimiento', 'Registrar una medición (percentiles OMS; alerta si P<5 o P>95)', ['A', 'PS', 'EN'], { body: json(ref('Medicion')), ok: ['201', 'Medición y alertas generadas'], err: ['404'] }],

  // Vacunación
  ['get', '/vacunacion/catalogo', 'Vacunación', 'Catálogo de vacunas (esquema oficial)', ['A', 'PS', 'EC', 'EN'], { ok: ['200', 'Vacunas', lista('Vacuna')] }],
  ['get', '/vacunacion/ninio/{ninioId}', 'Vacunación', 'Esquema de vacunación de un niño', ['A', 'PS', 'EC', 'EN'], { params: [P.ninioId], ok: ['200', 'Dosis del niño', lista('Vacunacion')] }],
  ['post', '/vacunacion/ninio/{ninioId}/generar-esquema', 'Vacunación', 'Generar el esquema de vacunación de un niño (no duplica dosis)', ['A', 'PS', 'EN'], { params: [P.ninioId], ok: ['201', 'Dosis creadas', lista('Vacunacion')], err: ['403', '404'] }],
  ['put', '/vacunacion/{id}/aplicar', 'Vacunación', 'Marcar una dosis como aplicada', ['A', 'PS', 'EN'], { params: [P.id], body: json({ type: 'object', properties: { fecha_aplicada: { type: 'string', format: 'date', description: 'Por omisión, hoy' } } }), ok: ['200', 'Dosis actualizada', ref('Vacunacion')], err: ['400', '404'] }],
  ['post', '/vacunacion/actualizar-atrasadas', 'Vacunación', 'Marcar como atrasadas las dosis vencidas', ['A', 'PS'], { ok: ['200', 'Cantidad actualizada'] }],

  // Alertas
  ['get', '/alertas', 'Alertas', 'Listar alertas', ['A', 'PS', 'EC'], { params: [q('estado', 'pendiente | atendida'), q('tipo', 'critica | preventiva')], ok: ['200', 'Alertas', lista('Alerta')] }],
  ['post', '/alertas/detectar-abandono', 'Alertas', 'Detectar niños sin seguimiento (abandono)', ['A', 'PS'], { ok: ['200', 'Resumen de la detección'] }],
  ['post', '/alertas/avisos-automaticos', 'Alertas', 'Ejecutar ahora los avisos automáticos a los padres', ['A', 'PS'], { ok: ['200', 'Resumen de avisos enviados'] }],
  ['put', '/alertas/{id}/atender', 'Alertas', 'Marcar una alerta como atendida', ['A', 'PS'], { params: [P.id], ok: ['200', 'Alerta actualizada', ref('Alerta')], err: ['404'] }],
  ['post', '/alertas/{id}/notificar', 'Alertas', 'Notificar la alerta a los padres del niño', ['A', 'PS'], { params: [P.id], ok: ['200', 'Resultado del envío'], err: ['404'] }],

  // Carnet
  ['get', '/carnet/{qrCodigo}/acceso', 'Carnet digital', 'Indica si el carnet exige el DPI del padre/madre (cuando el niño ya tiene padre vinculado)', 'publico', {
    params: [p('qrCodigo', 'Código QR del niño (UUID)')], ok: ['200', 'requiere_dpi: true/false'], err: ['404'],
  }],
  ['post', '/carnet/{qrCodigo}', 'Carnet digital', 'Consulta pública del carnet: PIN + DPI del padre/madre autorizado. Bloqueo 15 min tras 5 intentos fallidos', 'publico', {
    params: [p('qrCodigo', 'Código QR del niño (UUID)')], body: json({ type: 'object', required: ['pin'], properties: { pin: { type: 'string', example: '123456' }, dpi: { type: 'string', example: '2000000000101', description: 'DPI de un padre/madre vinculado al niño. Obligatorio si el niño tiene padres vinculados' } } }),
    ok: ['200', 'Datos del carnet', ref('CarnetPublico')], err: ['400', '401', '404', '429'],
  }],
  ['get', '/carnet/ninio/{ninioId}/qr', 'Carnet digital', 'Imagen QR (PNG en base64), enlace y PIN del carnet de un niño', ['A', 'PS', 'EC', 'EN'], { params: [P.ninioId], ok: ['200', 'url, qr_imagen_base64, pin'], err: ['404'] }],
  ['post', '/carnet/ninio/{ninioId}/enviar', 'Carnet digital', 'Enviar el carnet (enlace + PIN) a los padres por su canal preferido', ['A', 'PS', 'EN'], { params: [P.ninioId], ok: ['200', 'Resumen: enviados, fallidos, omitidos'], err: ['404', '409'] }],

  // Catálogos
  ['get', '/catalogos/departamentos', 'Catálogos', 'Departamentos de Guatemala', 'autenticado', { ok: ['200', 'Departamentos'] }],
  ['get', '/catalogos/municipios', 'Catálogos', 'Municipios', 'autenticado', { params: [q('departamento_id', 'Filtrar por departamento (UUID)')], ok: ['200', 'Municipios'] }],
  ['get', '/catalogos/comunidades-linguisticas', 'Catálogos', 'Comunidades lingüísticas (idiomas mayas, garífuna, xinca, castellano)', 'autenticado', { params: [q('departamento_id', 'Filtrar por departamento (UUID)')], ok: ['200', 'Comunidades lingüísticas'] }],

  // Centros de salud
  ['get', '/centros-salud', 'Centros de salud', 'Listar centros de salud', ['A', 'PS', 'EC'], { params: [q('departamento_id', 'UUID'), q('municipio_id', 'UUID'), q('tipo_establecimiento', 'Tipo de establecimiento'), q('q', 'Búsqueda por nombre')], ok: ['200', 'Centros', lista('CentroSalud')] }],
  ['get', '/centros-salud/{id}', 'Centros de salud', 'Obtener un centro de salud', ['A', 'PS', 'EC'], { params: [P.id], ok: ['200', 'Centro', ref('CentroSalud')], err: ['404'] }],
  ['post', '/centros-salud', 'Centros de salud', 'Crear un centro de salud', ['A', 'PS'], { body: json(ref('CentroSaludNuevo')), ok: ['201', 'Centro creado', ref('CentroSalud')], err: ['400'] }],
  ['put', '/centros-salud/{id}', 'Centros de salud', 'Modificar un centro de salud', ['A', 'PS'], { params: [P.id], body: json(ref('CentroSaludNuevo')), ok: ['200', 'Centro actualizado', ref('CentroSalud')], err: ['404'] }],
  ['delete', '/centros-salud/{id}', 'Centros de salud', 'Eliminar un centro de salud', ['A'], { params: [P.id], ok: ['204', 'Eliminado'] }],

  // Comunidades
  ['get', '/comunidades', 'Comunidades', 'Listar comunidades (con su centro de salud)', ['A', 'PS', 'EC', 'EN'], { ok: ['200', 'Comunidades', lista('Comunidad')] }],
  ['get', '/comunidades/{id}', 'Comunidades', 'Obtener una comunidad', ['A', 'PS', 'EC'], { params: [P.id], ok: ['200', 'Comunidad', ref('Comunidad')], err: ['404'] }],
  ['post', '/comunidades', 'Comunidades', 'Crear una comunidad', ['A', 'PS'], { body: json(ref('ComunidadNueva')), ok: ['201', 'Comunidad creada', ref('Comunidad')], err: ['400'] }],
  ['put', '/comunidades/{id}', 'Comunidades', 'Modificar una comunidad (p. ej. asignar su centro de salud)', ['A', 'PS'], { params: [P.id], body: json(ref('ComunidadNueva')), ok: ['200', 'Comunidad actualizada', ref('Comunidad')], err: ['400', '404'] }],
  ['delete', '/comunidades/{id}', 'Comunidades', 'Eliminar una comunidad', ['A'], { params: [P.id], ok: ['204', 'Eliminada'] }],

  // Campañas
  ['get', '/campanias', 'Campañas', 'Listar campañas de envío masivo', ['A', 'PS', 'EC'], { ok: ['200', 'Campañas', lista('Campania')] }],
  ['get', '/campanias/{id}/destinatarios', 'Campañas', 'Vista previa de los padres que recibirían la campaña', ['A', 'PS', 'EC'], { params: [P.id], ok: ['200', 'Destinatarios'], err: ['404'] }],
  ['post', '/campanias', 'Campañas', 'Crear una campaña (borrador) con filtros por comunidad, edad y vacunación', ['A', 'PS'], { body: json(ref('CampaniaNueva')), ok: ['201', 'Campaña creada', ref('Campania')], err: ['400'] }],
  ['post', '/campanias/{id}/enviar', 'Campañas', 'Enviar la campaña (una sola vez; cada padre recibe un solo mensaje)', ['A', 'PS'], { params: [P.id], ok: ['200', 'Resumen del envío'], err: ['404', '409'] }],
  ['delete', '/campanias/{id}', 'Campañas', 'Eliminar una campaña en borrador', ['A', 'PS'], { params: [P.id], ok: ['204', 'Eliminada'], err: ['404'] }],

  // Reportes
  ['get', '/reportes/resumen', 'Reportes', 'Resumen general del panel (totales)', ['A', 'PS', 'EC'], { ok: ['200', 'Totales'] }],
  ['get', '/reportes/cobertura-vacunacion', 'Reportes', 'Cobertura de vacunación por comunidad', ['A', 'PS', 'EC'], { ok: ['200', 'Cobertura'] }],
  ['get', '/reportes/distribucion-nutricional', 'Reportes', 'Distribución nutricional de los niños', ['A', 'PS', 'EC'], { ok: ['200', 'Distribución'] }],
  ['get', '/reportes/{nombre}/exportar', 'Reportes', 'Descargar un reporte en Excel o PDF (guarda copia en S3 si está configurado)', ['A', 'PS', 'EC'], {
    params: [{ name: 'nombre', in: 'path', required: true, schema: { type: 'string', enum: ['ninios-riesgo', 'vacunas-incompletas', 'crecimiento-por-region', 'cobertura-vacunacion'] } }, q('formato', 'xlsx (por omisión) o pdf', { type: 'string', enum: ['xlsx', 'pdf'] })],
    ok: ['200', 'Archivo descargable'], err: ['400', '404'],
  }],
  ['get', '/reportes/{nombre}', 'Reportes', 'Reporte nominal en JSON', ['A', 'PS', 'EC'], {
    params: [{ name: 'nombre', in: 'path', required: true, schema: { type: 'string', enum: ['ninios-riesgo', 'vacunas-incompletas', 'crecimiento-por-region', 'cobertura-vacunacion'] } }],
    ok: ['200', 'Reporte', ref('Reporte')], err: ['404'],
  }],
];

// ------------------------------------------------------------- construcción
const MENSAJES = {
  400: 'Datos inválidos o faltantes', 401: 'Sin sesión, token vencido o credenciales incorrectas', 403: 'El rol no tiene permiso para esta operación',
  404: 'No encontrado', 409: 'Conflicto (duplicado o estado no válido)', 429: 'Demasiados intentos; espere unos minutos',
};

function construirPaths() {
  const paths = {};
  for (const [metodo, ruta, etiqueta, resumen, acceso, o = {}] of ENDPOINTS) {
    const publico = acceso === 'publico';
    const roles = Array.isArray(acceso) ? acceso.map((r) => ROL[r]) : null;
    const textoAcceso = publico ? 'Público (no requiere token).'
      : roles ? `**Roles permitidos:** ${roles.join(', ')}.` : 'Cualquier usuario autenticado.';
    const [codigoOk, descOk, esquemaOk] = o.ok || ['200', 'OK'];
    const responses = {
      [codigoOk]: { description: descOk, ...(esquemaOk ? { content: { 'application/json': { schema: esquemaOk } } } : {}) },
    };
    for (const c of o.err || []) responses[c] = { description: MENSAJES[c], content: { 'application/json': { schema: ref('Error') } } };
    if (!publico) {
      responses['401'] = { description: MENSAJES[401], content: { 'application/json': { schema: ref('Error') } } };
      if (roles) responses['403'] = { description: MENSAJES[403], content: { 'application/json': { schema: ref('Error') } } };
    }
    paths[ruta] = paths[ruta] || {};
    paths[ruta][metodo] = {
      tags: [etiqueta], summary: resumen, description: textoAcceso,
      ...(publico ? { security: [] } : {}),
      ...(o.params ? { parameters: o.params } : {}),
      ...(o.body ? { requestBody: o.body } : {}),
      responses,
      'x-roles': roles || (publico ? ['público'] : ['autenticado']),
    };
  }
  paths['/health'] = { get: { tags: ['Sistema'], summary: 'Verificar que la API está viva', security: [], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { estado: { type: 'string', example: 'ok' }, servicio: { type: 'string', example: 'SISVAC API' } } } } } } } } };
  return paths;
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'SISVAC — API REST',
    version: '2.0.0',
    description:
      'Sistema de Control de Crecimiento Infantil y Vacunación para centros de salud municipales de Guatemala.\n\n' +
      '**Cómo probar:** 1) Ejecute `POST /auth/login` con su correo y contraseña. 2) Copie el `token` de la respuesta. ' +
      '3) Pulse el botón **Authorize** (arriba a la derecha) y pegue el token. 4) Use «Try it out» en cualquier ruta.\n\n' +
      '**Roles:** administrador, personal_salud, encargado_centro, consulta_limitada, enfermeria. Un rol sin permiso recibe `403`.\n\n' +
      '**Seguridad:** los datos personales de los padres se guardan cifrados (AES-256-GCM); el carnet público exige PIN y se bloquea 15 minutos tras 5 intentos fallidos.',
  },
  servers: [{ url: '/api', description: 'Este servidor' }],
  tags: [
    'Sistema', 'Autenticación', 'Niños', 'Padres', 'Crecimiento', 'Vacunación', 'Alertas', 'Carnet digital',
    'Catálogos', 'Centros de salud', 'Comunidades', 'Campañas', 'Reportes',
  ].map((name) => ({ name })),
  paths: construirPaths(),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token obtenido en POST /auth/login' } },
    schemas,
  },
  security: [{ bearerAuth: [] }],
};

module.exports = spec;
// solo para las pruebas automáticas: no aparece en el JSON publicado
Object.defineProperty(module.exports, 'ENDPOINTS', { enumerable: false, value: ENDPOINTS.map(([m, r, , , a]) => ({ metodo: m, ruta: r, acceso: a })) });
