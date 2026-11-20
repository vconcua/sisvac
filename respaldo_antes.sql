--
-- PostgreSQL database dump
--

\restrict Sd83ZsfRswdwkClcJJcf1sfxaosRE4yvuZRegCIDLKGvoeDxaXzaXtnjhxF580V

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: canal_notificacion; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.canal_notificacion AS ENUM (
    'email',
    'telegram',
    'whatsapp',
    'sms'
);


ALTER TYPE public.canal_notificacion OWNER TO sisvac_user;

--
-- Name: estado_alerta; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.estado_alerta AS ENUM (
    'pendiente',
    'enviada',
    'atendida'
);


ALTER TYPE public.estado_alerta OWNER TO sisvac_user;

--
-- Name: estado_notificacion; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.estado_notificacion AS ENUM (
    'pendiente',
    'enviado',
    'fallido'
);


ALTER TYPE public.estado_notificacion OWNER TO sisvac_user;

--
-- Name: estado_vacunacion; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.estado_vacunacion AS ENUM (
    'pendiente',
    'aplicada',
    'atrasada'
);


ALTER TYPE public.estado_vacunacion OWNER TO sisvac_user;

--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.rol_usuario AS ENUM (
    'administrador',
    'personal_salud',
    'encargado_centro',
    'padre'
);


ALTER TYPE public.rol_usuario OWNER TO sisvac_user;

--
-- Name: sexo_ninio; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.sexo_ninio AS ENUM (
    'M',
    'F'
);


ALTER TYPE public.sexo_ninio OWNER TO sisvac_user;

--
-- Name: tipo_alerta; Type: TYPE; Schema: public; Owner: sisvac_user
--

CREATE TYPE public.tipo_alerta AS ENUM (
    'preventiva',
    'critica'
);


ALTER TYPE public.tipo_alerta OWNER TO sisvac_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alertas; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.alertas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ninio_id uuid NOT NULL,
    tipo public.tipo_alerta NOT NULL,
    motivo character varying(255) NOT NULL,
    mensaje text NOT NULL,
    estado public.estado_alerta DEFAULT 'pendiente'::public.estado_alerta NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    atendida_en timestamp without time zone
);


ALTER TABLE public.alertas OWNER TO sisvac_user;

--
-- Name: campanias; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.campanias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    titulo character varying(200) NOT NULL,
    mensaje text NOT NULL,
    comunidad_id uuid,
    edad_min_meses integer,
    edad_max_meses integer,
    estado_vacunacion_filtro public.estado_vacunacion,
    creado_por uuid,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campanias OWNER TO sisvac_user;

--
-- Name: centros_salud; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.centros_salud (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo_establecimiento character varying(50),
    departamento_id integer,
    municipio_id integer,
    direccion text,
    telefono character varying(30),
    latitud numeric(9,6),
    longitud numeric(9,6),
    fuente character varying(150) DEFAULT 'Registro manual'::character varying,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    detalle_tipo character varying(100),
    comunidad_sector character varying(150),
    nivel_atencion character varying(50),
    servicios_principales text
);


ALTER TABLE public.centros_salud OWNER TO sisvac_user;

--
-- Name: centros_salud_id_seq; Type: SEQUENCE; Schema: public; Owner: sisvac_user
--

CREATE SEQUENCE public.centros_salud_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.centros_salud_id_seq OWNER TO sisvac_user;

--
-- Name: centros_salud_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sisvac_user
--

ALTER SEQUENCE public.centros_salud_id_seq OWNED BY public.centros_salud.id;


--
-- Name: comunidades; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.comunidades (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(150) NOT NULL,
    ubicacion character varying(255),
    departamento character varying(100),
    municipio character varying(100),
    departamento_id integer,
    municipio_id integer,
    centro_salud_id integer,
    numero_estimado_familias integer DEFAULT 0,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comunidades OWNER TO sisvac_user;

--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.departamentos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL
);


ALTER TABLE public.departamentos OWNER TO sisvac_user;

--
-- Name: departamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: sisvac_user
--

CREATE SEQUENCE public.departamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departamentos_id_seq OWNER TO sisvac_user;

--
-- Name: departamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sisvac_user
--

ALTER SEQUENCE public.departamentos_id_seq OWNED BY public.departamentos.id;


--
-- Name: municipios; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.municipios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    departamento_id integer NOT NULL
);


ALTER TABLE public.municipios OWNER TO sisvac_user;

--
-- Name: municipios_id_seq; Type: SEQUENCE; Schema: public; Owner: sisvac_user
--

CREATE SEQUENCE public.municipios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.municipios_id_seq OWNER TO sisvac_user;

--
-- Name: municipios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sisvac_user
--

ALTER SEQUENCE public.municipios_id_seq OWNED BY public.municipios.id;


--
-- Name: ninio_padre; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.ninio_padre (
    ninio_id uuid NOT NULL,
    padre_id uuid NOT NULL,
    parentesco character varying(50) DEFAULT 'padre/madre'::character varying
);


ALTER TABLE public.ninio_padre OWNER TO sisvac_user;

--
-- Name: ninios; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.ninios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    fecha_nacimiento date NOT NULL,
    sexo public.sexo_ninio NOT NULL,
    comunidad_id uuid,
    qr_codigo uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    qr_pin character varying(6),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ninios OWNER TO sisvac_user;

--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.notificaciones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    padre_id uuid,
    alerta_id uuid,
    canal public.canal_notificacion NOT NULL,
    asunto character varying(200),
    contenido text NOT NULL,
    estado public.estado_notificacion DEFAULT 'pendiente'::public.estado_notificacion NOT NULL,
    enviado_en timestamp without time zone,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notificaciones OWNER TO sisvac_user;

