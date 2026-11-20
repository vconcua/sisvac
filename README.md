# SISVAC — Sistema de Control de Crecimiento Infantil y Vacunación

Proyecto de Análisis y Desarrollo de Sistemas — Guatemala.
Sistema web para el control del crecimiento y esquema de vacunación de niños
atendidos por centros de salud municipales, con generación automática de
alertas, notificaciones multicanal, carnet digital QR, catálogo geográfico
oficial (departamentos/municipios) y gestión de centros de salud.

**Este ZIP ya trae todo integrado y probado**: no necesitas aplicar parches
por separado. Todo lo que se agregó durante el desarrollo (catálogo
geográfico, centros de salud, canal SMS, Telegram, Docker, AWS) ya está
en su lugar desde el `schema.sql`, los controladores y el frontend.

## Novedades de la versión 1.2

Avisos automáticos diarios a padres, vínculo padre↔niño visible, rol de enfermería
(ingresa pero no edita), alerta por abandono de seguimiento, cifrado de datos personales,
reportes con exportación Excel/PDF y campañas segmentadas.
Para actualizar un proyecto existente: **`docs/GUIA_ACTUALIZACION.md`**. Referencia de la API: **`docs/API_ENDPOINTS.md`**.

**Importante:** el backend exige la variable `ENCRYPTION_KEY` (64 caracteres hexadecimales); sin ella no arranca.

## Arquitectura y stack

- **Backend:** Node.js + Express (API REST) — carpeta `backend/`
- **Base de datos:** PostgreSQL — `backend/database/schema.sql`
- **Frontend:** React + Vite — carpeta `frontend/`
- **API REST documentada con Swagger (OpenAPI 3):** http://localhost:4000/api/docs · JSON en `/api/docs.json` · tabla de roles en `docs/API_ENDPOINTS.md`
- **Autenticación:** JWT (roles: administrador, personal_salud, encargado_centro, enfermeria, consulta_limitada, padre)
- **Notificaciones:** correo (SMTP), Telegram Bot API, WhatsApp Business API, SMS (Amazon SNS)
- **Carnet digital:** cada niño recibe automáticamente un código QR único y un PIN de 6 dígitos al registrarse; el QR abre `/carnet/<código>` (página pública con PIN, bloqueo tras 5 intentos fallidos). Se puede imprimir/descargar desde la ficha del niño. Migración 014. Se envía solo a los padres (enlace + PIN, por su canal preferido) al vincularlos con el niño, y se puede reenviar con el botón «Enviar carnet a los padres».
- **Catálogo geográfico:** 22 departamentos y 340 municipios de Guatemala (verificados)
- **Centros de salud:** tabla + CRUD completo (importable desde el CSV oficial del MSPAS)
- **Infraestructura cloud (opcional):** AWS Lambda (backend + tareas), RDS PostgreSQL, S3 (QR y documentos) y SNS (notificaciones). Guía completa en `docs/DEPLOY_AWS.md`.

## Tres formas de correr el proyecto

1. **Local** (Node.js + PostgreSQL instalados directamente) — sección A
2. **Docker** (recomendado si no quieres instalar Node/Postgres) — sección B
3. **AWS** (Lambda + RDS + S3 + SNS, para producción real) — ver `docs/DEPLOY_AWS.md`

---

## A) Correr localmente

### 1. Base de datos

Carga los archivos **en este orden exacto**:

```bash
createdb sisvac
psql -d sisvac -f backend/database/schema.sql
psql -d sisvac -f backend/database/seed.sql
psql -d sisvac -f backend/database/migrations/002_agregar_canal_sms.sql
psql -d sisvac -f backend/database/migrations/003_agregar_telegram_chat_id.sql
psql -d sisvac -f backend/database/migrations/004_catalogo_departamentos_municipios.sql
psql -d sisvac -f backend/database/migrations/005_centros_salud.sql
psql -d sisvac -f backend/database/migrations/006_ampliar_centros_salud.sql
psql -d sisvac -f backend/database/migrations/007_rol_consulta_limitada.sql
psql -d sisvac -f backend/database/migrations/008_cifrado_datos_padres.sql
psql -d sisvac -f backend/database/migrations/009_dpi_hash_unico.sql
psql -d sisvac -f backend/database/migrations/010_campanias_envio.sql
psql -d sisvac -f backend/database/migrations/011_enfermeria_y_avisos.sql
```

(Las migraciones 002, 003 y 005 son idempotentes — no fallan aunque
`schema.sql` ya incluya esos cambios; están ahí por si se aplica este
catálogo sobre una base de datos creada con una versión anterior.)

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL, JWT_SECRET, etc.
npm run dev
```

Verificar: `curl http://localhost:4000/api/health`

