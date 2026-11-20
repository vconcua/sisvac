-- ============================================================
-- Sistema de Control de Crecimiento Infantil y Vacunación
-- Base de datos: PostgreSQL
-- Proyecto para centros de salud municipales - Guatemala
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE rol_usuario AS ENUM ('administrador', 'personal_salud', 'encargado_centro', 'padre');
CREATE TYPE sexo_ninio AS ENUM ('M', 'F');
CREATE TYPE canal_notificacion AS ENUM ('email', 'telegram', 'whatsapp', 'sms');
CREATE TYPE tipo_alerta AS ENUM ('preventiva', 'critica');
CREATE TYPE estado_alerta AS ENUM ('pendiente', 'enviada', 'atendida');
CREATE TYPE estado_vacunacion AS ENUM ('pendiente', 'aplicada', 'atrasada');
CREATE TYPE estado_notificacion AS ENUM ('pendiente', 'enviado', 'fallido');

-- ============================================================
-- CATÁLOGO GEOGRÁFICO: departamentos y municipios de Guatemala
-- (22 departamentos, 340 municipios — se cargan con la migración
-- 004_catalogo_departamentos_municipios.sql)
-- ============================================================
CREATE TABLE departamentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE municipios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    departamento_id INTEGER NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    UNIQUE (nombre, departamento_id)
);
CREATE INDEX idx_municipios_departamento ON municipios(departamento_id);

-- ============================================================
-- CENTROS DE SALUD (hospitales, centros, puestos de salud, CAP, CAIMI)
-- Tabla vacía por defecto — se llena con el script
-- backend/scripts/importar_centros_salud.js a partir del directorio
-- oficial del MSPAS, o manualmente desde el CRUD de la aplicación.
-- ============================================================
CREATE TABLE centros_salud (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo_establecimiento VARCHAR(50), -- Hospital, Centro de Salud, Puesto de Salud, CAP, CAIMI, Farmacia PROAM
    departamento_id INTEGER REFERENCES departamentos(id),
    municipio_id INTEGER REFERENCES municipios(id),
    direccion TEXT,
    telefono VARCHAR(30),
    latitud NUMERIC(9,6),
    longitud NUMERIC(9,6),
    fuente VARCHAR(150) DEFAULT 'Registro manual',
    actualizado_en TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_centros_salud_departamento ON centros_salud(departamento_id);
CREATE INDEX idx_centros_salud_municipio ON centros_salud(municipio_id);

-- ============================================================
-- USUARIOS (login del sistema: admin, personal de salud, encargado)
-- ============================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL,
    centro_salud VARCHAR(150),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- COMUNIDADES
-- ============================================================
CREATE TABLE comunidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    ubicacion VARCHAR(255),
    departamento VARCHAR(100), -- texto libre, se mantiene por compatibilidad
    municipio VARCHAR(100),    -- texto libre, se mantiene por compatibilidad
    departamento_id INTEGER REFERENCES departamentos(id),
    municipio_id INTEGER REFERENCES municipios(id),
    centro_salud_id INTEGER REFERENCES centros_salud(id),
    numero_estimado_familias INTEGER DEFAULT 0,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- PADRES / TUTORES
-- ============================================================
CREATE TABLE padres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(150) NOT NULL,
    dpi VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),        -- usado para whatsapp y sms
    correo VARCHAR(150),          -- usado para email
    telegram_chat_id VARCHAR(50), -- usado para telegram (independiente del teléfono)
    canal_preferido canal_notificacion NOT NULL DEFAULT 'email',
    password_hash VARCHAR(255), -- login del padre para ver carnet QR
    comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- NIÑOS
-- ============================================================
CREATE TABLE ninios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo sexo_ninio NOT NULL,
    comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
    qr_codigo UUID NOT NULL DEFAULT uuid_generate_v4(), -- identificador único para el carnet QR
    qr_pin VARCHAR(6), -- PIN de acceso al carnet
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE ninio_padre (
    ninio_id UUID REFERENCES ninios(id) ON DELETE CASCADE,
    padre_id UUID REFERENCES padres(id) ON DELETE CASCADE,
    parentesco VARCHAR(50) DEFAULT 'padre/madre',
    PRIMARY KEY (ninio_id, padre_id)
);