--
-- Name: padres; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.padres (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    dpi character varying(20) NOT NULL,
    telefono character varying(20),
    correo character varying(150),
    telegram_chat_id character varying(50),
    canal_preferido public.canal_notificacion DEFAULT 'email'::public.canal_notificacion NOT NULL,
    password_hash character varying(255),
    comunidad_id uuid,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.padres OWNER TO sisvac_user;

--
-- Name: registros_crecimiento; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.registros_crecimiento (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ninio_id uuid NOT NULL,
    fecha_medicion date DEFAULT CURRENT_DATE NOT NULL,
    peso_kg numeric(5,2) NOT NULL,
    talla_cm numeric(5,2) NOT NULL,
    edad_meses_al_medir numeric(6,2) NOT NULL,
    percentil_peso numeric(5,2),
    percentil_talla numeric(5,2),
    registrado_por uuid,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT registros_crecimiento_peso_kg_check CHECK ((peso_kg > (0)::numeric)),
    CONSTRAINT registros_crecimiento_talla_cm_check CHECK ((talla_cm > (0)::numeric))
);


ALTER TABLE public.registros_crecimiento OWNER TO sisvac_user;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    correo character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol public.rol_usuario NOT NULL,
    centro_salud character varying(150),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usuarios OWNER TO sisvac_user;

--
-- Name: vacunaciones; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.vacunaciones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ninio_id uuid NOT NULL,
    vacuna_id uuid NOT NULL,
    fecha_aplicada date,
    fecha_proxima_dosis date,
    estado public.estado_vacunacion DEFAULT 'pendiente'::public.estado_vacunacion NOT NULL,
    aplicada_por uuid,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vacunaciones OWNER TO sisvac_user;

--
-- Name: vacunas; Type: TABLE; Schema: public; Owner: sisvac_user
--

CREATE TABLE public.vacunas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(150) NOT NULL,
    edad_recomendada_meses integer NOT NULL,
    dosis_numero integer DEFAULT 1 NOT NULL,
    descripcion text
);


ALTER TABLE public.vacunas OWNER TO sisvac_user;

--
-- Name: vw_cobertura_vacunacion_comunidad; Type: VIEW; Schema: public; Owner: sisvac_user
--

CREATE VIEW public.vw_cobertura_vacunacion_comunidad AS
 SELECT c.id AS comunidad_id,
    c.nombre AS comunidad,
    count(v.id) FILTER (WHERE (v.estado = 'aplicada'::public.estado_vacunacion)) AS aplicadas,
    count(v.id) AS total,
    round((((count(v.id) FILTER (WHERE (v.estado = 'aplicada'::public.estado_vacunacion)))::numeric / (NULLIF(count(v.id), 0))::numeric) * (100)::numeric), 2) AS porcentaje_cobertura
   FROM ((public.comunidades c
     JOIN public.ninios n ON ((n.comunidad_id = c.id)))
     JOIN public.vacunaciones v ON ((v.ninio_id = n.id)))
  GROUP BY c.id, c.nombre;


ALTER VIEW public.vw_cobertura_vacunacion_comunidad OWNER TO sisvac_user;

--
-- Name: vw_ultimo_registro_ninio; Type: VIEW; Schema: public; Owner: sisvac_user
--

CREATE VIEW public.vw_ultimo_registro_ninio AS
 SELECT DISTINCT ON (ninio_id) id,
    ninio_id,
    fecha_medicion,
    peso_kg,
    talla_cm,
    edad_meses_al_medir,
    percentil_peso,
    percentil_talla,
    registrado_por,
    creado_en
   FROM public.registros_crecimiento
  ORDER BY ninio_id, fecha_medicion DESC;


ALTER VIEW public.vw_ultimo_registro_ninio OWNER TO sisvac_user;

--
-- Name: centros_salud id; Type: DEFAULT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.centros_salud ALTER COLUMN id SET DEFAULT nextval('public.centros_salud_id_seq'::regclass);


--
-- Name: departamentos id; Type: DEFAULT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.departamentos ALTER COLUMN id SET DEFAULT nextval('public.departamentos_id_seq'::regclass);


--
-- Name: municipios id; Type: DEFAULT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.municipios ALTER COLUMN id SET DEFAULT nextval('public.municipios_id_seq'::regclass);


--
-- Data for Name: alertas; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.alertas (id, ninio_id, tipo, motivo, mensaje, estado, creado_en, atendida_en) FROM stdin;
\.


--
-- Data for Name: campanias; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.campanias (id, titulo, mensaje, comunidad_id, edad_min_meses, edad_max_meses, estado_vacunacion_filtro, creado_por, creado_en) FROM stdin;
\.


