import requests
import csv
import os
import time
from datetime import datetime, timedelta, timezone

# ===== CONFIGURACIÓN EDITABLE =====
# Cambiar estos valores según necesites
USUARIO_OBJETIVO = "Alejandro Piracoca Mayorga"  # Cambiar por el usuario que necesites

SENSORES_A_VERIFICAR = [
    "AirBeam3-40915110766c",
    "AirBeam3-943cc67e9598", 
    "AirBeam3-1c9dc2f1a0f0",
    "AirBeam3-943cc67c5ab4",
    "AirBeam3-409151117128"
]  # Agregar o quitar sensores según necesites

CARPETA_DESCARGAS = "descargas_Airbeam3"  # Cambiar ruta donde se guardan los CSV
# IMPORTANTE: Si usas ruta de Windows, usa una de estas opciones:
# Ejemplo 1: r"C:\Users\Juan\Downloads" 
# Ejemplo 2: "C:\\Users\\Juan\\Downloads" 
# Ejemplo 3: "C:/Users/Juan/Downloads" 
# Solo nombre: "mi_carpeta" (se crea en carpeta actual)

TIEMPO_ESPERA_SEGUNDOS = 60  # Tiempo entre ciclos en modo continuo
# Valores válidos: cualquier número positivo (en segundos)
# Ejemplos: 30 (30 seg), 60 (1 min), 300 (5 min), 3600 (1 hora)
# ===================================

# ===== CONFIGURACIÓN DE APIs =====
API_SESSIONS = "https://aircasting.org/api/v3/sessions"
API_STREAMS = "https://aircasting.org/api/fixed/sessions/{session_id}/streams.json"
API_MEASUREMENTS = "https://aircasting.org/api/v3/fixed_measurements"

# ===== CONFIGURACIÓN DE DESCARGA POR LOTES =====
TAMANO_LOTE_HORAS = 24  # Descargar datos en lotes de X horas
MAX_MEASUREMENTS_PER_REQUEST = 10000  # Límite por petición

# ===== SESIÓN PERSISTENTE =====
session = requests.Session()
session.headers.update({"User-Agent": "AirBeam3-Downloader/1.0"})

# ===== FUNCIONES DE URLs =====
def generar_url_sessions(sensor_package_name):
    """Genera URL para buscar sesiones de un sensor"""
    año_actual = datetime.now().year
    params = {
        "sensor_package_name": sensor_package_name,
        "start_datetime": f"{año_actual}-01-01T00:00:00Z",
        "end_datetime": f"{año_actual}-12-31T23:59:59Z"
    }
    
    # Construir URL con parámetros
    url_base = API_SESSIONS
    params_str = "&".join([f"{k}={v}" for k, v in params.items()])
    url_completa = f"{url_base}?{params_str}"
    return url_completa

def generar_url_streams(session_id, con_limite=True):
    """Genera URL para obtener streams de una sesión"""
    url_base = API_STREAMS.format(session_id=session_id)
    if con_limite:
        return f"{url_base}?measurements_limit=1"
    else:
        return url_base

def generar_url_measurements(stream_id, start_time, end_time):
    """Genera URL para descargar mediciones por stream ID"""
    params = f"stream_id={stream_id}&start_time={start_time}&end_time={end_time}"
    return f"{API_MEASUREMENTS}?{params}"

