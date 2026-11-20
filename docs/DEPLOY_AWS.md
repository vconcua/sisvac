# Infraestructura de SISVAC en AWS (paso a paso)

Esta guía crea todo en AWS desde cero. Los comandos son para **CMD de Windows**.
Región usada en los ejemplos: `us-east-1` (puedes cambiarla, pero usa la misma en todo).

## 0. Qué se va a crear

```
 Padres / personal ──HTTPS──► CloudFront ──► S3 (frontend React)
        │                       (CDN + certificado HTTPS gratis)
        │  /api
        ▼
  API Gateway (HTTP API) ──► Lambda "api" (Express) ──► RDS PostgreSQL (subred privada)
                               │      ▲
   EventBridge (3 horarios)────┘      │  cifrado AES-256 de datos de padres (ENCRYPTION_KEY)
   06:00 vacunas · 06:30 abandono ·   │
   07:00 avisos a padres              ├──► S3 privado (imágenes QR)
                                      ├──► SNS (alertas críticas al personal)
                                      └──► SMTP / Telegram / WhatsApp (salida a Internet vía NAT)
```

## Servicios de la infraestructura cloud y para qué se usa cada uno

| Servicio AWS | Rol en SISVAC | Dónde se ve en el sistema |
|---|---|---|
| **Lambda** | Ejecuta el backend (API Express) sin servidor propio y las 3 tareas programadas diarias (vacunas atrasadas 06:00, abandono de seguimiento 06:30, avisos a padres 07:00, hora de Guatemala). | Toda la aplicación; logs en CloudWatch. |
| **RDS (PostgreSQL)** | Base de datos relacional: niños, padres (datos personales cifrados con AES-256), mediciones, vacunación, alertas, notificaciones, usuarios. | Todos los módulos. |
| **S3** (QR y documentos) | Un bucket **privado y cifrado**: `qr/` guarda la imagen QR del carnet de cada niño; `documentos/reportes/` guarda copia de cada reporte Excel/PDF exportado. Acceso solo por URL firmada temporal. | Carnet digital con QR; Reportes → exportar. |
| **SNS** (notificaciones) | (1) Tópico `sisvac-alertas-criticas`: avisa por correo al personal de salud cuando hay alertas críticas o vacunas atrasadas. (2) **SMS** directos a los padres que eligieron ese canal (avisos, recordatorios y carnet). | Alertas críticas; avisos automáticos a padres. |

Piezas complementarias: **API Gateway** (entrada HTTPS a Lambda), **EventBridge** (horarios de las tareas), **CloudFront + S3** (sitio web del frontend), **VPC/NAT** (red privada).

| Pieza | Servicio | ¿Quién la crea? |
|---|---|---|
| API (Express) | Lambda + API Gateway | `serverless deploy` |
| Tareas diarias (3) | Lambda + EventBridge | `serverless deploy` |
| Bucket de QR y documentos (privado) y tópico SNS | S3, SNS | `serverless deploy` |
| Base de datos | RDS PostgreSQL | a mano (paso 3) |
| Frontend | S3 + CloudFront | a mano (paso 6) |

> **Costos:** RDS y, sobre todo, el **NAT Gateway** cobran por hora aunque nadie use el sistema.
> Para la defensa del proyecto: despliega, graba/prueba, y **elimina todo** con el paso 10.
> Revisa precios actuales en la calculadora de AWS antes de dejarlo encendido.

## 1. Requisitos en tu PC

1. Cuenta de AWS y un usuario IAM con permisos de administrador (para el proyecto de clase).
   Crea una *Access key* en IAM → Usuarios → Credenciales de seguridad.
2. **AWS CLI**: https://aws.amazon.com/cli/ y luego `aws configure` (pega la Access key, la Secret, región `us-east-1`, formato `json`).
3. **Node.js 18+** y **Docker Desktop** (ya lo tienes).
4. Verifica: `aws sts get-caller-identity` debe mostrar tu cuenta.

## 2. Red (VPC)

Usa la VPC por defecto para simplificar, pero Lambda **necesita subredes privadas con salida a Internet** (NAT) para enviar correos/Telegram/WhatsApp.

Consola AWS → **VPC**:
1. **Crear VPC → “VPC y más”**: nombre `sisvac`, 2 zonas de disponibilidad, **2 subredes públicas, 2 privadas, 1 NAT Gateway**, **Gateway endpoint de S3: Sí**. (El asistente crea las tablas de rutas.)
2. Crea dos **Security Groups** dentro de esa VPC:
   - `sg-lambda`: sin reglas de entrada; salida: todo permitido.
   - `sg-rds`: entrada **PostgreSQL (5432)** con origen = `sg-lambda`.
3. Anota: el ID de `sg-lambda` y los IDs de las **2 subredes privadas**.

*(Alternativa barata solo para demo, sin NAT: en `backend/serverless.yml` borra el bloque `vpc:`, haz el RDS “accesible públicamente” con SSL y contraseña larga, y abre 5432 solo mientras lo uses. Los avisos por correo/Telegram funcionarán, pero es menos seguro: no lo uses con datos reales.)*