--
-- Data for Name: centros_salud; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.centros_salud (id, nombre, tipo_establecimiento, departamento_id, municipio_id, direccion, telefono, latitud, longitud, fuente, actualizado_en, detalle_tipo, comunidad_sector, nivel_atencion, servicios_principales) FROM stdin;
1	Centro de Salud de Cobán	Centro de Salud	1	3	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.30099	Centro de Salud Tipo A	Zona 1, Cabecera Municipal	Segundo Nivel	Consulta externa, vacunación, consulta prenatal, farmacia
2	Centro de Salud Carchá	Centro de Salud	1	11	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.329335	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Atención médica integral, odontología, salud reproductiva
3	CAP Chisec	CAP	1	2	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.334732	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica 24/7, partos de bajo riesgo, urgencias
4	Puesto de Salud Actelá	Puesto de Salud	1	14	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.341988	Puesto de Salud	Aldea Actelá	Primer Nivel	Vacunación, control de peso/talla, suplementación y consulta básica
5	Centro de Salud Salamá	Centro de Salud	2	22	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.347751	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta general, programas de nutrición, saneamiento ambiental
6	CAP Rabinal	CAP	2	21	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.353996	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24 horas, atención de urgencias, laboratorio básico
7	Puesto de Salud Mochilena	Puesto de Salud	2	20	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.361719	Puesto de Salud	Aldea Mochilena	Primer Nivel	Atención primaria, control de crecimiento y desarrollo, vacunas
8	Centro de Salud Chimaltenango	Centro de Salud	3	27	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.369087	Centro de Salud Tipo B	Zona 2, Cabecera Municipal	Segundo Nivel	Consulta médica, vacunación, enfermería, control prenatal
9	CAP San Martín Jilotepeque	CAP	3	36	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.375526	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica 24/7, partos, urgencias primarias
185	Puesto de Salud San Martín	Puesto de Salud	13	187	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 19:40:52.73907	Puesto de Salud	Aldea Las Majadas	Primer Nivel	Monitoreo del niño sano, vacunas, consulta básica
11	Centro de Salud Chiquimula	Centro de Salud	4	43	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.388791	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, pediatría, nutrición, prevención epidemiológica
12	CAP Esquipulas	CAP	4	45	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.396538	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Urgencias 24h, maternidad, consulta médica general
13	Puesto de Salud Ologá	Puesto de Salud	4	47	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.402455	Puesto de Salud	Aldea Ologá	Primer Nivel	Control nutricional, suplementación, atención primaria comunitaria
14	Centro de Salud San Jacinto	Centro de Salud	4	50	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.408477	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, saneamiento ambiental, programas nutricionales
15	CAP San Juan Ermita	CAP	4	52	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.415958	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica de urgencia 24h, maternidad, laboratorio
16	Centro de Salud Guastatoya	Centro de Salud	5	54	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.421601	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta médica, vacunación, control del niño sano
17	CAP Sanarate	CAP	5	59	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.427872	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención de emergencias 24h, parto limpio, laboratorio
18	Puesto de Salud Passasagua	Puesto de Salud	5	53	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.433492	Puesto de Salud	Aldea Passasagua	Primer Nivel	Vacunación, enfermería básica, promoción de la salud
19	Centro de Salud San Antonio	Centro de Salud	5	57	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.440363	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Atención primaria, control prenatal, farmacia
20	Centro de Salud Escuintla	Centro de Salud	6	61	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.447395	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta general, prevención de TB, odontología, nutrición
22	Puesto de Salud Las Playas	Puesto de Salud	6	71	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.459922	Puesto de Salud	Aldea Las Playas	Primer Nivel	Consulta de enfermería, esquemas de vacunación, atención primaria
23	CAP Masagua	CAP	6	66	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.466126	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24/7, emergencias, programas de prevención
24	CAP Guanagazapa	CAP	6	62	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.471567	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Consulta 24 horas, atención de parto, laboratorio básico
30	CAP El Mezquital	CAP	7	91	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.5151	CAP (Atención Permanente)	Aldea El Mezquital	Segundo Nivel (24h)	Consulta 24 horas, maternidad, emergencias locales
31	Centro de Salud Ciudad Real	Centro de Salud	7	91	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.521338	Centro de Salud Tipo B	Ciudad Real	Segundo Nivel	Consulta externa, vacunación, laboratorio básico
32	Centro de Salud Ciudad Peronia	Centro de Salud	7	91	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.527689	Centro de Salud Tipo B	Ciudad Peronia	Segundo Nivel	Atención primaria, nutrición, enfermería
10	Puesto de Salud Paquip	Puesto de Salud	3	39	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.38248	Puesto de Salud	Aldea Paquip	Primer Nivel	Consulta básica, entrega de micronutrientes, vacunación
33	Centro de Salud Boca del Monte	Centro de Salud	7	90	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.534226	Centro de Salud Tipo B	Boca del Monte	Segundo Nivel	Consulta general, control prenatal, saneamiento ambiental
34	Centro de Salud El Milagro	Centro de Salud	7	80	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.541828	Centro de Salud Tipo B	Colonia El Milagro	Segundo Nivel	Atención primaria, vacunación, enfermería comunitaria
35	Centro de Salud Ciudad Satélite	Centro de Salud	7	80	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.548283	Centro de Salud Tipo B	Ciudad Satélite	Segundo Nivel	Atención primaria, vacunación, programas comunitarios
36	CAP La Comunidad	CAP	7	80	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.554512	CAP (Atención Permanente)	La Comunidad	Segundo Nivel (24h)	Atención de urgencias 24 horas, partos de bajo riesgo, consulta
37	Centro de Salud Huehuetenango	Centro de Salud	8	97	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.560511	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta médica general, laboratorio, clínica de la mujer
39	CAP San Pedro Necta	CAP	8	111	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.573614	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24 horas, emergencias básicas, consulta
40	Puesto de Salud San Martín	Puesto de Salud	8	123	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.579896	Puesto de Salud	Aldea San Martín	Primer Nivel	Monitoreo nutricional, vacunas, visita domiciliaria
41	Centro de Salud Puerto Barrios	Centro de Salud	9	129	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.587029	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, saneamiento ambiental, vacunación, epidemiología
42	CAP Morales	CAP	9	128	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.592942	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica 24/7, partos, emergencias primarias
43	Puesto de Salud El Anonal	Puesto de Salud	9	125	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.59927	Puesto de Salud	Aldea El Anonal	Primer Nivel	Atención primaria por auxiliar de enfermería, esquema de vacunas
44	Centro de Salud Jalapa	Centro de Salud	10	130	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.604862	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta general, odontología, nutrición, control prenatal
45	CAP Mataquescuintla	CAP	10	131	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.611326	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención de urgencias, sala de partos, consulta médica
46	Puesto de Salud Achiotes	Puesto de Salud	10	132	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.617706	Puesto de Salud	Aldea Achiotes	Primer Nivel	Vacunación, control prenatal básico, entrega de micronutrientes
47	Centro de Salud Jutiapa	Centro de Salud	11	146	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.623904	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, laboratorio básico, atención a la mujer
48	CAP Asunción Mita	CAP	11	138	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.630332	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24/7, emergencias, consulta general
49	Puesto de Salud Ciudad Pedro de Alvarado	Puesto de Salud	11	147	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.636771	Puesto de Salud	Aldea C. Pedro de Alvarado	Primer Nivel	Atención primaria, vacunas, enfermería comunitaria
51	CAP Poptún	CAP	12	160	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.649321	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica 24h, parto limpio, urgencias
52	CAIMI La Libertad	CAIMI	12	157	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.657454	CAIMI (Materno Infantil)	Cabecera Municipal	Segundo Nivel Aumentado	Atención materno-infantil integral, estabilización y parto 24h
53	Puesto de Salud El Arbolito	Puesto de Salud	12	167	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.663703	Puesto de Salud	Aldea El Arbolito	Primer Nivel	Vacunación, consulta básica, suplementación a menores
54	Centro de Salud Xela	Centro de Salud	13	182	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.669931	Centro de Salud Tipo A	Zona 3, Cabecera Municipal	Segundo Nivel	Consulta médica integral, especialidades básicas, laboratorio
55	CAP Coatepeque	CAP	13	172	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.676251	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención de urgencias 24h, área de maternidad, partos
57	Centro de Salud Olintepeque	Centro de Salud	13	180	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.687704	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta externa, vacunación, saneamiento, odontología
58	Centro de Salud Salcajá	Centro de Salud	13	183	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.693553	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta general, control de diabetes/hipertensión, enfermería
59	Centro de Salud Santa Cruz	Centro de Salud	14	210	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.699579	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta médica, nutrición, laboratorio, programa maternal
60	CAIMI Ixcán	CAIMI	14	199	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.7052	CAIMI (Materno Infantil)	Playa Grande — Cabecera Municipal	Segundo Nivel Aumentado	Maternidad 24/7, cirugías menores, atención de urgencias
61	CAP Nebaj	CAP	14	201	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.71183	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Consulta 24 horas, maternidad, emergencias primarias
63	Centro de Salud Retalhuleu	Centro de Salud	15	216	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.724606	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta general, vacunación, saneamiento ambiental
64	CAP Champerico	CAP	15	213	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.730908	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Urgencias 24/7, partos de bajo riesgo, consulta médica
65	Puesto de Salud Nil	Puesto de Salud	15	214	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.736606	Puesto de Salud	Aldea Nil	Primer Nivel	Atención primaria, suplementación nutricional, vacunas
70	CAIMI Ixchiguán	CAIMI	17	245	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:48:49.642161	CAIMI (Materno Infantil)	Cabecera Municipal	Segundo Nivel Aumentado	Cirugía menor, maternidad 24/7, hospitalización básica
67	CAP Sumpango	CAP	16	237	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.750919	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención de partos 24 horas, emergencias, consulta
68	Puesto de Salud San Lorenzo	Puesto de Salud	16	223	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.756637	Puesto de Salud	Aldea San Lorenzo El Cubo	Primer Nivel	Enfermería básica, vacunación, control de crecimiento
69	Centro de Salud San Marcos	Centro de Salud	17	258	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.76312	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, prevención de enfermedades, clínica maternal
71	CAP Malacatán	CAP	17	248	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.775795	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención 24h de emergencias y partos, consulta general
72	Puesto de Salud Tuichán	Puesto de Salud	17	266	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.781963	Puesto de Salud	Aldea Tuichán	Primer Nivel	Visita comunitaria, vacunación, entrega de vitaminas
73	Puesto de Salud Comunitario	Puesto de Salud	17	262	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.788971	Puesto de Salud	Caseríos Rurales	Primer Nivel	Vacunación, control nutricional, atención primaria por auxiliar
74	Centro de Salud Cuilapa	Centro de Salud	18	271	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.79526	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta general, laboratorio básico, atención prenatal
75	CAP Chiquimulilla	CAP	18	270	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.801682	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24 horas, urgencias, consulta médica
76	Puesto de Salud El Cerinal	Puesto de Salud	18	268	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.807788	Puesto de Salud	Aldea El Cerinal	Primer Nivel	Atención primaria, control de vacunación, suplementación
77	CAP Taxisco	CAP	18	281	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.814111	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica continua, partos de bajo riesgo, consulta
78	Centro de Salud Guazacapán	Centro de Salud	18	272	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.82008	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta médica general, programas de inmunización
79	CAP Sololá	CAP	19	300	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.825641	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención de emergencias 24h, maternidad, consulta externa
80	CAP Santiago Atitlán	CAP	19	299	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.831874	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24/7, partos, emergencias primarias, laboratorio
81	CAP Guineales	CAP	19	293	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.838278	CAP (Atención Permanente)	Aldea Guineales	Segundo Nivel (24h)	Atención de partos, urgencias comunitarias, consulta
82	Puesto de Salud Patanatic	Puesto de Salud	19	284	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.843745	Puesto de Salud	Aldea Patanatic	Primer Nivel	Vacunación, control de crecimiento, atención por auxiliar
83	Centro de Salud Mazatenango	Centro de Salud	20	303	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.84878	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, sanidad ambiental, clínica de la mujer
84	CAP Cuyotenango	CAP	20	302	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.854316	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención 24/7, partos de bajo riesgo, emergencias
85	Puesto de Salud Nahualate	Puesto de Salud	20	301	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.860806	Puesto de Salud	Aldea Nahualate	Primer Nivel	Atención primaria de salud, programas de vacunación
86	Centro de Salud Totonicapán	Centro de Salud	21	329	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.86741	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta externa, pediatría, nutrición, prevención epidemiológica
87	CAP Momostenango	CAP	21	322	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.875086	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Maternidad 24/7, emergencias básicas, consulta general
88	Puesto de Salud Ranquería	Puesto de Salud	21	326	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.880479	Puesto de Salud	Aldea Chirrenox / Ranquería	Primer Nivel	Monitoreo del niño sano, vacunas, consulta básica
89	Centro de Salud Zacapa	Centro de Salud	22	340	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.886659	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta médica integral, laboratorio, prevención de dengue/chagas
90	CAP Gualán	CAP	22	332	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.89345	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Atención médica 24h, maternidad, emergencias
91	Puesto de Salud El Sitio	Puesto de Salud	22	330	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.900617	Puesto de Salud	Aldea El Sitio	Primer Nivel	Consulta básica, control nutricional, esquema de vacunas
92	Centro de Salud Usumatlán	Centro de Salud	22	339	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.906813	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta médica general, control del niño sano
21	CAP Puerto San José	CAP	6	69	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.45388	CAP (Atención Permanente)	Cabecera Municipal	Segundo Nivel (24h)	Urgencias 24h, atención materno-infantil, parto de bajo riesgo
25	Centro de Salud Zona 1	Centro de Salud	7	78	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.47784	Centro de Salud Tipo B	Zona 1 — Centro Histórico	Segundo Nivel	Consulta médica general, vacunación, control prenatal
26	Centro de Salud Jocotales	Centro de Salud	7	78	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.483683	Centro de Salud Tipo B	Zona 6 — Jocotales / Proyectos	Segundo Nivel	Consulta externa, pediatría, vacunación, odontología
27	Maternidad Cantonal Santa Elena	Centro de Salud	7	78	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.492052	Centro de Salud / Maternidad	Zona 18 — Colonia Santa Elena	Segundo Nivel	Atención materno-infantil, obstetricia, partos, planificación familiar
28	Centro de Salud Justo Rufino Barrios	Centro de Salud	7	78	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.501941	Centro de Salud Tipo B	Zona 21 — Colonia Justo Rufino Barrios	Segundo Nivel	Atención primaria, control de crecimiento, farmacia básica
29	CAP Canalitos	CAP	7	78	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.508824	CAP (Atención Permanente)	Zona 24 — Aldea Canalitos	Segundo Nivel (24h)	Atención médica 24/7, partos, urgencias primarias
38	CAIMI Santa Cruz Barillas	CAIMI	8	119	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.567442	CAIMI (Materno Infantil)	Cabecera Municipal	Segundo Nivel Aumentado	Atención obstétrica 24/7, cirugías menores, laboratorio
50	Centro de Salud San Benito	Centro de Salud	12	162	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.643326	Centro de Salud Tipo A	Cabecera Municipal	Segundo Nivel	Consulta médica general, vacunación, control epidemiológico
62	Puesto de Salud Camanchaj	Puesto de Salud	14	196	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.718069	Puesto de Salud	Aldea Camanchaj	Primer Nivel	Vacunación, control prenatal por auxiliar, orientación en salud
66	Centro de Salud Antigua	Centro de Salud	16	225	\N	\N	\N	\N	Listado propio del estudiante	2026-10-04 05:12:11.742505	Centro de Salud Tipo B	Cabecera Municipal	Segundo Nivel	Consulta general, odontología, control prenatal, vacunas
\.


