-- Script para limpiar SOLO los datos de las tablas AirBeam3
-- Mantiene la estructura de las tablas pero borra todos los registros

-- Limpiar datos de todas las tablas AirBeam3
TRUNCATE TABLE public.airbeam3_1 RESTART IDENTITY;
TRUNCATE TABLE public.airbeam3_2 RESTART IDENTITY;
TRUNCATE TABLE public.airbeam3_3 RESTART IDENTITY;
TRUNCATE TABLE public.airbeam3_4 RESTART IDENTITY;
TRUNCATE TABLE public.airbeam3_5 RESTART IDENTITY;

-- Verificar que las tablas están vacías
SELECT 'airbeam3_1' as tabla, COUNT(*) as registros FROM public.airbeam3_1
UNION ALL
SELECT 'airbeam3_2' as tabla, COUNT(*) as registros FROM public.airbeam3_2
UNION ALL
SELECT 'airbeam3_3' as tabla, COUNT(*) as registros FROM public.airbeam3_3
UNION ALL
SELECT 'airbeam3_4' as tabla, COUNT(*) as registros FROM public.airbeam3_4
UNION ALL
SELECT 'airbeam3_5' as tabla, COUNT(*) as registros FROM public.airbeam3_5;