def mostrar_urls_navegador(sensor_package_name, session_ids):
    """Muestra todas las URLs que se pueden abrir en el navegador"""
    print(f"\n[URLs PARA NAVEGADOR] {sensor_package_name}")
    print("=" * 60)
    
    # URL para buscar sesiones
    url_sessions = generar_url_sessions(sensor_package_name)
    print(f"\n1. Buscar sesiones del sensor:")
    print(f"   {url_sessions}")
    
    # URLs para cada sesión encontrada
    if session_ids:
        print(f"\n2. Streams de cada sesión (verificación de usuario):")
        for i, session_id in enumerate(session_ids, 1):
            url_verificacion = generar_url_streams(session_id, con_limite=True)
            print(f"   {i}. Sesión {session_id} (con límite):")
            print(f"      {url_verificacion}")
        
        print(f"\n3. Streams completos (descarga de datos):")
        for i, session_id in enumerate(session_ids, 1):
            url_completa = generar_url_streams(session_id, con_limite=False)
            print(f"   {i}. Sesión {session_id} (datos completos):")
            print(f"      {url_completa}")
        
        print(f"\n4. API de mediciones por stream (ejemplo):")
        print(f"   Formato: {API_MEASUREMENTS}?stream_id=STREAM_ID&start_time=START_MS&end_time=END_MS")
        print(f"   Ejemplo: {generar_url_measurements('2760409', '1649068083000', '1650884234000')}")
    
    print("=" * 60)
    print("[INSTRUCCIONES]")
    print("- Copia cualquier URL y pégala en tu navegador")
    print("- Las URLs con 'measurements_limit=1' son más rápidas")
    print("- Las URLs sin límite descargan todos los datos")
    print("- La API fixed_measurements permite descargas por lotes usando stream_id")
    print("=" * 60)

# ===== FUNCIONES AUXILIARES =====
def verificar_usuario_session(session_id):
    """
    Verifica si una sesión pertenece al usuario objetivo.
    Usa measurements_limit=1 para obtener solo el username sin descargar todos los datos.
    """
    url = API_STREAMS.format(session_id=session_id)
    params = {"measurements_limit": 1}
    
    try:
        r = session.get(url, params=params)
        r.raise_for_status()
        streams_data = r.json()
        
        username = streams_data.get('username', '')
        return username == USUARIO_OBJETIVO
        
    except Exception as e:
        print(f"    Error verificando sesión {session_id}: {e}")
        return False

# Variables globales para mantener el estado de descarga por sensor
_estado_descarga = {}
_datos_acumulados = {}  # Acumular datos en memoria por sensor