--
-- Data for Name: comunidades; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.comunidades (id, nombre, ubicacion, departamento, municipio, departamento_id, municipio_id, centro_salud_id, numero_estimado_familias, creado_en) FROM stdin;
\.


--
-- Data for Name: departamentos; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.departamentos (id, nombre) FROM stdin;
1	Alta Verapaz
2	Baja Verapaz
3	Chimaltenango
4	Chiquimula
5	El Progreso
6	Escuintla
7	Guatemala
8	Huehuetenango
9	Izabal
10	Jalapa
11	Jutiapa
12	Petén
13	Quetzaltenango
14	Quiché
15	Retalhuleu
16	Sacatepéquez
17	San Marcos
18	Santa Rosa
19	Sololá
20	Suchitepéquez
21	Totonicapán
22	Zacapa
\.


--
-- Data for Name: municipios; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.municipios (id, nombre, departamento_id) FROM stdin;
1	Chahal	1
2	Chisec	1
3	Cobán	1
4	Fray Bartolomé de las Casas	1
5	Santa Catalina La Tinta	1
6	Lanquín	1
7	Panzós	1
8	Raxruhá	1
9	San Cristóbal Verapaz	1
10	San Juan Chamelco	1
11	San Pedro Carchá	1
12	Santa Cruz Verapaz	1
13	Santa María Cahabón	1
14	Senahú	1
15	Tamahú	1
16	Tactic	1
17	Tucurú	1
18	Cubulco	2
19	Granados	2
20	Purulhá	2
21	Rabinal	2
22	Salamá	2
23	San Jerónimo	2
24	San Miguel Chicaj	2
25	Santa Cruz el Chol	2
26	Acatenango	3
27	Chimaltenango	3
28	El Tejar	3
29	Parramos	3
30	Patzicía	3
31	Patzún	3
32	Pochuta	3
33	San Andrés Itzapa	3
34	San José Poaquíl	3
35	San Juan Comalapa	3
36	San Martín Jilotepeque	3
37	Santa Apolonia	3
38	Santa Cruz Balanyá	3
39	Tecpán	3
40	Yepocapa	3
41	Zaragoza	3
42	Camotán	4
43	Chiquimula	4
44	Concepción Las Minas	4
45	Esquipulas	4
46	Ipala	4
47	Jocotán	4
48	Olopa	4
49	Quetzaltepeque	4
50	San Jacinto	4
51	San José la Arada	4
52	San Juan Ermita	4
53	El Jícaro	5
54	Guastatoya	5
55	Morazán	5
56	San Agustín Acasaguastlán	5
57	San Antonio La Paz	5
58	San Cristóbal Acasaguastlán	5
59	Sanarate	5
60	Sansare	5
61	Escuintla	6
62	Guanagazapa	6
63	Iztapa	6
64	La Democracia	6
65	La Gomera	6
66	Masagua	6
67	Nueva Concepción	6
68	Palín	6
69	San José	6
70	San Vicente Pacaya	6
71	Santa Lucía Cotzumalguapa	6
72	Sipacate	6
73	Siquinalá	6
74	Tiquisate	6
75	Amatitlán	7
76	Chinautla	7
77	Chuarrancho	7
78	Ciudad de Guatemala	7
79	Fraijanes	7
80	Mixco	7
81	Palencia	7
82	San José del Golfo	7
83	San José Pinula	7
84	San Juan Sacatepéquez	7
85	San Miguel Petapa	7
86	San Pedro Ayampuc	7
87	San Pedro Sacatepéquez	7
88	San Raymundo	7
89	Santa Catarina Pinula	7
90	Villa Canales	7
91	Villa Nueva	7
92	Aguacatán	8
93	Chiantla	8
94	Colotenango	8
95	Concepción Huista	8
96	Cuilco	8
97	Huehuetenango	8
98	Jacaltenango	8
99	La Democracia	8
100	La Libertad	8
101	Malacatancito	8
102	Nentón	8
103	Petatán	8
104	San Antonio Huista	8
105	San Gaspar Ixchil	8
106	San Ildefonso Ixtahuacán	8
107	San Juan Atitán	8
108	San Juan Ixcoy	8
109	San Mateo Ixtatán	8
110	San Miguel Acatán	8
111	San Pedro Nécta	8
112	San Pedro Soloma	8
113	San Rafael La Independencia	8
114	San Rafael Pétzal	8
115	San Sebastián Coatán	8
116	San Sebastián Huehuetenango	8
117	Santa Ana Huista	8
118	Santa Bárbara	8
119	Santa Cruz Barillas	8
120	Santa Eulalia	8
121	Santiago Chimaltenango	8
122	Tectitán	8
123	Todos Santos Cuchumatán	8
124	Unión Cantinil	8
125	El Estor	9
126	Livingston	9
127	Los Amates	9
128	Morales	9
129	Puerto Barrios	9
130	Jalapa	10
131	Mataquescuintla	10
132	Monjas	10
133	San Carlos Alzatate	10
134	San Luis Jilotepeque	10
135	San Manuel Chaparrón	10
136	San Pedro Pinula	10
137	Agua Blanca	11
138	Asunción Mita	11
139	Atescatempa	11
140	Comapa	11
141	Conguaco	11
142	El Adelanto	11
143	El Progreso	11
144	Jalpatagua	11
145	Jerez	11
146	Jutiapa	11
147	Moyuta	11
148	Pasaco	11
149	Quesada	11
150	San José Acatempa	11
151	Santa Catarina Mita	11
152	Yupiltepeque	11
153	Zapotitlán	11
154	Dolores	12
155	El Chal	12
156	Flores	12
157	La Libertad	12
158	Las Cruces	12
159	Melchor de Mencos	12
160	Poptún	12
161	San Andrés	12
162	San Benito	12
163	San Francisco	12
164	San José	12
165	San Luis	12
166	Santa Ana	12
167	Sayaxché	12
168	Almolonga	13
169	Cabricán	13
170	Cajolá	13
171	Cantel	13
172	Coatepeque	13
173	Colomba	13
174	Concepción Chiquirichapa	13
175	El Palmar	13
176	Flores Costa Cuca	13
177	Génova	13
178	Huitán	13
179	La Esperanza	13
180	Olintepeque	13
181	Palestina de Los Altos	13
182	Quetzaltenango	13
183	Salcajá	13
184	San Carlos Sija	13
185	San Francisco La Unión	13
186	San Juan Ostuncalco	13
187	San Martín Sacatepéquez	13
188	San Mateo	13
189	San Miguel Sigüilá	13
190	Sibilia	13
191	Zunil	13
192	Canillá	14
193	Chajul	14
194	Chicamán	14
195	Chiché	14
196	Santo Tomás Chichicastenango	14
197	Chinique	14
198	Cunén	14
199	Ixcán	14
200	Joyabaj	14
201	Nebaj	14
202	Pachalum	14
203	Patzité	14
204	Sacapulas	14
205	San Andrés Sajcabajá	14
206	San Antonio Ilotenango	14
207	San Bartolomé Jocotenango	14
208	San Juan Cotzal	14
209	San Pedro Jocopilas	14
210	Santa Cruz del Quiché	14
211	Uspantán	14
212	Zacualpa	14
213	Champerico	15
214	El Asintal	15
215	Nuevo San Carlos	15
216	Retalhuleu	15
217	San Andrés Villa Seca	15
218	San Felipe	15
219	San Martín Zapotitlán	15
220	San Sebastián	15
221	Santa Cruz Muluá	15
222	Alotenango	16
223	Ciudad Vieja	16
224	Jocotenango	16
225	La Antigua Guatemala	16
226	Magdalena Milpas Altas	16
227	Pastores	16
228	San Antonio Aguas Calientes	16
229	San Bartolomé Milpas Altas	16
230	San Lucas Sacatepéquez	16
231	San Miguel Dueñas	16
232	Santa Catarina Barahona	16
233	Santa Lucía Milpas Altas	16
234	Santa María de Jesús	16
235	Santiago Sacatepéquez	16
236	Santo Domingo Xenacoj	16
237	Sumpango	16
238	Ayutla	17
239	Catarina	17
240	Comitancillo	17
241	Concepción Tutuapa	17
242	El Quetzal	17
243	El Tumbador	17
244	Esquipulas Palo Gordo	17
245	Ixchiguán	17
246	La Blanca	17
247	La Reforma	17
248	Malacatán	17
249	Nuevo Progreso	17
250	Ocós	17
251	Pajapita	17
252	Río Blanco	17
253	San Antonio Sacatepéquez	17
254	San Cristóbal Cucho	17
255	San José El Rodeo	17
256	San José Ojetenam	17
257	San Lorenzo	17
258	San Marcos	17
259	San Miguel Ixtahuacán	17
260	San Pablo	17
261	San Pedro Sacatepéquez	17
262	San Rafael Pie de la Cuesta	17
263	Sibinal	17
264	Sipacapa	17
265	Tacaná	17
266	Tajumulco	17
267	Tejutla	17
268	Barberena	18
269	Casillas	18
270	Chiquimulilla	18
271	Cuilapa	18
272	Guazacapán	18
273	Nueva Santa Rosa	18
274	Oratorio	18
275	Pueblo Nuevo Viñas	18
276	San Juan Tecuaco	18
277	San Rafael las Flores	18
278	Santa Cruz Naranjo	18
279	Santa María Ixhuatán	18
280	Santa Rosa de Lima	18
281	Taxisco	18
282	Concepción	19
283	Nahualá	19
284	Panajachel	19
285	San Andrés Semetabaj	19
286	San Antonio Palopó	19
287	San José Chacayá	19
288	San Juan La Laguna	19
289	San Lucas Tolimán	19
290	San Marcos La Laguna	19
291	San Pablo La Laguna	19
292	San Pedro La Laguna	19
293	Santa Catarina Ixtahuacán	19
294	Santa Catarina Palopó	19
295	Santa Clara La Laguna	19
296	Santa Cruz La Laguna	19
297	Santa Lucía Utatlán	19
298	Santa María Visitación	19
299	Santiago Atitlán	19
300	Sololá	19
301	Chicacao	20
302	Cuyotenango	20
303	Mazatenango	20
304	Patulul	20
305	Pueblo Nuevo	20
306	Río Bravo	20
307	Samayac	20
308	San Antonio Suchitepéquez	20
309	San Bernardino	20
310	San Francisco Zapotitlán	20
311	San Gabriel	20
312	San José El Idolo	20
313	San José La Maquina	20
314	San Juan Bautista	20
315	San Lorenzo	20
316	San Miguel Panán	20
317	San Pablo Jocopilas	20
318	Santa Bárbara	20
319	Santo Domingo Suchitepéquez	20
320	Santo Tomás La Unión	20
321	Zunilito	20
322	Momostenango	21
323	San Andrés Xecul	21
324	San Bartolo	21
325	San Cristóbal Totonicapán	21
326	San Francisco El Alto	21
327	Santa Lucía La Reforma	21
328	Santa María Chiquimula	21
329	Totonicapán	21
330	Cabañas	22
331	Estanzuela	22
332	Gualán	22
333	Huité	22
334	La Unión	22
335	Río Hondo	22
336	San Diego	22
337	San Jorge	22
338	Teculután	22
339	Usumatlán	22
340	Zacapa	22
\.