### 3. Crear el primer usuario administrador

```bash
node -e "console.log(require('bcryptjs').hashSync('TuClaveSegura123', 10))"
```

```sql
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol)
VALUES ('Administrador General', 'admin@centrosalud.gob.gt', '<hash generado>', 'administrador');
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.

---

## B) Correr con Docker

```bash
cp .env.docker.example .env
# Editar PGPASSWORD y JWT_SECRET en .env
docker compose up --build
```

Esto levanta PostgreSQL (con `schema.sql`, `seed.sql` y las 4
migraciones cargados automáticamente la primera vez que se crea el
volumen de datos), el backend en `:4000` y el frontend en `:5173` —
todo en un solo comando, sin pasos manuales adicionales.

Si ya tenías un volumen de Docker de una versión anterior de este
proyecto (antes de que las migraciones 004/005 se agregaran al
`docker-compose.yml`), bórralo para forzar una carga limpia:

```bash
docker compose down -v
docker compose up --build
```

---

## Cargar el directorio real de centros de salud (opcional)

La tabla `centros_salud` viene vacía por defecto — no existe una fuente
pública confiable para precargarla automáticamente (ver
`docs/INTEGRACION_CENTROS_SALUD.md` para la explicación completa).
Para cargarla con datos reales:

1. Descarga el CSV desde https://establecimientosdesalud.mspas.gob.gt
2. `docker compose cp tu_archivo.csv backend:/app/establecimientos.csv`
   (o, en local: coloca el CSV donde quieras)
3. `docker compose exec backend node scripts/importar_centros_salud.js /app/establecimientos.csv`
   (o, en local: `node backend/scripts/importar_centros_salud.js /ruta/al/archivo.csv`)

El script vincula automáticamente cada fila con el catálogo de 22
departamentos y 340 municipios ya cargado.

---

## Estructura del proyecto

```
proyecto/
├── README.md
├── docker-compose.yml
├── .env.docker.example
├── backend/
│   ├── package.json / .env.example / serverless.yml / Dockerfile
│   ├── database/
│   │   ├── schema.sql            (incluye catálogo geográfico + centros_salud desde el inicio)
│   │   ├── seed.sql              (catálogo de vacunas)
│   │   └── migrations/
│   │       ├── 002_agregar_canal_sms.sql
│   │       ├── 003_agregar_telegram_chat_id.sql
│   │       ├── 004_catalogo_departamentos_municipios.sql   (datos: 22 deptos, 340 municipios)
│   │       └── 005_centros_salud.sql
│   ├── scripts/
│   │   └── importar_centros_salud.js   (importador del CSV oficial del MSPAS)
│   └── src/
│       ├── config/ middleware/ controllers/ routes/ utils/
│       ├── app.js / server.js / handler.js / scheduledTasks.js
├── frontend/
│   ├── package.json / vite.config.js / index.html / Dockerfile
│   └── src/
│       ├── api/ components/
│       └── pages/  (incluye Comunidades y CentrosSalud con menús en cascada Depto→Municipio)
└── docs/
    ├── DEPLOY_AWS.md
    ├── DOCKER.md
    └── INTEGRACION_CENTROS_SALUD.md
```

## Módulos funcionales

1. Autenticación y roles (personal + padres por DPI/PIN)
2. Catálogo geográfico oficial (22 departamentos, 340 municipios) con menús en cascada
3. Gestión de centros de salud (CRUD + importación desde CSV oficial del MSPAS)
4. Gestión de comunidades, padres y niños — vinculados al catálogo geográfico
5. Registro de crecimiento con percentiles OMS (método LMS) y alertas automáticas
6. Esquema de vacunación automático según catálogo oficial de Guatemala
7. Notificaciones multicanal: correo, Telegram, WhatsApp, SMS (Amazon SNS)
8. Carnet digital con QR + PIN (2FA), con respaldo en S3 si se despliega en AWS
9. Reportes: cobertura de vacunación por comunidad, distribución nutricional
10. Tarea programada (cron local o Lambda+EventBridge) para vacunas atrasadas

## Notas de cumplimiento de requisitos
- Percentiles con las tablas oficiales OMS (0–60 meses, método LMS, por sexo; longitud <24 m y estatura ≥24 m). Alertas: percentil <5 (preventiva; <3 crítica) y >95.
- Carnet digital: QR único por niño + PIN de 6 dígitos + DPI de un padre vinculado; bloqueo de 15 min tras 5 intentos fallidos.
- Catálogo de vacunas: esquema de vacunación vigente (migración 016, 29 dosis de 0 meses a 10 años).
- Documentación: API REST en `/api/docs` (Swagger), UML en `docs/UML.md`.
