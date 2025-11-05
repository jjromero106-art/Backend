-- Eliminar vistas con SECURITY DEFINER y recrear sin esa propiedad
-- Ejecutar en el proyecto AirBeam3

-- Eliminar vistas existentes
DROP VIEW IF EXISTS api.airbeam3_1;
DROP VIEW IF EXISTS api.airbeam3_2;
DROP VIEW IF EXISTS api.airbeam3_3;
DROP VIEW IF EXISTS api.airbeam3_4;
DROP VIEW IF EXISTS api.airbeam3_5;

-- Recrear vistas SIN SECURITY DEFINER (por defecto son SECURITY INVOKER)
CREATE VIEW api.airbeam3_1 AS
SELECT * FROM public.airbeam3_1;

CREATE VIEW api.airbeam3_2 AS
SELECT * FROM public.airbeam3_2;

CREATE VIEW api.airbeam3_3 AS
SELECT * FROM public.airbeam3_3;

CREATE VIEW api.airbeam3_4 AS
SELECT * FROM public.airbeam3_4;

CREATE VIEW api.airbeam3_5 AS
SELECT * FROM public.airbeam3_5;

-- Permisos para service_role
GRANT USAGE ON SCHEMA api TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO service_role;