--
-- Data for Name: ninio_padre; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.ninio_padre (ninio_id, padre_id, parentesco) FROM stdin;
\.


--
-- Data for Name: ninios; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.ninios (id, nombre_completo, fecha_nacimiento, sexo, comunidad_id, qr_codigo, qr_pin, activo, creado_en) FROM stdin;
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.notificaciones (id, padre_id, alerta_id, canal, asunto, contenido, estado, enviado_en, creado_en) FROM stdin;
\.


--
-- Data for Name: padres; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.padres (id, nombre_completo, dpi, telefono, correo, telegram_chat_id, canal_preferido, password_hash, comunidad_id, creado_en) FROM stdin;
\.


--
-- Data for Name: registros_crecimiento; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.registros_crecimiento (id, ninio_id, fecha_medicion, peso_kg, talla_cm, edad_meses_al_medir, percentil_peso, percentil_talla, registrado_por, creado_en) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.usuarios (id, nombre_completo, correo, password_hash, rol, centro_salud, activo, creado_en) FROM stdin;
73aaf7ed-9ae3-4814-9d5b-3e1dabbf6ce7	Administrador General	admin@centrosalud.gob.gt	$2a$10$GgpXdBs7UGIRF9smUV0c4.2BJg1lfJFyi.jBENrf7QL9CaAX/ji6K	administrador	\N	t	2026-09-14 00:32:00.841773
\.


