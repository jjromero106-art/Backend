-- Limpiar completamente todo lo relacionado con AirBeam3
-- Ejecutar en el proyecto AirBeam3

-- 1. Eliminar vistas primero
DROP VIEW IF EXISTS api.airbeam3_1 CASCADE;
DROP VIEW IF EXISTS api.airbeam3_2 CASCADE;
DROP VIEW IF EXISTS api.airbeam3_3 CASCADE;
DROP VIEW IF EXISTS api.airbeam3_4 CASCADE;
DROP VIEW IF EXISTS api.airbeam3_5 CASCADE;

-- 2. Eliminar tablas con CASCADE
DROP TABLE IF EXISTS public.airbeam3_1 CASCADE;
DROP TABLE IF EXISTS public.airbeam3_2 CASCADE;
DROP TABLE IF EXISTS public.airbeam3_3 CASCADE;
DROP TABLE IF EXISTS public.airbeam3_4 CASCADE;
DROP TABLE IF EXISTS public.airbeam3_5 CASCADE;

-- 3. Eliminar esquema api si existe
DROP SCHEMA IF EXISTS api CASCADE;

-- 4. Recrear todo desde cero
-- Crear esquema API
CREATE SCHEMA IF NOT EXISTS api;

-- Crear tablas en public
CREATE TABLE public.airbeam3_1 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) DEFAULT 0,
    longitude DECIMAL(11, 8) DEFAULT 0,
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.airbeam3_2 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) DEFAULT 0,
    longitude DECIMAL(11, 8) DEFAULT 0,
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.airbeam3_3 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) DEFAULT 0,
    longitude DECIMAL(11, 8) DEFAULT 0,
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.airbeam3_4 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) DEFAULT 0,
    longitude DECIMAL(11, 8) DEFAULT 0,
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.airbeam3_5 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) DEFAULT 0,
    longitude DECIMAL(11, 8) DEFAULT 0,
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_airbeam3_1_timestamp ON public.airbeam3_1(timestamp);
CREATE INDEX idx_airbeam3_2_timestamp ON public.airbeam3_2(timestamp);
CREATE INDEX idx_airbeam3_3_timestamp ON public.airbeam3_3(timestamp);
CREATE INDEX idx_airbeam3_4_timestamp ON public.airbeam3_4(timestamp);
CREATE INDEX idx_airbeam3_5_timestamp ON public.airbeam3_5(timestamp);

-- Crear vistas simples SIN SECURITY DEFINER
CREATE VIEW api.airbeam3_1 AS SELECT * FROM public.airbeam3_1;
CREATE VIEW api.airbeam3_2 AS SELECT * FROM public.airbeam3_2;
CREATE VIEW api.airbeam3_3 AS SELECT * FROM public.airbeam3_3;
CREATE VIEW api.airbeam3_4 AS SELECT * FROM public.airbeam3_4;
CREATE VIEW api.airbeam3_5 AS SELECT * FROM public.airbeam3_5;

-- Permisos
GRANT USAGE ON SCHEMA api TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO service_role;

-- LIMPIAR TODOS LOS DATOS (ejecutar solo si necesitas borrar todo)
-- TRUNCATE TABLE public.airbeam3_1 RESTART IDENTITY;
-- TRUNCATE TABLE public.airbeam3_2 RESTART IDENTITY;
-- TRUNCATE TABLE public.airbeam3_3 RESTART IDENTITY;
-- TRUNCATE TABLE public.airbeam3_4 RESTART IDENTITY;
-- TRUNCATE TABLE public.airbeam3_5 RESTART IDENTITY;