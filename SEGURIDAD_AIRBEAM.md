# Configuración de Seguridad AirBeam3

## ¿Por qué usar SERVICE_ROLE KEY?

### Anon Key (pública):
- ❌ Limitada por RLS (Row Level Security)
- ❌ Expuesta en frontend
- ❌ Permisos restringidos

### Service Role Key (privada):
- ✅ Acceso completo desde backend
- ✅ Bypassa RLS automáticamente
- ✅ Solo para uso en servidor

## Esquema API Seguro

### Estructura:
```
public schema (tablas reales)
├── airbeam3_40915110766c
├── airbeam3_943cc67e9598
└── ...

api schema (vistas seguras)
├── airbeam3_40915110766c (vista)
├── airbeam3_943cc67e9598 (vista)
└── ...
```

### Ventajas:
1. **Separación** - API separada de datos internos
2. **Control** - Solo expones lo que necesitas
3. **Flexibilidad** - Puedes agregar filtros/transformaciones
4. **Seguridad** - Esquema público protegido

## Pasos de implementación:

### 1. Obtener SERVICE_ROLE KEY:
- Ve a tu proyecto Supabase
- Settings > API
- Copia **service_role** key (no anon)

### 2. Ejecutar scripts SQL (en orden):
```sql
-- Primero:
crear_esquema_api_airbeam.sql

-- Segundo:
crear_tablas_airbeam.sql
```

### 3. Configurar backend:
```javascript
const SUPABASE_AIRBEAM_KEY = "eyJhbGc...tu-service-role-key";
const supabaseAirBeam = createClient(URL, KEY, {
  db: { schema: 'api' }  // Usar esquema API
});
```

## Resultado:
- Backend usa **service_role** para acceso completo
- Datos se insertan en tablas **public**
- API externa accede solo a vistas **api**
- Máxima seguridad y flexibilidad