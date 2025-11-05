-- Renombrar columnas en estación 5 para corregir el mapeo
-- Actualmente: pm1=humedad, temperature=PM1, humidity=temperatura

ALTER TABLE airbeam3_5 
RENAME COLUMN pm1 TO humidity_real;

ALTER TABLE airbeam3_5 
RENAME COLUMN temperature TO pm1_real;

ALTER TABLE airbeam3_5 
RENAME COLUMN humidity TO temperature_real;

ALTER TABLE airbeam3_5 
RENAME COLUMN humidity_real TO humidity;

ALTER TABLE airbeam3_5 
RENAME COLUMN pm1_real TO pm1;

ALTER TABLE airbeam3_5 
RENAME COLUMN temperature_real TO temperature;