## 3. Base de datos (RDS PostgreSQL)

Consola → **RDS → Crear base de datos**:
- Motor **PostgreSQL 16**, plantilla **Desarrollo/Pruebas** (o “Capa gratuita” si tu cuenta la tiene).
- Identificador `sisvac-db`, usuario maestro `sisvac_admin`, **contraseña larga** (guárdala).
- Clase `db.t4g.micro` (o la más pequeña), almacenamiento 20 GB, **cifrado activado**.
- Conectividad: VPC `sisvac`, grupo de subredes nuevo con las **2 privadas**, **Acceso público: No**, Security Group `sg-rds`.
- Base de datos inicial: `sisvac`.
- Cuando esté “Disponible”, copia el **Endpoint** (algo como `sisvac-db.xxxx.us-east-1.rds.amazonaws.com`).

## 4. Crear las tablas y datos base

RDS está en subred privada: tu PC no llega directo. Para correr las migraciones **una sola vez**:
1. RDS → tu instancia → **Modificar** → Acceso público **Sí** → aplicar de inmediato.
2. Añade temporalmente a `sg-rds` una regla de entrada **PostgreSQL 5432, origen “Mi IP”**.
3. Desde la carpeta del proyecto:
   ```
   infra\migrar_rds.bat sisvac-db.xxxx.us-east-1.rds.amazonaws.com sisvac_admin sisvac
   ```
   Pide la contraseña y ejecuta `schema.sql`, `seed.sql` y las migraciones 002–016 en orden (usa Docker, no necesitas instalar psql).
4. **Revierte**: Acceso público **No** y borra la regla de “Mi IP”.

Crear el primer administrador (hash de la clave y luego INSERT; ver `docs/DOCKER.md`, sección 4). Para hacerlo con RDS repite brevemente los pasos 1–2 de arriba y ejecuta:
```
docker compose run --rm backend node -e "console.log(require('bcryptjs').hashSync('TuClaveSegura123', 10))"
docker run --rm -it -e PGPASSWORD=TU_CLAVE_RDS -e PGSSLMODE=require postgres:16-alpine psql -h ENDPOINT -U sisvac_admin -d sisvac -c "INSERT INTO usuarios (nombre_completo, correo, password_hash, rol) VALUES ('Administrador General','admin@centrosalud.gob.gt','<HASH>','administrador');"
```

## 5. Desplegar el backend (Lambda + API Gateway + S3 + SNS + tareas)

Genera las claves **una vez y guárdalas** (si pierdes `ENCRYPTION_KEY`, los datos cifrados de los padres no se recuperan):
```
docker compose run --rm backend node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Ejecútalo dos veces: una para `ENCRYPTION_KEY` y otra para `HASH_KEY`. Para `JWT_SECRET` usa otro valor largo aleatorio.

En CMD (las variables solo viven en esa ventana):
```
cd backend
set PGHOST=sisvac-db.xxxx.us-east-1.rds.amazonaws.com
set PGUSER=sisvac_admin
set PGPASSWORD=TU_CLAVE_RDS
set PGDATABASE=sisvac
set JWT_SECRET=...
set ENCRYPTION_KEY=...64 caracteres hex...
set HASH_KEY=...64 caracteres hex...
set LAMBDA_SECURITY_GROUP_ID=sg-xxxxxxxx
set LAMBDA_SUBNET_ID_1=subnet-xxxxxxxx
set LAMBDA_SUBNET_ID_2=subnet-yyyyyyyy
set FRONTEND_URL=https://temporal.example.com
set SMTP_HOST=...&& set SMTP_USER=...&& set SMTP_PASS=...
npm install
npx serverless deploy --stage prod
```
(`FRONTEND_URL` se corrige en el paso 7. Los canales SMTP/Telegram/WhatsApp son opcionales.)

Al terminar imprime la **URL de la API** (`https://xxxx.execute-api.us-east-1.amazonaws.com`). Prueba:
```
curl https://xxxx.execute-api.us-east-1.amazonaws.com/api/health
```
Debe responder `{"estado":"ok","servicio":"SISVAC API"}`.

Se crean 4 funciones: `api`, `tareaVacunasAtrasadas` (06:00), `tareaAbandonoSeguimiento` (06:30) y `tareaAvisosAutomaticos` (07:00, hora de Guatemala), más el bucket privado de QR y el tópico SNS.

## 6. Frontend (S3 + CloudFront)

1. Crea un bucket S3 (privado, bloquear todo acceso público), p. ej. `sisvac-frontend-TUNOMBRE`.
2. Compila apuntando a tu API:
   ```
   cd frontend
   echo VITE_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com/api> .env.production
   npm install
   npm run build
   aws s3 sync dist s3://sisvac-frontend-TUNOMBRE --delete
   ```
