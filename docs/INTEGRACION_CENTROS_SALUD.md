# Centros de salud — cómo cargar el directorio real

## Por qué esto no viene precargado (a diferencia de departamentos/municipios)

Verifiqué las fuentes oficiales antes de armar esto:

- El sitio de directorio del MSPAS (`establecimientosdesalud.mspas.gob.gt`)
  **el propio ministerio lo marca como "datos en proceso de integración"**
- El portal de datos abiertos del MSPAS (`datosabiertos.mspas.gob.gt`, que sí
  tiene API pública) **no incluye** un dataset de ubicación de establecimientos
  entre sus 20 conjuntos de datos — solo tiene nóminas, morbilidad, presupuesto, etc.
- No existe ninguna API pública estable para descargar el directorio completo automáticamente

Por eso, en vez de inventarte una lista (que sería peligroso para un sistema
de salud real), te dejo la tabla lista y una herramienta de importación —
tú descargas el CSV oficial desde tu navegador (con los filtros que
necesites) y el script lo carga a tu base de datos.

## Paso 1: Descarga el CSV oficial

1. Ve a **https://establecimientosdesalud.mspas.gob.gt** en tu navegador
2. Usa los filtros (Departamento, Municipio, Tipo de establecimiento) para
   acotar a lo que necesitas, o déjalos en "Todos" para el listado completo
3. Busca el botón de exportar (**Excel / CSV / PDF**) y descarga en **CSV**

## Paso 2: Ejecuta la migración de la tabla

```
backend/database/migrations/005_centros_salud.sql
```

Colócala junto a tus otras migraciones y ejecútala (igual que hiciste con
el catálogo de departamentos/municipios):

```bash
docker compose cp backend/database/migrations/005_centros_salud.sql db:/tmp/005.sql
docker compose exec db psql -U sisvac_user -d sisvac -f /tmp/005.sql
```

## Paso 3: Copia el script de importación

Coloca `backend/scripts/importar_centros_salud.js` dentro de tu carpeta
`SISVAC/backend/scripts/` (créala si no existe).

## Paso 4: Corre la importación

```bash
docker compose cp TU_ARCHIVO_DESCARGADO.csv backend:/app/establecimientos.csv
docker compose exec backend node scripts/importar_centros_salud.js /app/establecimientos.csv
```

El script:
- Detecta automáticamente si el CSV usa `,` o `;` como separador
- Reconoce nombres de columnas típicos (Nombre, Tipo, Departamento, Municipio,
  Dirección, Teléfono) sin importar acentos o mayúsculas
- Vincula cada fila automáticamente con tu catálogo de 22 departamentos y
  340 municipios
- Al terminar, imprime un resumen: cuántos se insertaron, y una lista de
  cualquier departamento/municipio del CSV que **no** haya podido reconocer
  (por ejemplo, si el CSV tiene un nombre distinto al oficial)

**Si el script marca "columna no encontrada"**, abre
`importar_centros_salud.js`, busca el objeto `MAPEO_COLUMNAS` cerca del
inicio, y agrega el nombre exacto de la columna tal como aparece en tu CSV
descargado (el script imprime el encabezado detectado al correr, para que
lo compares fácilmente).

## Verificar que cargó bien

```bash
docker compose exec db psql -U sisvac_user -d sisvac -c "SELECT COUNT(*) FROM centros_salud;"
docker compose exec db psql -U sisvac_user -d sisvac -c "SELECT nombre, tipo_establecimiento FROM centros_salud LIMIT 10;"
```

## Nota sobre mantenimiento

Este directorio va a quedar desactualizado con el tiempo (aperturas,
cierres, cambios de dirección) porque así es la fuente misma. Lo más
sano es repetir este proceso (descargar CSV actualizado + volver a
correr el script) cada cierto tiempo, en vez de tratarlo como un dato
que se carga una sola vez y para siempre.