def descargar_datos(sensor_id, session_data, streams_info, lote_horas=24):
    """
    Función unificada para descargar datos de sensores por lotes.
    Procesa un lote de tiempo para todos los streams de un sensor.
    """
    global _estado_descarga
    
    session_id = session_data.get('id')
    title = session_data.get('title', 'SinTitulo').strip().replace(' ', '_')
    start_datetime = session_data.get('start_datetime')
    end_datetime = session_data.get('end_datetime')
    
    # Crear carpeta y archivo
    os.makedirs(CARPETA_DESCARGAS, exist_ok=True)
    nombre_archivo = f"{sensor_id}_{title}.csv"
    ruta_archivo = os.path.join(CARPETA_DESCARGAS, nombre_archivo)
    
    # Usar estado guardado o calcular desde CSV
    if sensor_id in _estado_descarga:
        current_start = _estado_descarga[sensor_id]
        print(f"    [INFO] Continuando desde estado guardado: {datetime.fromtimestamp(current_start/1000).strftime('%Y-%m-%d %H:%M:%S')} UTC")
    else:
        ultimo_timestamp_ms = obtener_ultimo_timestamp_csv(ruta_archivo)
        
        if ultimo_timestamp_ms:
            current_start = ultimo_timestamp_ms + (60 * 1000)
            print(f"    [INFO] Continuando descarga desde: {datetime.fromtimestamp(current_start/1000).strftime('%Y-%m-%d %H:%M:%S')} UTC")
        else:
            if isinstance(start_datetime, str):
                start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                current_start = int(start_dt.timestamp() * 1000)
            else:
                current_start = start_datetime
            print(f"    [INFO] Archivo nuevo, descargando desde: {datetime.fromtimestamp(current_start/1000).strftime('%Y-%m-%d %H:%M:%S')} UTC")
        
        _estado_descarga[sensor_id] = current_start
    
    # Verificar si ya estamos al día
    if current_start >= int(datetime.now(timezone.utc).timestamp() * 1000):
        print(f"    [INFO] Datos actualizados, no hay nuevos datos que descargar")
        if sensor_id in _estado_descarga:
            del _estado_descarga[sensor_id]
        return False
    
    # Crear archivo con cabeceras si no existe
    if not os.path.exists(ruta_archivo):
        sensor_names = [stream.get('sensor_name', '') for stream in streams_info]
        measurement_types = [stream.get('measurement_type', '') for stream in streams_info]
        measurement_units = [stream.get('sensor_unit', '') for stream in streams_info]
        
        with open(ruta_archivo, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["", "", "", "", "", *["Sensor_Package_Name"] * len(streams_info)])
            writer.writerow(["", "", "", "", "", *[sensor_id] * len(streams_info)])
            writer.writerow(["", "", "", "", "", *["Sensor_Name"] * len(streams_info)])
            writer.writerow(["", "", "", "", "", *sensor_names])
            writer.writerow(["", "", "", "", "", *["Measurement_Type"] * len(streams_info)])
            writer.writerow(["", "", "", "", "", *measurement_types])
            writer.writerow(["", "", "", "", "", *["Measurement_Units"] * len(streams_info)])
            writer.writerow(["", "", "", "", "", *measurement_units])
            
            columnas = ["ObjectID", "Session_Name", "Timestamp", "Latitude", "Longitude"]
            for i in range(1, len(streams_info) + 1):
                columnas.append(f"{i}:Measurement_Value")
            writer.writerow(columnas)
    
    # Obtener coordenadas de sesión
    try:
        streams_data = descargar_streams_completos(session_id)
        session_lat = streams_data.get('latitude', '')
        session_lon = streams_data.get('longitude', '')
        print(f"    [INFO] Coordenadas de sesión: {session_lat}, {session_lon}")
    except:
        session_lat = session_lon = ""
    
    # Convertir end_datetime a timestamp
    if isinstance(end_datetime, str):
        end_dt = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
        final_end = int(end_dt.timestamp() * 1000)
    else:
        final_end = end_datetime
    
    # Procesar un lote
    lote_ms = lote_horas * 60 * 60 * 1000
    if current_start < final_end:
        current_end = min(current_start + lote_ms, final_end)
        print(f"  [LOTE] {datetime.fromtimestamp(current_start/1000).strftime('%Y-%m-%d %H:%M')} - {datetime.fromtimestamp(current_end/1000).strftime('%Y-%m-%d %H:%M')}")
        
        mediciones_por_tiempo = {}
        datos_encontrados = False
        
        for i, stream in enumerate(streams_info):
            stream_id = stream.get('stream_id')
            sensor_name = stream.get('sensor_name')
            
            if not stream_id:
                continue
            
            try:
                params = {'stream_id': stream_id, 'start_time': current_start, 'end_time': current_end}
                r = session.get(API_MEASUREMENTS, params=params)
                r.raise_for_status()
                measurements = r.json()
                
                if isinstance(measurements, list) and measurements:
                    print(f"    [{sensor_name}] {len(measurements)} mediciones")
                    datos_encontrados = True
                    
                    for m in measurements:
                        timestamp_ms = m.get('time')
                        value = m.get('value')
                        if timestamp_ms and value is not None:
                            ts = datetime.fromtimestamp(timestamp_ms / 1000, timezone.utc)
                            ts_str = ts.strftime("%Y-%m-%dT%H:%M:%S.000")
                            
                            if ts_str not in mediciones_por_tiempo:
                                mediciones_por_tiempo[ts_str] = {"lat": session_lat, "lon": session_lon, "values": {}}
                            
                            mediciones_por_tiempo[ts_str]["values"][i+1] = value
                
                time.sleep(0.3)
                
            except Exception as e:
                print(f"    [ERROR] {sensor_name}: {e}")
        
        # Si no se encontraron datos pero hay más tiempo disponible, avanzar al siguiente lote
        if not datos_encontrados and current_end < final_end:
            print(f"    [INFO] Sin datos en este período, avanzando al siguiente lote")
            _estado_descarga[sensor_id] = current_end  # Guardar nueva posición
            return True  # Continuar buscando
        
        # Acumular datos en memoria en lugar de escribir inmediatamente
        if mediciones_por_tiempo:
            if sensor_id not in _datos_acumulados:
                _datos_acumulados[sensor_id] = []
            
            for ts_str, datos in sorted(mediciones_por_tiempo.items()):
                if datos["values"]:
                    fila_datos = {
                        'timestamp': ts_str,
                        'title': title,
                        'lat': datos["lat"],
                        'lon': datos["lon"],
                        'values': datos["values"]
                    }
                    _datos_acumulados[sensor_id].append(fila_datos)
            
            print(f"    [ACUMULADO] {len(mediciones_por_tiempo)} registros en memoria")
        
        # Actualizar estado y verificar si hay más datos
        _estado_descarga[sensor_id] = current_end
        hay_mas = current_end < final_end
        
        # Si no hay más datos, escribir todo al CSV
        if not hay_mas:
            _escribir_datos_acumulados(sensor_id, ruta_archivo, streams_info)
            # Limpiar estado al completar
            if sensor_id in _estado_descarga:
                del _estado_descarga[sensor_id]
            if sensor_id in _datos_acumulados:
                del _datos_acumulados[sensor_id]
        
        return hay_mas
    
    return False

