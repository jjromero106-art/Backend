-- Crear tablas para los 5 sensores AirBeam3
-- Ejecutar en Supabase SQL Editor

-- Tabla 1: AirBeam3-40915110766c
CREATE TABLE airbeam3_1 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla 2: AirBeam3-943cc67e9598
CREATE TABLE airbeam3_2 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla 3: AirBeam3-1c9dc2f1a0f0
CREATE TABLE airbeam3_3 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla 4: AirBeam3-943cc67c5ab4
CREATE TABLE airbeam3_4 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla 5: AirBeam3-409151117128
CREATE TABLE airbeam3_5 (
    id BIGSERIAL PRIMARY KEY,
    session_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pm1 DECIMAL(8, 2),
    temperature DECIMAL(8, 2),
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    humidity DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_airbeam3_1_timestamp ON airbeam3_1(timestamp);
CREATE INDEX idx_airbeam3_2_timestamp ON airbeam3_2(timestamp);
CREATE INDEX idx_airbeam3_3_timestamp ON airbeam3_3(timestamp);
CREATE INDEX idx_airbeam3_4_timestamp ON airbeam3_4(timestamp);
CREATE INDEX idx_airbeam3_5_timestamp ON airbeam3_5(timestamp);