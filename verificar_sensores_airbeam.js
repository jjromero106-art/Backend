import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';

// ===== CONFIGURACIÓN =====
const USUARIO_OBJETIVO = "Alejandro Piracoca Mayorga";
const SENSORES_A_VERIFICAR = [
    "AirBeam3-40915110766c",
    "AirBeam3-943cc67e9598", 
    "AirBeam3-1c9dc2f1a0f0",
    "AirBeam3-943cc67c5ab4",
    "AirBeam3-409151117128"
];
const TIEMPO_ESPERA_SEGUNDOS = 60;
const TAMANO_LOTE_HORAS = 24;

// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = "https://lfagowoxxqmfhjzvkngv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYWdvd294eHFtZmhqenZrbmd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM4ODEzNSwiZXhwIjoyMDc1OTY0MTM1fQ.O8_WEvNt3KpuKJxehxwFJWxSsvO-kL-HORku-3cnEps";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== APIs AIRCASTING =====
const API_SESSIONS = "https://aircasting.org/api/v3/sessions";
const API_STREAMS = "https://aircasting.org/api/fixed/sessions/{session_id}/streams.json";
const API_MEASUREMENTS = "https://aircasting.org/api/v3/fixed_measurements";

// ===== MAPEO SENSORES A TABLAS =====
const SENSOR_TABLES = {
    "AirBeam3-40915110766c": "airbeam3_40915110766c",
    "AirBeam3-943cc67e9598": "airbeam3_943cc67e9598",
    "AirBeam3-1c9dc2f1a0f0": "airbeam3_1c9dc2f1a0f0",
    "AirBeam3-943cc67c5ab4": "airbeam3_943cc67c5ab4",
    "AirBeam3-409151117128": "airbeam3_409151117128"
};

// ===== ESTADO GLOBAL =====
const estadoDescarga = {};
const datosAcumulados = {};

// ===== LOGGING =====
const log = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
    success: (msg, data) => console.log(`[SUCCESS] ${msg}`, data || '')
};

// ===== FUNCIONES AUXILIARES =====
async function verificarUsuarioSession(sessionId) {
    try {
        const url = API_STREAMS.replace('{session_id}', sessionId);
        const response = await fetch(`${url}?measurements_limit=1`);
        const data = await response.json();
        return data.username === USUARIO_OBJETIVO;
    } catch (error) {
        log.error(`Error verificando sesión ${sessionId}:`, error.message);
        return false;
    }
}

async function descargarStreamsCompletos(sessionId) {
    const url = API_STREAMS.replace('{session_id}', sessionId);
    const response = await fetch(url);
    return await response.json();
}

