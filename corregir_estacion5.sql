-- Corregir mapeo de columnas para la estación 5 (AirBeam3-409151117128)
-- El CSV tiene: Humedad, Temperatura(F), PM2.5, PM10, PM1
-- La tabla tiene: pm1, temperature, pm25, pm10, humidity

-- Crear tabla temporal con los datos corregidos
CREATE TEMP TABLE airbeam3_5_temp AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    humidity as pm1_temp,           -- Lo que está en pm1 es realmente humedad
    pm1 as temperature_temp,        -- Lo que está en temperature es realmente PM1
    pm25,                          -- PM2.5 está correcto
    pm10,                          -- PM10 está correcto  
    temperature as humidity_temp,   -- Lo que está en humidity es realmente temperatura
    created_at
FROM airbeam3_5;

-- Actualizar la tabla original con los valores corregidos
UPDATE airbeam3_5 SET
    pm1 = (SELECT temperature_temp FROM airbeam3_5_temp WHERE airbeam3_5_temp.id = airbeam3_5.id),
    temperature = (SELECT humidity_temp FROM airbeam3_5_temp WHERE airbeam3_5_temp.id = airbeam3_5.id),
    humidity = (SELECT pm1_temp FROM airbeam3_5_temp WHERE airbeam3_5_temp.id = airbeam3_5.id);

-- Limpiar tabla temporal
DROP TABLE airbeam3_5_temp;

-- Verificar algunos registros
SELECT 
    timestamp,
    temperature,
    humidity, 
    pm1,
    pm25,
    pm10
FROM airbeam3_5 
ORDER BY timestamp DESC 
LIMIT 10;