3. Consola → **CloudFront → Crear distribución**: origen = el bucket, **Origin access control (OAC)** (acepta que te sugiera la política del bucket y pégala en S3 → Permisos), “Redirigir HTTP a HTTPS”, objeto raíz predeterminado `index.html`.
4. **Importante (rutas de React):** en la distribución → **Páginas de error** → crea dos reglas: códigos **403** y **404** → ruta `/index.html`, código de respuesta **200**. Sin esto, abrir directamente el enlace del QR (`/carnet/...`) o refrescar una página da error.
5. Anota el dominio: `https://dxxxxxxxx.cloudfront.net`.

## 7. Conectar frontend y backend

Vuelve a desplegar el backend con la URL real (afecta CORS y los enlaces del QR/carnet que reciben los padres):
```
cd backend
set FRONTEND_URL=https://dxxxxxxxx.cloudfront.net
npx serverless deploy --stage prod
```
(Recuerda que las variables `set` del paso 5 deben seguir en esa ventana; si la cerraste, vuelve a ponerlas.)

## 8. Alertas críticas al personal de salud (SNS)
```
aws sns subscribe --topic-arn <ARN-del-topico> --protocol email --notification-endpoint personal@centrosalud.gob.gt
```
El ARN lo ves en SNS → Temas → `sisvac-alertas-criticas-prod`. Cada persona debe confirmar el correo que le llega.

**SMS a los padres (SNS):** las cuentas nuevas de AWS empiezan en el *SMS sandbox*: solo se puede enviar a números **verificados** (SNS → Mensajería de texto móvil (SMS) → Números de teléfono de destino verificados). Para la defensa, verifica tu número y el de tu compañero; para uso real, pide salir del sandbox y fija un límite de gasto mensual. Los teléfonos de los padres deben estar en formato internacional (`+502...`).

## 9. Lista de verificación

| Prueba | Cómo | Resultado esperado |
|---|---|---|
| API viva | `/api/health` | `{"estado":"ok"...}` |
| Login | Abrir el dominio de CloudFront e iniciar sesión | Entra al panel |
| Registrar niño | Niños → nuevo | Aparece con QR y PIN |
| Documentos en S3 | Exportar un reporte (Reportes → Excel/PDF) y mirar S3 → bucket `sisvac-qr-documentos-prod` → `documentos/reportes/` | Aparece una copia con la fecha |
| Swagger | Abrir `https://xxxx.execute-api.us-east-1.amazonaws.com/api/docs` | Muestra la documentación de la API |
| Carnet público | Abrir `https://<cloudfront>/carnet/<código>` | Pide PIN y muestra el carnet |
| Tareas diarias | `npx serverless logs -f tareaAvisosAutomaticos --stage prod` | Líneas `[LAMBDA CRON]` sin errores |
| Prueba manual de una tarea | `npx serverless invoke -f tareaAvisosAutomaticos --stage prod` | `statusCode 200` |

## 10. Apagar y eliminar (para no seguir pagando)

1. `cd backend` y `npx serverless remove --stage prod` (borra Lambdas, API Gateway, SNS y el bucket de QR; vacía antes el bucket de QR si da error).
2. CloudFront: **Deshabilitar** la distribución y luego eliminarla.
3. Vaciar y eliminar el bucket del frontend.
4. RDS: eliminar la instancia (guarda antes un snapshot si lo necesitas).
5. VPC: eliminar el **NAT Gateway**, liberar la **IP elástica** y luego la VPC.

## Seguridad (qué decir en la defensa)

- Datos personales de los padres (DPI, teléfono, correo, Telegram) **cifrados con AES-256-GCM** en la base de datos.
- RDS en subred privada, cifrado en reposo y conexión SSL (`PGSSL=true`); solo Lambda puede conectarse (Security Group).
- Bucket de QR privado y cifrado; acceso por URLs firmadas temporales.
- Carnet público protegido con PIN y bloqueo de 15 minutos tras 5 intentos fallidos.
- En producción real, guarda claves en **Secrets Manager / SSM Parameter Store** en lugar de variables de entorno.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `no pg_hba.conf entry ... no encryption` | Falta SSL: el despliegue ya pone `PGSSL=true`; para migraciones usa `PGSSLMODE=require`. |
| La API responde pero tarda ~30 s y falla | Lambda sin salida a Internet: revisa que las subredes sean **privadas con ruta al NAT**. |
| `ENCRYPTION_KEY` / error al iniciar | Debe tener exactamente 64 caracteres hexadecimales. |
| Error de CORS en el navegador | `FRONTEND_URL` debe ser exactamente el dominio de CloudFront (con `https://`, sin `/` final). |
| El enlace del QR da “AccessDenied” | Faltan las páginas de error 403/404 → `/index.html` (paso 6.4). |
| `Too many connections` en RDS | Ya se limita el pool a 2 por instancia (`PG_POOL_MAX`); si persiste, usa una clase de RDS mayor o RDS Proxy. |