async function obtenerUltimoTimestampDB(sensorId) {
    const tabla = SENSOR_TABLES[sensorId];
    if (!tabla) return null;
    
    try {
        const { data, error } = await supabase
            .from(tabla)
            .select("timestamp")
            .order("timestamp", { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const ultimoTimestamp = new Date(data[0].timestamp);
            const ultimoTimestampMs = ultimoTimestamp.getTime();
            log.info(`Último dato en DB: ${ultimoTimestamp.toISOString()}`);
            return ultimoTimestampMs;
        }
    } catch (error) {
        log.error("Error consultando último timestamp:", error.message);
    }
    
    return null;
}

async function insertarDatosDB(sensorId, datosLista) {
    const tabla = SENSOR_TABLES[sensorId];
    if (!tabla || !datosLista || datosLista.length === 0) return;
    
    // Preparar datos para inserción
    const registros = datosLista.map(datos => {
        const valores = datos.values;
        return {
            session_name: datos.title,
            timestamp: datos.timestamp,
            latitude: datos.lat ? parseFloat(datos.lat) : null,
            longitude: datos.lon ? parseFloat(datos.lon) : null,
            pm1: valores[1] ? parseFloat(valores[1]) : null,
            temperature: valores[2] ? parseFloat(valores[2]) : null,
            pm25: valores[3] ? parseFloat(valores[3]) : null,
            pm10: valores[4] ? parseFloat(valores[4]) : null,
            humidity: valores[5] ? parseFloat(valores[5]) : null
        };
    });
    
    try {
        // Insertar en lotes de 1000
        const batchSize = 1000;
        let totalInsertados = 0;
        
        for (let i = 0; i < registros.length; i += batchSize) {
            const batch = registros.slice(i, i + batchSize);
            const { error } = await supabase
                .from(tabla)
                .upsert(batch, { onConflict: 'timestamp' });
            
            if (error) throw error;
            
            totalInsertados += batch.length;
            log.info(`Insertados ${batch.length} registros (total: ${totalInsertados})`);
        }
        
        log.success(`${totalInsertados} registros guardados en tabla ${tabla}`);
        
    } catch (error) {
        log.error("Error insertando en DB:", error.message);
    }
}

async function descargarDatos(sensorId, sessionData, streamsInfo) {
    const sessionId = sessionData.id;
    const title = (sessionData.title || 'SinTitulo').trim().replace(' ', '_');
    const startDatetime = sessionData.start_datetime;
    const endDatetime = sessionData.end_datetime;
    
    // Usar estado guardado o calcular desde DB
    let currentStart;
    if (estadoDescarga[sensorId]) {
        currentStart = estadoDescarga[sensorId];
        log.info(`Continuando desde estado guardado: ${new Date(currentStart).toISOString()}`);
    } else {
        const ultimoTimestampMs = await obtenerUltimoTimestampDB(sensorId);
        
        if (ultimoTimestampMs) {
            currentStart = ultimoTimestampMs + (60 * 1000);
            log.info(`Continuando descarga desde: ${new Date(currentStart).toISOString()}`);
        } else {
            currentStart = new Date(startDatetime).getTime();
            log.info(`Tabla nueva, descargando desde: ${new Date(currentStart).toISOString()}`);
        }
        
        estadoDescarga[sensorId] = currentStart;
    }
    
    // Verificar si ya estamos al día
    if (currentStart >= Date.now()) {
        log.info("Datos actualizados, no hay nuevos datos que descargar");
        delete estadoDescarga[sensorId];
        return false;
    }
    
    // Obtener coordenadas de sesión
    let sessionLat = '', sessionLon = '';
    try {
        const streamsData = await descargarStreamsCompletos(sessionId);
        sessionLat = streamsData.latitude || '';
        sessionLon = streamsData.longitude || '';
        log.info(`Coordenadas de sesión: ${sessionLat}, ${sessionLon}`);
    } catch (error) {
        log.error("Error obteniendo coordenadas:", error.message);
    }
    
    // Procesar un lote
    const finalEnd = new Date(endDatetime).getTime();
    const loteMs = TAMANO_LOTE_HORAS * 60 * 60 * 1000;
    
    if (currentStart < finalEnd) {
        const currentEnd = Math.min(currentStart + loteMs, finalEnd);
        log.info(`[LOTE] ${new Date(currentStart).toISOString()} - ${new Date(currentEnd).toISOString()}`);
        
        const medicionesPorTiempo = {};
        let datosEncontrados = false;
        
        // Descargar datos de cada stream
        for (let i = 0; i < streamsInfo.length; i++) {
            const stream = streamsInfo[i];
            const streamId = stream.stream_id;
            const sensorName = stream.sensor_name;
            
            if (!streamId) continue;
            
            try {
                const params = new URLSearchParams({
                    stream_id: streamId,
                    start_time: currentStart,
                    end_time: currentEnd
                });
                
                const response = await fetch(`${API_MEASUREMENTS}?${params}`);
                const measurements = await response.json();
                
                if (Array.isArray(measurements) && measurements.length > 0) {
                    log.info(`[${sensorName}] ${measurements.length} mediciones`);
                    datosEncontrados = true;
                    
                    measurements.forEach(m => {
                        const timestampMs = m.time;
                        const value = m.value;
                        
                        if (timestampMs && value !== null && value !== undefined) {
                            const ts = new Date(timestampMs);
                            const tsStr = ts.toISOString().replace('Z', '.000');
                            
                            if (!medicionesPorTiempo[tsStr]) {
                                medicionesPorTiempo[tsStr] = {
                                    lat: sessionLat,
                                    lon: sessionLon,
                                    values: {}
                                };
                            }
                            
                            medicionesPorTiempo[tsStr].values[i + 1] = value;
                        }
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                log.error(`Error en ${sensorName}:`, error.message);
            }
        }
        
        // Si no hay datos, avanzar al siguiente lote
        if (!datosEncontrados && currentEnd < finalEnd) {
            log.info("Sin datos en este período, avanzando al siguiente lote");
            estadoDescarga[sensorId] = currentEnd;
            return true;
        }
        
        // Acumular datos en memoria
        if (Object.keys(medicionesPorTiempo).length > 0) {
            if (!datosAcumulados[sensorId]) {
                datosAcumulados[sensorId] = [];
            }
            
            Object.entries(medicionesPorTiempo)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([tsStr, datos]) => {
                    if (Object.keys(datos.values).length > 0) {
                        datosAcumulados[sensorId].push({
                            timestamp: tsStr,
                            title: title,
                            lat: datos.lat,
                            lon: datos.lon,
                            values: datos.values
                        });
                    }
                });
            
            log.info(`Acumulados ${Object.keys(medicionesPorTiempo).length} registros en memoria`);
        }
        
        // Actualizar estado
        estadoDescarga[sensorId] = currentEnd;
        const hayMas = currentEnd < finalEnd;
        
        // Si no hay más datos, insertar todo en la DB
        if (!hayMas) {
            if (datosAcumulados[sensorId] && datosAcumulados[sensorId].length > 0) {
                await insertarDatosDB(sensorId, datosAcumulados[sensorId]);
                delete datosAcumulados[sensorId];
            }
            delete estadoDescarga[sensorId];
        }
        
        return hayMas;
    }
    
    return false;
}

async function obtenerSesionesSensor(sensorPackageName) {
    const añoActual = new Date().getFullYear();
    const params = new URLSearchParams({
        sensor_package_name: sensorPackageName,
        start_datetime: `${añoActual}-01-01T00:00:00Z`,
        end_datetime: `${añoActual}-12-31T23:59:59Z`
    });
    
    const response = await fetch(`${API_SESSIONS}?${params}`);
    const data = await response.json();
    return data.sessions || [];
}

async function cicloSensores() {
    log.info(`Monitoreo continuo para usuario: ${USUARIO_OBJETIVO}`);
    log.info(`Sensores: ${SENSORES_A_VERIFICAR.length}`);
    log.info(`Subiendo datos a Supabase cada ${TIEMPO_ESPERA_SEGUNDOS} segundos`);
    
    // Obtener información de sensores
    const sensoresInfo = {};
    for (const sensor of SENSORES_A_VERIFICAR) {
        try {
            const sesiones = await obtenerSesionesSensor(sensor);
            if (sesiones.length > 0) {
                sensoresInfo[sensor] = sesiones;
                log.info(`[INIT] ${sensor}: ${sesiones.length} sesiones encontradas`);
            }
        } catch (error) {
            log.error(`Error inicializando ${sensor}:`, error.message);
        }
    }
    
    if (Object.keys(sensoresInfo).length === 0) {
        log.error("No se encontraron sensores válidos");
        return;
    }
    
    log.info(`Iniciando ciclo con ${Object.keys(sensoresInfo).length} sensores`);
    
    while (true) {
        log.info(`=== CICLO ${new Date().toLocaleTimeString()} ===`);
        
        for (const [sensor, sesiones] of Object.entries(sensoresInfo)) {
            log.info(`[SENSOR] ${sensor}`);
            
            try {
                for (const sessionData of sesiones) {
                    const sessionId = sessionData.id;
                    
                    if (await verificarUsuarioSession(sessionId)) {
                        const streamsData = await descargarStreamsCompletos(sessionId);
                        const streamsInfo = streamsData.streams || [];
                        
                        if (streamsInfo.length > 0) {
                            while (true) {
                                const hayMas = await descargarDatos(sensor, sessionData, streamsInfo);
                                if (!hayMas) {
                                    log.info(`${sensor} completado`);
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            } catch (error) {
                log.error(`Error en ${sensor}:`, error.message);
            }
        }
        
        log.info(`Esperando ${TIEMPO_ESPERA_SEGUNDOS} segundos...`);
        await new Promise(resolve => setTimeout(resolve, TIEMPO_ESPERA_SEGUNDOS * 1000));
    }
}

// ===== EJECUTAR =====
log.info(`Verificando sensores para usuario: ${USUARIO_OBJETIVO}`);
log.info(`Sensores a verificar: ${SENSORES_A_VERIFICAR.length}`);
log.info(`Ejecutando en modo continuo cada ${TIEMPO_ESPERA_SEGUNDOS} segundos`);

await cicloSensores();