def descargar_streams_completos(session_id):
    """
    Descarga streams completos sin measurements_limit.
    Obtiene todas las mediciones de una sesión para generar el CSV completo.
    """
    url = API_STREAMS.format(session_id=session_id)
    r = session.get(url)  # Sin measurements_limit
    r.raise_for_status()
    return r.json()

# ===== FUNCIÓN PRINCIPAL DE CSV =====
def obtener_ultimo_timestamp_csv(ruta_archivo):
    """
    Obtiene el último timestamp del CSV existente para continuar desde ahí.
    Retorna el timestamp en milisegundos o None si no hay datos.
    """
    if not os.path.exists(ruta_archivo):
        return None
    
    ultimo_timestamp = None
    try:
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            timestamps = []
            
            for i, row in enumerate(reader):
                if i > 8 and len(row) > 2:  # Saltar cabeceras
                    timestamp_str = row[2]  # Columna Timestamp
                    if timestamp_str and timestamp_str != "Timestamp":
                        try:
                            # Convertir timestamp string a milisegundos
                            dt = datetime.fromisoformat(timestamp_str.replace('.000', '+00:00'))
                            timestamp_ms = int(dt.timestamp() * 1000)
                            timestamps.append(timestamp_ms)
                        except:
                            continue
            
            if timestamps:
                ultimo_timestamp = max(timestamps)
                ultimo_dt = datetime.fromtimestamp(ultimo_timestamp / 1000, timezone.utc)
                print(f"    [INFO] Último dato en CSV: {ultimo_dt.strftime('%Y-%m-%d %H:%M:%S')} UTC")
            
    except Exception as e:
        print(f"    [AVISO] Error leyendo último timestamp: {e}")
    
    return ultimo_timestamp

