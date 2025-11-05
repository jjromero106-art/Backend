-- Crear vistas API simples sin SECURITY DEFINER
-- Ejecutar en el proyecto AirBeam3

-- Crear esquema API si no existe
CREATE SCHEMA IF NOT EXISTS api;

-- Vista 1: AirBeam3-40915110766c
CREATE OR REPLACE VIEW api.airbeam3_1 AS
SELECT * FROM public.airbeam3_1;

-- Vista 2: AirBeam3-943cc67e9598
CREATE OR REPLACE VIEW api.airbeam3_2 AS
SELECT * FROM public.airbeam3_2;

-- Vista 3: AirBeam3-1c9dc2f1a0f0
CREATE OR REPLACE VIEW api.airbeam3_3 AS
SELECT * FROM public.airbeam3_3;

-- Vista 4: AirBeam3-943cc67c5ab4
CREATE OR REPLACE VIEW api.airbeam3_4 AS
SELECT * FROM public.airbeam3_4;

-- Vista 5: AirBeam3-409151117128
CREATE OR REPLACE VIEW api.airbeam3_5 AS
SELECT * FROM public.airbeam3_5;

-- Permisos básicos
GRANT USAGE ON SCHEMA api TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO service_role;