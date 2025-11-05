-- Crear vistas API para AirBeam3
-- Ejecutar DESPUÉS de crear_tablas_airbeam.sql

-- Vista 1: AirBeam3-40915110766c
CREATE OR REPLACE VIEW api.airbeam3_1 AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    pm1,
    temperature,
    pm25,
    pm10,
    humidity,
    created_at
FROM public.airbeam3_1;

-- Vista 2: AirBeam3-943cc67e9598
CREATE OR REPLACE VIEW api.airbeam3_2 AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    pm1,
    temperature,
    pm25,
    pm10,
    humidity,
    created_at
FROM public.airbeam3_2;

-- Vista 3: AirBeam3-1c9dc2f1a0f0
CREATE OR REPLACE VIEW api.airbeam3_3 AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    pm1,
    temperature,
    pm25,
    pm10,
    humidity,
    created_at
FROM public.airbeam3_3;

-- Vista 4: AirBeam3-943cc67c5ab4
CREATE OR REPLACE VIEW api.airbeam3_4 AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    pm1,
    temperature,
    pm25,
    pm10,
    humidity,
    created_at
FROM public.airbeam3_4;

-- Vista 5: AirBeam3-409151117128
CREATE OR REPLACE VIEW api.airbeam3_5 AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    pm1,
    temperature,
    pm25,
    pm10,
    humidity,
    created_at
FROM public.airbeam3_5;

-- Configurar permisos para las vistas
GRANT SELECT ON ALL TABLES IN SCHEMA api TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA api TO service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO service_role;