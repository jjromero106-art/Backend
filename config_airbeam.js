// Configuración para la base de datos separada de AirBeam3
// Reemplaza estos valores con los de tu proyecto AirBeam3

export const SUPABASE_AIRBEAM_CONFIG = {
    url: "https://tyljtojtvmvzvcadufwv.supabase.co",
    key: "your-airbeam-anon-key"
};

// Para obtener estos valores:
// 1. Crea un nuevo proyecto en https://supabase.com/dashboard
// 2. Ve a Settings > API
// 3. Copia la URL del proyecto y la anon/public key
// 4. Ejecuta el script crear_tablas_airbeam.sql en el nuevo proyecto