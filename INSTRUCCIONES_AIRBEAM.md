# Integración AirBeam3 en Backend

## Archivos creados:

1. **`crear_tablas_airbeam.sql`** - Script SQL para crear las 5 tablas en Supabase
2. **`verificar_sensores_airbeam.js`** - Script independiente (opcional)
3. **`index.js`** - Modificado para incluir funcionalidad AirBeam3

## Pasos para implementar:

### 1. Crear nuevo proyecto Supabase para AirBeam3
- Ve a https://supabase.com/dashboard
- Crea un **nuevo proyecto** para AirBeam3
- Ve a Settings > API y copia URL y anon key

### 2. Configurar credenciales
- Edita `config_airbeam.js` con las credenciales del nuevo proyecto
- O modifica directamente las variables en `index.js`:
  ```javascript
  const SUPABASE_AIRBEAM_URL = "https://tu-proyecto-airbeam.supabase.co";
  const SUPABASE_AIRBEAM_KEY = "tu-anon-key-airbeam";
  ```

### 3. Crear tablas en el nuevo proyecto
- Ve al dashboard del **nuevo proyecto AirBeam3**
- SQL Editor → New Query  
- Pega el contenido de `crear_tablas_airbeam.sql`
- Ejecuta el script

### 4. El backend ya está configurado
- Tu `index.js` ahora usa **dos bases de datos separadas**
- Firebase → Base de datos original
- AirBeam3 → Nueva base de datos
- Se ejecuta automáticamente cada minuto

### 3. Ejecutar
```bash
cd backend
node index.js
```

## Funcionamiento:

### Ciclo cada minuto:
1. **Sincroniza Firebase** (300 nodos como antes)
2. **Sincroniza AirBeam3** (todos los 5 sensores)

### Características AirBeam3:
- **5 tablas separadas** por sensor
- **Misma lógica de fechas** que el CSV
- **Evita duplicados** por timestamp único
- **Batch inserts** de 1000 registros
- **Acumulación en memoria** antes de insertar
- **Reintentos automáticos** con timeout

### Tablas creadas:
- `airbeam3_40915110766c`
- `airbeam3_943cc67e9598`
- `airbeam3_1c9dc2f1a0f0`
- `airbeam3_943cc67c5ab4`
- `airbeam3_409151117128`

### Columnas de cada tabla:
- `id` (BIGSERIAL PRIMARY KEY)
- `session_name` (TEXT)
- `timestamp` (TIMESTAMPTZ UNIQUE)
- `latitude` (DECIMAL)
- `longitude` (DECIMAL)
- `pm1` (DECIMAL)
- `temperature` (DECIMAL)
- `pm25` (DECIMAL)
- `pm10` (DECIMAL)
- `humidity` (DECIMAL)
- `created_at` (TIMESTAMPTZ)

## Logs esperados:

```
[INFO] Iniciando sincronización completa (Firebase + AirBeam3) cada 1 minuto...
[INFO] Ejecución completa #1
[INFO] Iniciando sincronización de 300 nodos desde Firebase
...
[INFO] Procesando sensores AirBeam3...
[AIRBEAM SENSOR] AirBeam3-40915110766c
[INFO] Último dato AirBeam en DB: 2025-01-15T10:30:00.000Z
[INFO] AirBeam continuando descarga desde: 2025-01-15T10:31:00.000Z
[LOTE AIRBEAM] 2025-01-15T10:31:00.000Z - 2025-01-16T10:31:00.000Z
[AirBeam3-PM1] 150 mediciones
[AirBeam3-F] 150 mediciones
[INFO] AirBeam acumulados 150 registros en memoria
[SUCCESS] 150 registros AirBeam guardados en tabla airbeam3_40915110766c
[INFO] AirBeam AirBeam3-40915110766c completado
```

## Ventajas de esta integración:

1. **Un solo backend** para Firebase y AirBeam3
2. **Mismas credenciales** de Supabase
3. **Mismo sistema de logs** y reintentos
4. **Ejecución automática** cada minuto
5. **No duplica código** de configuración