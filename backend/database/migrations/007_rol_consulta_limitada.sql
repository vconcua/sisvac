-- ============================================================
-- Migración 007: nuevo rol de usuario "consulta_limitada"
--
-- Este rol puede VER (GET) únicamente niños y padres, sin poder
-- crear, editar ni eliminar nada, y sin acceso a ningún otro módulo
-- (comunidades, centros de salud, vacunación, alertas, reportes,
-- catálogos). Pensado para personal que solo necesita consultar
-- información de familias sin intervenir en el sistema (ej. personal
-- administrativo, practicantes, auditoría).
-- ============================================================

ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'consulta_limitada';