--
-- Data for Name: vacunaciones; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.vacunaciones (id, ninio_id, vacuna_id, fecha_aplicada, fecha_proxima_dosis, estado, aplicada_por, creado_en) FROM stdin;
\.


--
-- Data for Name: vacunas; Type: TABLE DATA; Schema: public; Owner: sisvac_user
--

COPY public.vacunas (id, nombre, edad_recomendada_meses, dosis_numero, descripcion) FROM stdin;
03220e8e-8250-49e8-b252-69550a28b57b	BCG	0	1	Contra la tuberculosis - dosis única al nacer
3ebc9bde-961b-489e-a79f-323f0084297c	Hepatitis B	0	1	Primera dosis al nacer
736b7687-e8f4-4335-a8a5-f1beb83d1172	Pentavalente	2	1	Difteria, tos ferina, tétanos, Hib, Hepatitis B - 1ra dosis
f36a945f-7387-4003-b59a-68e78cfa17fd	Pentavalente	4	2	2da dosis
d253376c-c354-41e8-bba2-81b8994259aa	Pentavalente	6	3	3ra dosis
e769f53f-e3eb-45dd-9fcd-e565605c4b02	Polio (OPV/IPV)	2	1	1ra dosis
73064cb1-e6bb-473b-bb3e-178e1fe7fe40	Polio (OPV/IPV)	4	2	2da dosis
54054259-0fd2-4ad3-830e-7cc05e5a5e6c	Polio (OPV/IPV)	6	3	3ra dosis
741149e7-e93f-4c6f-aa8e-8f1481ba6f75	Rotavirus	2	1	1ra dosis
39c9a45a-84df-4212-8be7-80a2c7171816	Rotavirus	4	2	2da dosis
28d312d4-1ea1-4647-a705-61c89047618b	Neumococo	2	1	1ra dosis
43efbed2-3158-4d19-a19a-5a8ef99566ff	Neumococo	4	2	2da dosis
6623c5eb-535a-4285-9f2d-af57ad9db068	Neumococo	12	3	Refuerzo
2ecb7ae8-cf71-487b-be62-d668d04939bd	SPR (Sarampión, Paperas, Rubéola)	12	1	1ra dosis
1f1b9d6f-ceee-4098-af4e-ff1efd6d18c1	SPR (Sarampión, Paperas, Rubéola)	18	2	Refuerzo
f420b224-0773-4c49-9327-2a3539640b0a	DPT Refuerzo	18	1	Refuerzo difteria, tos ferina, tétanos
696a4bfc-822b-41e9-87bc-eeef0bc4c88f	Polio Refuerzo	18	1	Refuerzo
\.