def _escribir_datos_acumulados(sensor_id, ruta_archivo, streams_info):
    """
    Escribe todos los datos acumulados al CSV de una sola vez
    """
    if sensor_id not in _datos_acumulados or not _datos_acumulados[sensor_id]:
        return
    
    # Leer timestamps existentes
    mediciones_existentes = set()
    if os.path.exists(ruta_archivo):
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for i, row in enumerate(reader):
                if i > 8 and len(row) > 2:
                    timestamp = row[2]
                    if timestamp and timestamp != "Timestamp":
                        mediciones_existentes.add(timestamp)
    
    # Filtrar datos nuevos y escribir
    datos_nuevos = [d for d in _datos_acumulados[sensor_id] if d['timestamp'] not in mediciones_existentes]
    
    if datos_nuevos:
        obj_id = len(mediciones_existentes) + 1
        
        with open(ruta_archivo, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            
            for datos in datos_nuevos:
                fila = [obj_id, datos['title'], datos['timestamp'], datos['lat'], datos['lon']]
                for j in range(1, len(streams_info) + 1):
                    fila.append(datos['values'].get(j, ""))
                writer.writerow(fila)
                obj_id += 1
        
        print(f"    [GUARDADO] {len(datos_nuevos)} filas escritas al CSV")
    else:
        print(f"    [INFO] No hay datos nuevos para escribir")

def generar_csv_con_stream_ids(sensor_package_name, session_data, streams_info):
    """
    Procesa todos los lotes de un sensor usando la función unificada
    """
    while descargar_datos(sensor_package_name, session_data, streams_info, TAMANO_LOTE_HORAS):
        pass


def generar_csv(sensor_package_name, session_id, streams_data):
    """
    Genera CSV con formato estándar AirBeam3.
    - Crea archivo con cabeceras si no existe
    - Solo agrega datos nuevos (evita duplicados por timestamp)
    - Usa modo append para preservar datos existentes
    """
    streams = streams_data.get('streams', [])
    if not streams:
        return
    
    sensor_names = [s["sensor_name"] for s in streams]
    measurement_types = [s["measurement_type"] for s in streams]
    measurement_units = [s.get("sensor_unit", "") for s in streams]
    
    # Crear carpeta principal
    os.makedirs(CARPETA_DESCARGAS, exist_ok=True)
    
    # Nombre archivo simple (sin timestamp, sin subcarpetas)
    title = streams_data.get("title", "SinTitulo").strip().replace(" ", "_")
    nombre_archivo = f"{sensor_package_name}_{title}.csv"
    ruta_archivo = os.path.join(CARPETA_DESCARGAS, nombre_archivo)
    
    # Verificar si el archivo ya existe y leer datos existentes
    mediciones_existentes = set()
    if os.path.exists(ruta_archivo):
        try:
            with open(ruta_archivo, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for i, row in enumerate(reader):
                    if i > 8 and len(row) > 2:  # Saltar cabeceras
                        timestamp = row[2]  # Columna Timestamp
                        if timestamp and timestamp != "Timestamp":
                            mediciones_existentes.add(timestamp)
        except Exception as e:
            print(f"    [AVISO] Error leyendo archivo existente: {e}")
    
    # Crear archivo con cabeceras si no existe
    archivo_existe = os.path.exists(ruta_archivo)
    
    if not archivo_existe:
        with open(ruta_archivo, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            # Escribir cabeceras solo si es archivo nuevo
            writer.writerow(["", "", "", "", "", *["Sensor_Package_Name"] * len(streams)])
            writer.writerow(["", "", "", "", "", *[sensor_package_name] * len(streams)])
            writer.writerow(["", "", "", "", "", *["Sensor_Name"] * len(streams)])
            writer.writerow(["", "", "", "", "", *sensor_names])
            writer.writerow(["", "", "", "", "", *["Measurement_Type"] * len(streams)])
            writer.writerow(["", "", "", "", "", *measurement_types])
            writer.writerow(["", "", "", "", "", *["Measurement_Units"] * len(streams)])
            writer.writerow(["", "", "", "", "", *measurement_units])
            
            # Cabecera de datos
            columnas = ["ObjectID", "Session_Name", "Timestamp", "Latitude", "Longitude"]
            for i in range(1, len(streams) + 1):
                columnas.append(f"{i}:Measurement_Value")
            writer.writerow(columnas)
    
    # Agrupar mediciones por timestamp
    mediciones_por_tiempo = {}
    for idx, s in enumerate(streams, start=1):
        for m in s.get("measurements", []):
            t = m.get("time")
            if not t:
                continue
            ts = datetime.fromtimestamp(t / 1000, timezone.utc) - timedelta(hours=1)
            ts = ts.strftime("%Y-%m-%dT%H:%M:%S.000")
            
            if ts not in mediciones_por_tiempo:
                mediciones_por_tiempo[ts] = {
                    "lat": m.get("latitude", ""),
                    "lon": m.get("longitude", ""),
                    "values": {}
                }
            mediciones_por_tiempo[ts]["values"][idx] = m.get("value")
    
    # Agregar solo filas nuevas usando modo append
    filas_nuevas = 0
    obj_id = len(mediciones_existentes) + 1 if mediciones_existentes else 1
    
    with open(ruta_archivo, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        
        for ts, datos in sorted(mediciones_por_tiempo.items()):
            if ts not in mediciones_existentes:
                fila = [obj_id, title, ts, datos["lat"], datos["lon"]]
                for i in range(1, len(streams) + 1):
                    fila.append(datos["values"].get(i, ""))
                writer.writerow(fila)
                filas_nuevas += 1
                obj_id += 1
    
    if filas_nuevas == 0:
        print(f"    [INFO] No hay datos nuevos para {ruta_archivo}")
    else:
        print(f"    [OK] CSV actualizado: {ruta_archivo} ({filas_nuevas} filas nuevas)")

# ===== FUNCIÓN PRINCIPAL DE PROCESAMIENTO =====
def verificar_sensor(sensor_package_name):
    """
    Función principal que:
    1. Busca sesiones del sensor en el año actual
    2. Verifica cuáles pertenecen al usuario objetivo
    3. Descarga datos completos y genera CSV para las sesiones válidas
    """
    # Fechas del año actual
    año_actual = datetime.now().year
    params = {
        "sensor_package_name": sensor_package_name,
        "start_datetime": f"{año_actual}-01-01T00:00:00Z",
        "end_datetime": f"{año_actual}-12-31T23:59:59Z"
    }
    
    r = session.get(API_SESSIONS, params=params)
    r.raise_for_status()
    payload = r.json()
    sesiones = payload.get("sessions", [])
    
    print(f"\n[SENSOR] {sensor_package_name}")
    if not sesiones:
        print("  [INFO] Sin sesiones")
        return []
    
    session_ids = []
    
    for i, s in enumerate(sesiones):
        session_id = s.get('id')
        session_ids.append(session_id)
        
        print(f"  Sesión {i+1}:")
        print(f"    id: {session_id}")
        print(f"    title: {s.get('title')}")
        print(f"    start_datetime: {s.get('start_datetime')}")
        print(f"    end_datetime: {s.get('end_datetime')}")
        print(f"    type: {s.get('type')}")
        
        streams = s.get('streams', [])
        if streams:
            print(f"    streams ({len(streams)}):")
            for st in streams:
                print(f"      └─ id: {st.get('id')} | sensor_name: {st.get('sensor_name')} | measurement_type: {st.get('measurement_type')}")
        else:
            print("    streams: []")
    
    print(f"  [INFO] {len(session_ids)} sesiones encontradas")
    
    # Verificar cuáles pertenecen al usuario objetivo y procesar
    print(f"  [VERIFICANDO] Usuario...")
    session_ids_usuario = []
    
    for i, session_data in enumerate(sesiones):
        session_id = session_data.get('id')
        
        if verificar_usuario_session(session_id):
            session_ids_usuario.append(session_id)
            print(f"    [OK] {session_id} - {USUARIO_OBJETIVO}")
            
            # Obtener información detallada de streams
            print(f"    [DESCARGA] Información de streams para {session_id}...")
            try:
                streams_data = descargar_streams_completos(session_id)
                streams_info = streams_data.get('streams', [])
                
                if streams_info:
                    print(f"    [PROCESANDO] {len(streams_info)} streams encontrados")
                    generar_csv_con_stream_ids(sensor_package_name, session_data, streams_info)
                else:
                    print(f"    [AVISO] No se encontraron streams para la sesión {session_id}")
                    
            except Exception as e:
                print(f"    [ERROR] Procesando sesión {session_id}: {e}")
        else:
            print(f"    [SKIP] {session_id} - Usuario diferente")
    
    if not session_ids_usuario:
        print(f"  [INFO] No se encontraron sesiones del usuario {USUARIO_OBJETIVO}")
    else:
        print(f"  [RESUMEN] {len(session_ids_usuario)} sesiones procesadas del usuario {USUARIO_OBJETIVO}")
    


# ===== FUNCIÓN DE MODO CONTINUO =====
def ciclo_continuo():
    """
    Ejecuta el proceso en bucle infinito rotando entre sensores.
    Procesa un lote por sensor en cada ciclo.
    """
    print(f"[INICIO] Monitoreo continuo rotativo para usuario: {USUARIO_OBJETIVO}")
    print(f"Sensores: {len(SENSORES_A_VERIFICAR)}")
    print(f"Procesando 1 lote por sensor cada {TIEMPO_ESPERA_SEGUNDOS} segundos\n")
    
    # Obtener información de sensores una vez
    sensores_info = {}
    for sensor in SENSORES_A_VERIFICAR:
        try:
            sesiones = obtener_sesiones_sensor(sensor)
            if sesiones:
                sensores_info[sensor] = sesiones
                print(f"[INIT] {sensor}: {len(sesiones)} sesiones encontradas")
        except Exception as e:
            print(f"[ERROR] Error inicializando {sensor}: {e}")
    
    if not sensores_info:
        print("[ERROR] No se encontraron sensores válidos")
        return
    
    print(f"\n[ROTACIÓN] Iniciando ciclo rotativo con {len(sensores_info)} sensores\n")
    
    while True:
        print(f"=== CICLO {datetime.now().strftime('%H:%M:%S')} ===")
        
        # Procesar un lote para cada sensor
        for sensor, sesiones in sensores_info.items():
            print(f"\n[SENSOR] {sensor}")
            
            try:
                for session_data in sesiones:
                    session_id = session_data.get('id')
                    
                    if verificar_usuario_session(session_id):
                        streams_data = descargar_streams_completos(session_id)
                        streams_info = streams_data.get('streams', [])
                        
                        if streams_info:
                            # Continuar procesando este sensor hasta que no haya más datos
                            while True:
                                hay_mas = descargar_datos(sensor, session_data, streams_info, TAMANO_LOTE_HORAS)
                                if not hay_mas:
                                    print(f"    [INFO] {sensor} completado")
                                    break
                        break
                        
            except Exception as e:
                print(f"    [ERROR] {sensor}: {e}")
        
        print(f"\n[ESPERA] {TIEMPO_ESPERA_SEGUNDOS} segundos antes del siguiente ciclo...\n")
        time.sleep(TIEMPO_ESPERA_SEGUNDOS)

def obtener_sesiones_sensor(sensor_package_name):
    """
    Obtiene las sesiones de un sensor sin procesarlas
    """
    año_actual = datetime.now().year
    params = {
        "sensor_package_name": sensor_package_name,
        "start_datetime": f"{año_actual}-01-01T00:00:00Z",
        "end_datetime": f"{año_actual}-12-31T23:59:59Z"
    }
    
    r = session.get(API_SESSIONS, params=params)
    r.raise_for_status()
    payload = r.json()
    return payload.get("sessions", [])

# ===== PROGRAMA PRINCIPAL =====
if __name__ == "__main__":
    print(f"Verificando sensores para usuario: {USUARIO_OBJETIVO}")
    print(f"Sensores a verificar: {len(SENSORES_A_VERIFICAR)}")
    print(f"Ejecutando en modo continuo cada {TIEMPO_ESPERA_SEGUNDOS} segundos")
    ciclo_continuo()