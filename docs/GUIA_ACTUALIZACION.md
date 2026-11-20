# Guía de actualización — SISVAC versión 1.2

Esta guía sirve para llevar tu proyecto actual (el que ya corre en Docker en tu computadora) a la versión nueva **sin perder datos**. Hazla despacio, un paso a la vez. Los comandos se escriben en **CMD** o PowerShell, dentro de la carpeta del proyecto (la que contiene `docker-compose.yml`).

## Qué trae esta versión

1. **Avisos automáticos a padres**: cada día a las 7:00 el sistema escribe solo a los padres (alertas nuevas de su hijo y recordatorio de vacunas de la próxima semana). Sin duplicados.
2. **Padres ↔ niños visible**: la lista de niños muestra su padre/madre, la lista de padres muestra sus niños, y se pueden vincular al registrar.
3. **Rol Enfermería**: registra niños y padres nuevos, pero no puede editarlos ni borrarlos después.
4. **Alerta por abandono de seguimiento** (niños sin control de crecimiento).
5. **Cifrado de datos personales** de los padres (DPI, teléfono, correo, Telegram).
6. **Reportes** con descarga en Excel y PDF.
7. **Campañas** de mensajes masivos segmentados.
8. Rol **Consulta limitada** y aviso manual a un padre (si no los habías integrado antes, vienen incluidos).

---

## Paso 1 — Respaldo (no te lo saltes)

```
docker compose exec -T db pg_dump -U sisvac_user sisvac > respaldo_antes.sql
```

Debe crearse el archivo `respaldo_antes.sql` con un tamaño mayor a 0. Si algo sale mal, ahí están tus datos.

## Paso 2 — Copiar los archivos nuevos

1. Cierra todo con `docker compose down` (esto **no** borra tus datos).
2. Descomprime `SISVAC_v1.2_Actualizacion.zip`.
3. Copia **todo su contenido** dentro de tu carpeta del proyecto y, cuando Windows pregunte, elige **Reemplazar los archivos**.

Tu archivo `.env` no viene en el ZIP, así que se conserva.

## Paso 3 — Crear la llave de cifrado

Esta llave protege los datos personales. **Es obligatoria**: sin ella el sistema no arranca (a propósito).

1. Genera la llave:

```
docker compose run --rm --no-deps backend node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

(La primera vez tarda porque construye la imagen nueva.) Verás una línea de 64 letras y números. Cópiala.

2. Abre tu archivo `.env` con el Bloc de notas y agrega estas dos líneas (pega tu llave después del `=`):

```
ENCRYPTION_KEY=aquí_la_llave_de_64_caracteres
HASH_KEY=
```

3. **Guarda la llave también en otro lugar seguro** (correo a ti mismo, USB). Si se pierde, los datos cifrados no se pueden recuperar.

## Paso 4 — Encender el sistema

```
docker compose up -d --build
```

## Paso 5 — Actualizar la base de datos

Ejecuta estos cuatro comandos, **en este orden**, uno por uno. Cada uno debe mostrar líneas como `ALTER TABLE` o `CREATE INDEX` y ningún `ERROR`:

```
docker compose exec -T db psql -U sisvac_user -d sisvac < backend\database\migrations\007_rol_consulta_limitada.sql
docker compose exec -T db psql -U sisvac_user -d sisvac < backend\database\migrations\008_cifrado_datos_padres.sql
docker compose exec -T db psql -U sisvac_user -d sisvac < backend\database\migrations\010_campanias_envio.sql
docker compose exec -T db psql -U sisvac_user -d sisvac < backend\database\migrations\011_enfermeria_y_avisos.sql
```

## Paso 6 — Cifrar los datos que ya tenías

```
docker compose exec backend node scripts/cifrar_datos_existentes.js
```

Muestra cuántos padres se cifraron. Es seguro repetirlo.

Luego el último candado de la base de datos (la migración 009):

```
docker compose exec -T db psql -U sisvac_user -d sisvac < backend\database\migrations\009_dpi_hash_unico.sql
```

Si la 009 da error, significa que el paso anterior no terminó: vuelve a ejecutarlo y repite.

## Paso 7 — Probar

1. Abre http://localhost:5173 e inicia sesión como administrador.
2. **Usuarios → rol "Enfermería"**: crea una cuenta de prueba (contraseña de 8 caracteres o más).
3. Cierra sesión y entra con esa cuenta: debe ver solo **Niños** y **Padres de familia**, poder registrar nuevos, y no ver botones de editar, eliminar ni avisos.
4. Como administrador, entra a **Alertas → Enviar avisos a padres ahora** para ver el resumen del envío.

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| El backend se apaga solo al iniciar | Falta o está mal `ENCRYPTION_KEY` en `.env` (deben ser exactamente 64 caracteres). Revisa con `docker compose logs backend`. |
| No me deja iniciar sesión como padre | Corre otra vez el Paso 6. |
| Quiero volver atrás | `docker compose down`, borra el volumen de la base de datos y restaura con `respaldo_antes.sql`. Pídele ayuda a tu profesor/a o a mí antes de borrar nada. |

## Para producción (AWS)

Define `ENCRYPTION_KEY` (y `HASH_KEY`) como variables al hacer `serverless deploy`. Se programan tres tareas diarias (EventBridge): vacunas atrasadas 06:00, abandono de seguimiento 06:30 y avisos automáticos 07:00, hora de Guatemala.

## Instalación nueva (sin datos previos)

Con un volumen de Docker vacío, `docker compose up --build` carga solo el esquema y **todas** las migraciones en orden. Solo falta crear la llave del Paso 3 antes de arrancar.