--
-- Name: centros_salud_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sisvac_user
--

SELECT pg_catalog.setval('public.centros_salud_id_seq', 185, true);


--
-- Name: departamentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sisvac_user
--

SELECT pg_catalog.setval('public.departamentos_id_seq', 22, true);


--
-- Name: municipios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sisvac_user
--

SELECT pg_catalog.setval('public.municipios_id_seq', 340, true);


--
-- Name: alertas alertas_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);


--
-- Name: campanias campanias_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.campanias
    ADD CONSTRAINT campanias_pkey PRIMARY KEY (id);


--
-- Name: centros_salud centros_salud_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.centros_salud
    ADD CONSTRAINT centros_salud_pkey PRIMARY KEY (id);


--
-- Name: comunidades comunidades_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_pkey PRIMARY KEY (id);


--
-- Name: departamentos departamentos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_nombre_key UNIQUE (nombre);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id);


--
-- Name: municipios municipios_nombre_departamento_id_key; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_nombre_departamento_id_key UNIQUE (nombre, departamento_id);


--
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (id);


--
-- Name: ninio_padre ninio_padre_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.ninio_padre
    ADD CONSTRAINT ninio_padre_pkey PRIMARY KEY (ninio_id, padre_id);


--
-- Name: ninios ninios_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.ninios
    ADD CONSTRAINT ninios_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: padres padres_dpi_key; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.padres
    ADD CONSTRAINT padres_dpi_key UNIQUE (dpi);


