# Correr SISVAC con Docker

Con esto no necesitas instalar Node.js ni PostgreSQL directamente en tu
máquina — solo **Docker Desktop** (Windows/Mac) o **Docker Engine +
Docker Compose** (Linux).

## 1. Ubicar estos archivos dentro de tu proyecto

Este paquete solo trae los archivos nuevos de Docker. Colócalos dentro
de la carpeta de tu proyecto SISVAC ya descargado, respetando esta
ubicación:

```
proyecto/                          <- carpeta raíz de tu proyecto
├── docker-compose.yml             <- copiar aquí (raíz)
├── .env.docker.example            <- copiar aquí (raíz)
├── backend/
│   ├── Dockerfile                 <- copiar aquí
│   ├── .dockerignore              <- copiar aquí
│   └── ... (resto del backend que ya tenías)
└── frontend/
    ├── Dockerfile                 <- copiar aquí
    ├── .dockerignore              <- copiar aquí
    ├── nginx.conf                 <- copiar aquí
    └── ... (resto del frontend que ya tenías)
```

## 2. Configurar variables de entorno

En la raíz del proyecto:

```bash
cp .env.docker.example .env
```

Edita `.env` y como mínimo cambia `PGPASSWORD` y `JWT_SECRET`. Los
campos de SMTP/Telegram/WhatsApp/AWS puedes dejarlos vacíos si solo
quieres probar el sistema sin esas integraciones activas.

## 3. Levantar todo

```bash
docker compose up --build
```

La primera vez tarda unos minutos (descarga las imágenes base y
construye el backend y el frontend). Las siguientes veces es mucho
más rápido.

Esto deja corriendo:

| Servicio | URL | Descripción |
|---|---|---|
| Frontend | http://localhost:5173 | Aplicación web (React) |
| Backend | http://localhost:4000/api | API REST |
| PostgreSQL | localhost:5432 | Base de datos (accesible con pgAdmin/DBeaver si quieres) |

La base de datos se inicializa automáticamente en el primer arranque
con `schema.sql`, `seed.sql` y las migraciones — no necesitas correr
`psql` a mano.

## 4. Crear el primer usuario administrador

Igual que en la instalación local, el primer usuario se crea a mano
porque la ruta de creación de usuarios requiere estar ya autenticado
como administrador:

```bash
docker compose exec backend node -e "console.log(require('bcryptjs').hashSync('TuClaveSegura123', 10))"
```

Copia el hash impreso y ejecútalo contra la base de datos:

```bash
docker compose exec db psql -U sisvac_user -d sisvac -c "
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol)
VALUES ('Administrador General', 'admin@centrosalud.gob.gt', '<pega el hash aquí>', 'administrador');
"
```

(Usa el mismo `PGUSER`/`PGDATABASE` que hayas puesto en tu `.env` si
los cambiaste).

## 5. Comandos útiles

```bash
docker compose up -d            # levantar en segundo plano
docker compose logs -f backend  # ver logs del backend en vivo
docker compose down             # detener todo
docker compose down -v          # detener y borrar también la base de datos
docker compose up --build       # reconstruir imágenes tras cambiar código o dependencias
```

## Notas

- Este `docker-compose.yml` es para **desarrollo/pruebas locales**, no
  para producción. Para producción real, sigue `docs/DEPLOY_AWS.md`
  (Lambda + RDS + S3 + SNS) o adapta estas mismas imágenes Docker a un
  servicio como AWS ECS/Fargate o un VPS con Docker.
- El frontend se compila en tiempo de build con la URL del backend
  (`VITE_API_URL`) fija. Si cambias esa variable en `.env`, necesitas
  reconstruir la imagen del frontend (`docker compose up --build`).
