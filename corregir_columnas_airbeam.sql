-- Corregir nombres de columnas AirBeam3 según el mapeo real del CSV
-- Los datos ya subidos están en las columnas incorrectas

-- Renombrar columnas para reflejar el contenido real:
-- pm1 (actualmente) contiene PM10 → renombrar a pm10_real
-- temperature (actualmente) contiene PM2.5 → renombrar a pm25_real  
-- pm25 (actualmente) contiene Humedad → renombrar a humidity_real
-- pm10 (actualmente) contiene Temperatura → renombrar a temperature_real
-- humidity (actualmente) contiene PM1 → renombrar a pm1_real

-- Tabla 1
ALTER TABLE public.airbeam3_1 RENAME COLUMN pm1 TO pm10_real;
ALTER TABLE public.airbeam3_1 RENAME COLUMN temperature TO pm25_real;
ALTER TABLE public.airbeam3_1 RENAME COLUMN pm25 TO humidity_real;
ALTER TABLE public.airbeam3_1 RENAME COLUMN pm10 TO temperature_real;
ALTER TABLE public.airbeam3_1 RENAME COLUMN humidity TO pm1_real;

-- Tabla 2
ALTER TABLE public.airbeam3_2 RENAME COLUMN pm1 TO pm10_real;
ALTER TABLE public.airbeam3_2 RENAME COLUMN temperature TO pm25_real;
ALTER TABLE public.airbeam3_2 RENAME COLUMN pm25 TO humidity_real;
ALTER TABLE public.airbeam3_2 RENAME COLUMN pm10 TO temperature_real;
ALTER TABLE public.airbeam3_2 RENAME COLUMN humidity TO pm1_real;

-- Tabla 3
ALTER TABLE public.airbeam3_3 RENAME COLUMN pm1 TO pm10_real;
ALTER TABLE public.airbeam3_3 RENAME COLUMN temperature TO pm25_real;
ALTER TABLE public.airbeam3_3 RENAME COLUMN pm25 TO humidity_real;
ALTER TABLE public.airbeam3_3 RENAME COLUMN pm10 TO temperature_real;
ALTER TABLE public.airbeam3_3 RENAME COLUMN humidity TO pm1_real;

-- Tabla 4
ALTER TABLE public.airbeam3_4 RENAME COLUMN pm1 TO pm10_real;
ALTER TABLE public.airbeam3_4 RENAME COLUMN temperature TO pm25_real;
ALTER TABLE public.airbeam3_4 RENAME COLUMN pm25 TO humidity_real;
ALTER TABLE public.airbeam3_4 RENAME COLUMN pm10 TO temperature_real;
ALTER TABLE public.airbeam3_4 RENAME COLUMN humidity TO pm1_real;

-- Tabla 5
ALTER TABLE public.airbeam3_5 RENAME COLUMN pm1 TO pm10_real;
ALTER TABLE public.airbeam3_5 RENAME COLUMN temperature TO pm25_real;
ALTER TABLE public.airbeam3_5 RENAME COLUMN pm25 TO humidity_real;
ALTER TABLE public.airbeam3_5 RENAME COLUMN pm10 TO temperature_real;
ALTER TABLE public.airbeam3_5 RENAME COLUMN humidity TO pm1_real;

-- Verificar cambios
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'airbeam3_1' 
AND table_schema = 'public'
ORDER BY ordinal_position;