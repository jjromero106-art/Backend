-- Crear esquema API seguro para AirBeam3
-- Ejecutar DESPUÉS de crear_tablas_airbeam.sql

-- 1. Crear esquema API
CREATE SCHEMA IF NOT EXISTS api;

-- 2. Configurar permisos básicos para el esquema API
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT ALL ON TABLES TO service_role;