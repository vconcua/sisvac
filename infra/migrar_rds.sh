#!/bin/sh
# Ejecuta schema + seed + migraciones 002..016 contra una base PostgreSQL (RDS).
# Uso: PGPASSWORD=... sh infra/migrar_rds.sh <host-rds> <usuario> <base>   (desde la raiz del proyecto)
set -e
[ $# -eq 3 ] || { echo "Uso: PGPASSWORD=... sh infra/migrar_rds.sh host usuario base"; exit 1; }
export PGSSLMODE=require
for f in backend/database/schema.sql backend/database/seed.sql $(ls backend/database/migrations/*.sql | sort); do
  echo "== $f"
  psql -h "$1" -U "$2" -d "$3" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "Listo: base de datos preparada."