-- ============================================================
-- REGISTROS DE CRECIMIENTO (peso, talla)
-- ============================================================
CREATE TABLE registros_crecimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ninio_id UUID NOT NULL REFERENCES ninios(id) ON DELETE CASCADE,
    fecha_medicion DATE NOT NULL DEFAULT CURRENT_DATE,
    peso_kg NUMERIC(5,2) NOT NULL CHECK (peso_kg > 0),
    talla_cm NUMERIC(5,2) NOT NULL CHECK (talla_cm > 0),
    edad_meses_al_medir NUMERIC(6,2) NOT NULL, -- calculado, guardado para trazabilidad
    percentil_peso NUMERIC(5,2),
    percentil_talla NUMERIC(5,2),
    registrado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_registros_ninio ON registros_crecimiento(ninio_id, fecha_medicion);

-- ============================================================
-- CATÁLOGO DE VACUNAS
-- ============================================================
CREATE TABLE vacunas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    edad_recomendada_meses INTEGER NOT NULL,
    dosis_numero INTEGER NOT NULL DEFAULT 1,
    descripcion TEXT
);

-- ============================================================
-- VACUNACIÓN POR NIÑO
-- ============================================================
CREATE TABLE vacunaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ninio_id UUID NOT NULL REFERENCES ninios(id) ON DELETE CASCADE,
    vacuna_id UUID NOT NULL REFERENCES vacunas(id),
    fecha_aplicada DATE,
    fecha_proxima_dosis DATE,
    estado estado_vacunacion NOT NULL DEFAULT 'pendiente',
    aplicada_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_vacunaciones_ninio ON vacunaciones(ninio_id);

-- ============================================================
-- ALERTAS
-- ============================================================
CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ninio_id UUID NOT NULL REFERENCES ninios(id) ON DELETE CASCADE,
    tipo tipo_alerta NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    estado estado_alerta NOT NULL DEFAULT 'pendiente',
    creado_en TIMESTAMP NOT NULL DEFAULT now(),
    atendida_en TIMESTAMP
);

-- ============================================================
-- NOTIFICACIONES (envíos individuales o de campaña)
-- ============================================================
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    padre_id UUID REFERENCES padres(id) ON DELETE CASCADE,
    alerta_id UUID REFERENCES alertas(id) ON DELETE SET NULL,
    canal canal_notificacion NOT NULL,
    asunto VARCHAR(200),
    contenido TEXT NOT NULL,
    estado estado_notificacion NOT NULL DEFAULT 'pendiente',
    enviado_en TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- CAMPAÑAS (envíos masivos segmentados)
-- ============================================================
CREATE TABLE campanias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    comunidad_id UUID REFERENCES comunidades(id),
    edad_min_meses INTEGER,
    edad_max_meses INTEGER,
    estado_vacunacion_filtro estado_vacunacion,
    creado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================
-- VISTAS ÚTILES PARA REPORTES
-- ============================================================
CREATE VIEW vw_ultimo_registro_ninio AS
SELECT DISTINCT ON (ninio_id) *
FROM registros_crecimiento
ORDER BY ninio_id, fecha_medicion DESC;

CREATE VIEW vw_cobertura_vacunacion_comunidad AS
SELECT
    c.id AS comunidad_id,
    c.nombre AS comunidad,
    COUNT(v.id) FILTER (WHERE v.estado = 'aplicada') AS aplicadas,
    COUNT(v.id) AS total,
    ROUND(
        (COUNT(v.id) FILTER (WHERE v.estado = 'aplicada')::numeric
        / NULLIF(COUNT(v.id), 0)) * 100, 2
    ) AS porcentaje_cobertura
FROM comunidades c
JOIN ninios n ON n.comunidad_id = c.id
JOIN vacunaciones v ON v.ninio_id = n.id
GROUP BY c.id, c.nombre;
