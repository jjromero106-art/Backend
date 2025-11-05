-- Corrección final del mapeo de la Estación 5
-- Intercambiar PM1 con lo que quedó en la columna temperature después del primer intercambio

-- Crear tabla temporal para el intercambio final
CREATE TEMP TABLE airbeam3_5_final_temp AS
SELECT 
    id,
    session_name,
    timestamp,
    latitude,
    longitude,
    temperature as pm1_final,     -- Lo que está en temperature ahora es PM1
    humidity,                     -- Humedad ya está correcta
    pm25,                        -- PM2.5 ya está correcto
    pm10,                        -- PM10 ya está correcto
    pm1 as temperature_final,    -- Lo que está en pm1 ahora es temperatura
    created_at
FROM airbeam3_5;

-- Aplicar el intercambio final
UPDATE airbeam3_5 SET
    pm1 = (SELECT pm1_final FROM airbeam3_5_final_temp WHERE airbeam3_5_final_temp.id = airbeam3_5.id),
    temperature = (SELECT temperature_final FROM airbeam3_5_final_temp WHERE airbeam3_5_final_temp.id = airbeam3_5.id);

-- Limpiar tabla temporal
DROP TABLE airbeam3_5_final_temp;

-- Verificar el resultado final
SELECT 
    timestamp,
    temperature as "Temperatura (°F)",
    humidity as "Humedad (%)", 
    pm1 as "PM1 (µg/m³)",
    pm25 as "PM2.5 (µg/m³)",
    pm10 as "PM10 (µg/m³)"
FROM airbeam3_5 
ORDER BY timestamp DESC 
LIMIT 10;

-- Mostrar estadísticas para verificar que los valores son coherentes
SELECT 
    'temperature' as columna,
    MIN(temperature) as minimo,
    MAX(temperature) as maximo,
    AVG(temperature) as promedio
FROM airbeam3_5 WHERE temperature IS NOT NULL AND temperature > 0
UNION ALL
SELECT 
    'humidity' as columna,
    MIN(humidity) as minimo,
    MAX(humidity) as maximo,
    AVG(humidity) as promedio
FROM airbeam3_5 WHERE humidity IS NOT NULL AND humidity > 0
UNION ALL
SELECT 
    'pm1' as columna,
    MIN(pm1) as minimo,
    MAX(pm1) as maximo,
    AVG(pm1) as promedio
FROM airbeam3_5 WHERE pm1 IS NOT NULL AND pm1 > 0;