--
-- Name: padres padres_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.padres
    ADD CONSTRAINT padres_pkey PRIMARY KEY (id);


--
-- Name: registros_crecimiento registros_crecimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.registros_crecimiento
    ADD CONSTRAINT registros_crecimiento_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: vacunaciones vacunaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.vacunaciones
    ADD CONSTRAINT vacunaciones_pkey PRIMARY KEY (id);


--
-- Name: vacunas vacunas_pkey; Type: CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.vacunas
    ADD CONSTRAINT vacunas_pkey PRIMARY KEY (id);


--
-- Name: idx_centros_salud_departamento; Type: INDEX; Schema: public; Owner: sisvac_user
--

CREATE INDEX idx_centros_salud_departamento ON public.centros_salud USING btree (departamento_id);


--
-- Name: idx_centros_salud_municipio; Type: INDEX; Schema: public; Owner: sisvac_user
--

CREATE INDEX idx_centros_salud_municipio ON public.centros_salud USING btree (municipio_id);


--
-- Name: idx_municipios_departamento; Type: INDEX; Schema: public; Owner: sisvac_user
--

CREATE INDEX idx_municipios_departamento ON public.municipios USING btree (departamento_id);


--
-- Name: idx_registros_ninio; Type: INDEX; Schema: public; Owner: sisvac_user
--

CREATE INDEX idx_registros_ninio ON public.registros_crecimiento USING btree (ninio_id, fecha_medicion);


--
-- Name: idx_vacunaciones_ninio; Type: INDEX; Schema: public; Owner: sisvac_user
--

CREATE INDEX idx_vacunaciones_ninio ON public.vacunaciones USING btree (ninio_id);


--
-- Name: alertas alertas_ninio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_ninio_id_fkey FOREIGN KEY (ninio_id) REFERENCES public.ninios(id) ON DELETE CASCADE;


--
-- Name: campanias campanias_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.campanias
    ADD CONSTRAINT campanias_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: campanias campanias_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.campanias
    ADD CONSTRAINT campanias_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: centros_salud centros_salud_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.centros_salud
    ADD CONSTRAINT centros_salud_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);


--
-- Name: centros_salud centros_salud_municipio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.centros_salud
    ADD CONSTRAINT centros_salud_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipios(id);


--
-- Name: comunidades comunidades_centro_salud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_centro_salud_id_fkey FOREIGN KEY (centro_salud_id) REFERENCES public.centros_salud(id);


--
-- Name: comunidades comunidades_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id);


--
-- Name: comunidades comunidades_municipio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipios(id);


--
-- Name: municipios municipios_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE CASCADE;


--
-- Name: ninio_padre ninio_padre_ninio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.ninio_padre
    ADD CONSTRAINT ninio_padre_ninio_id_fkey FOREIGN KEY (ninio_id) REFERENCES public.ninios(id) ON DELETE CASCADE;


--
-- Name: ninio_padre ninio_padre_padre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.ninio_padre
    ADD CONSTRAINT ninio_padre_padre_id_fkey FOREIGN KEY (padre_id) REFERENCES public.padres(id) ON DELETE CASCADE;


--
-- Name: ninios ninios_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.ninios
    ADD CONSTRAINT ninios_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id) ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_alerta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_alerta_id_fkey FOREIGN KEY (alerta_id) REFERENCES public.alertas(id) ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_padre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_padre_id_fkey FOREIGN KEY (padre_id) REFERENCES public.padres(id) ON DELETE CASCADE;


--
-- Name: padres padres_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.padres
    ADD CONSTRAINT padres_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id) ON DELETE SET NULL;


--
-- Name: registros_crecimiento registros_crecimiento_ninio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.registros_crecimiento
    ADD CONSTRAINT registros_crecimiento_ninio_id_fkey FOREIGN KEY (ninio_id) REFERENCES public.ninios(id) ON DELETE CASCADE;


--
-- Name: registros_crecimiento registros_crecimiento_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.registros_crecimiento
    ADD CONSTRAINT registros_crecimiento_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: vacunaciones vacunaciones_aplicada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.vacunaciones
    ADD CONSTRAINT vacunaciones_aplicada_por_fkey FOREIGN KEY (aplicada_por) REFERENCES public.usuarios(id);


--
-- Name: vacunaciones vacunaciones_ninio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.vacunaciones
    ADD CONSTRAINT vacunaciones_ninio_id_fkey FOREIGN KEY (ninio_id) REFERENCES public.ninios(id) ON DELETE CASCADE;


--
-- Name: vacunaciones vacunaciones_vacuna_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sisvac_user
--

ALTER TABLE ONLY public.vacunaciones
    ADD CONSTRAINT vacunaciones_vacuna_id_fkey FOREIGN KEY (vacuna_id) REFERENCES public.vacunas(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Sd83ZsfRswdwkClcJJcf1sfxaosRE4yvuZRegCIDLKGvoeDxaXzaXtnjhxF580V

