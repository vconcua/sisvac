@echo off
REM Ejecuta schema + seed + migraciones 002..016 contra una base PostgreSQL (RDS) usando Docker.
REM Uso:  infra\migrar_rds.bat <host-rds> <usuario> <base>      (pide la contrasena)
REM Ejecutelo desde la carpeta raiz del proyecto (donde esta docker-compose.yml).
if "%~3"=="" (
  echo Uso: infra\migrar_rds.bat host usuario base
  exit /b 1
)
set /p PGPASSWORD=Contrasena de la base de datos: 
set HOST=%1
set USR=%2
set DB=%3
for %%F in (backend\database\schema.sql backend\database\seed.sql backend\database\migrations\002_agregar_canal_sms.sql backend\database\migrations\003_agregar_telegram_chat_id.sql backend\database\migrations\004_catalogo_departamentos_municipios.sql backend\database\migrations\005_centros_salud.sql backend\database\migrations\006_ampliar_centros_salud.sql backend\database\migrations\007_rol_consulta_limitada.sql backend\database\migrations\008_cifrado_datos_padres.sql backend\database\migrations\009_dpi_hash_unico.sql backend\database\migrations\010_campanias_envio.sql backend\database\migrations\011_enfermeria_y_avisos.sql backend\database\migrations\012_comunidades_linguisticas.sql backend\database\migrations\013_linguisticas_por_departamento.sql backend\database\migrations\014_carnet_qr.sql backend\database\migrations\015_bloqueo_login_padres.sql backend\database\migrations\016_esquema_vacunacion.sql) do (
  echo == %%F
  docker run --rm -i -e PGPASSWORD=%PGPASSWORD% -e PGSSLMODE=require postgres:16-alpine psql -h %HOST% -U %USR% -d %DB% -v ON_ERROR_STOP=1 -q < %%F
  if errorlevel 1 (
    echo ERROR en %%F - se detiene aqui.
    exit /b 1
  )
)
echo Listo: base de datos preparada.
