// --- Dependencias ---
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from "@supabase/supabase-js";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  query,
  orderByKey,
  startAfter,
  limitToFirst,
  get,
} from "firebase/database";

// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAZQOd4EQHqMSaheCmmw8f7V5U4Il0biE0",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "acueducto-561a1.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://acueducto-561a1-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "acueducto-561a1",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "acueducto-561a1.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "582426682908",
  appId: process.env.FIREBASE_APP_ID || "1:582426682908:web:0e652d1412fa12f7dee1d9",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// --- Configuración Supabase ---
const SUPABASE_URL = process.env.SUPABASE_URL || "https://lfagowoxxqmfhjzvkngv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYWdvd294eHFtZmhqenZrbmd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM4ODEzNSwiZXhwIjoyMDc1OTY0MTM1fQ.O8_WEvNt3KpuKJxehxwFJWxSsvO-kL-HORku-3cnEps";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Configuración Supabase AirBeam3 (Base de datos separada) ---
const SUPABASE_AIRBEAM_URL = process.env.SUPABASE_AIRBEAM_URL || "https://tyljtojtvmvzvcadufwv.supabase.co";
const SUPABASE_AIRBEAM_KEY = process.env.SUPABASE_AIRBEAM_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bGp0b2p0dm12enZjYWR1Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI3NjgyNywiZXhwIjoyMDc3ODUyODI3fQ.Ynz1OYdngOTjfO3WjptAoMTuDe90fyE1hHL5OCzqO5o";
const supabaseAirBeam = createClient(SUPABASE_AIRBEAM_URL, SUPABASE_AIRBEAM_KEY, {
  db: { schema: 'api' }  // El proyecto AirBeam3 requiere esquema api
});
// Nota: Este proyecto fuerza el uso del esquema api

// ===== SERVIDOR EXPRESS (INMEDIATO) =====
const PORT = process.env.PORT || 3001;
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'Backend funcionando', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[INFO] Servidor escuchando en puerto ${PORT}`);
});

// --- Función de timeout para operaciones de Supabase ---
function withTimeout(promise, timeoutMs = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// --- Función de reintentos automáticos ---
async function retry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try { 
      return await fn(); 
    } catch (err) {
      if (i === retries - 1) throw err;
      log.error(`Reintentando (${i + 1}/${retries}):`, err.message);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// --- Configuración de logging ---
const DEBUG = process.env.NODE_ENV !== "production";
const log = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  debug: (msg, data) => DEBUG && console.log(`[DEBUG] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  success: (msg, data) => console.log(`[SUCCESS] ${msg}`, data || '')
};

// --- Función para leer siguientes 300 nodos ---
async function leerSiguientes300Nodos() {
  try {
    log.info("Iniciando sincronización de 300 nodos desde Firebase");

    // 1️⃣ Obtener el último nodo procesado de Supabase (con reintentos)
    const { data: sync, error: syncError } = await retry(() => 
      withTimeout(
        supabase
          .from("sincronizacion")
          .select("ultimo_nodo")
          .eq("id", 1)
          .single()
      )
    );

    if (syncError) {
      log.error("Error al leer tabla sincronización:", syncError.message);
      return;
    }

  const ultimoNodo = sync?.ultimo_nodo || null;
  log.info("Último nodo procesado:", ultimoNodo || "ninguno");
  log.debug("Datos de sincronización:", sync);

  // 2️⃣ Consultar los siguientes 300 registros desde Firebase (con timeout)
  const q = ultimoNodo
    ? query(ref(db, "datos"), orderByKey(), startAfter(ultimoNodo), limitToFirst(300))
    : query(ref(db, "datos"), orderByKey(), limitToFirst(300));

  const snapshot = await retry(() => withTimeout(get(q)));
  const nuevosDatos = snapshot.val();

  if (!nuevosDatos) {
    log.info("No hay datos nuevos para sincronizar");
    return;
  }

  const totalRegistros = Object.keys(nuevosDatos).length;
  log.info(`Encontrados ${totalRegistros} registros nuevos`);

  // 3️⃣ Mostrar cada registro raw y formateado
  const registrosFormateados = [];
  
  Object.entries(nuevosDatos).forEach(([nodo, valores], index) => {
    log.debug(`Procesando registro ${index + 1}/${totalRegistros}`, { nodo, valores });

    // Solo procesar registros con fecha
    if (!valores[6]) {
      log.debug(`Saltando nodo ${nodo}: sin fecha`);
      return;
    }

    // Formatear datos (cero es válido, null/undefined no)
    const registro = { nodo: nodo, fecha_hora: valores[6] };
    
    if (valores[0] !== null && valores[0] !== undefined && !isNaN(parseFloat(valores[0]))) {
      registro.temperatura = parseFloat(valores[0]);
    }
    if (valores[1] !== null && valores[1] !== undefined && !isNaN(parseFloat(valores[1]))) {
      registro.humedad = parseFloat(valores[1]);
    }
    if (valores[2] !== null && valores[2] !== undefined && !isNaN(parseFloat(valores[2]))) {
      registro.pm25 = parseFloat(valores[2]);
    }
    if (valores[3] !== null && valores[3] !== undefined && !isNaN(parseFloat(valores[3]))) {
      registro.pm10 = parseFloat(valores[3]);
    }
    if (valores[4] !== null && valores[4] !== undefined && !isNaN(parseFloat(valores[4]))) {
      registro.co = parseFloat(valores[4]);
    }
    if (valores[5] !== null && valores[5] !== undefined && !isNaN(parseFloat(valores[5]))) {
      registro.no2 = parseFloat(valores[5]);
    }

    log.debug("Registro formateado:", registro);
    registrosFormateados.push(registro);
  });

  if (registrosFormateados.length === 0) {
    log.info("No hay registros válidos con fecha para sincronizar");
    return;
  }

  const ultimoNodoNuevo = Object.keys(nuevosDatos).pop();
  const conFecha = registrosFormateados.filter(r => r.fecha_hora).length;
  const sinFecha = registrosFormateados.length - conFecha;
  
  log.info(`Preparando ${registrosFormateados.length} registros para subir`);
  log.debug("Detalles de operación:", {
    ultimoNodoActual: ultimoNodo,
    ultimoNodoNuevo: ultimoNodoNuevo,
    registrosConFecha: conFecha,
    registrosSinFecha: sinFecha
  });

    // Subir los registros a Supabase con verificación (con reintentos)
    const { data: inserted, error: insertError } = await retry(() =>
      withTimeout(
        supabase
          .from("lecturas")
          .upsert(registrosFormateados, { onConflict: 'nodo' })
          .select("nodo")
      )
    );

    if (insertError) {
      log.error("Error insertando registros:", insertError.message);
      return;
    }
    
    if (!inserted || inserted.length === 0) {
      log.error("No se insertaron registros");
      return;
    }
    
    log.success(`${inserted.length} registros guardados en tabla lecturas`);

    // Solo actualizar sincronización si hubo inserción exitosa
    const { error: syncUpdateError } = await retry(() =>
      withTimeout(
        supabase
          .from("sincronizacion")
          .update({ ultimo_nodo: ultimoNodoNuevo })
          .eq("id", 1)
      )
    );

    if (syncUpdateError) {
      log.error("Error actualizando sincronización:", syncUpdateError.message);
      return;
    }
    log.success("Sincronización actualizada:", ultimoNodoNuevo);

  } catch (error) {
    log.error("Error inesperado en sincronización:", error.message);
  }
}

// --- Ejecutar función en bucle indefinido ---
async function ejecutarSincronizacion() {
  const INTERVALO = 60000; // 1 minuto
  let contador = 0;
  
  log.info("Iniciando sincronización continua cada 1 minuto...");
  
  while (true) {
    contador++;
    log.info(`Ejecución #${contador}`);
    
    await leerSiguientes300Nodos();
    
    log.info(`Esperando ${INTERVALO/1000} segundos...`);
    await new Promise(resolve => setTimeout(resolve, INTERVALO));
  }
}

// ===== FUNCIONALIDAD AIRBEAM3 =====

// Configuración AirBeam3
const USUARIO_OBJETIVO = "Alejandro Piracoca Mayorga";
const SENSORES_A_VERIFICAR = [
    "AirBeam3-40915110766c",
    "AirBeam3-943cc67e9598", 
    "AirBeam3-1c9dc2f1a0f0",
    "AirBeam3-943cc67c5ab4",
    "AirBeam3-409151117128"
];
const TAMANO_LOTE_HORAS = 12;

// APIs AirCasting
const API_SESSIONS = "https://aircasting.org/api/v3/sessions";
const API_STREAMS = "https://aircasting.org/api/fixed/sessions/{session_id}/streams.json";
const API_MEASUREMENTS = "https://aircasting.org/api/v3/fixed_measurements";

// Mapeo sensores a tablas
const SENSOR_TABLES = {
    "AirBeam3-40915110766c": "airbeam3_1",
    "AirBeam3-943cc67e9598": "airbeam3_2",
    "AirBeam3-1c9dc2f1a0f0": "airbeam3_3",
    "AirBeam3-943cc67c5ab4": "airbeam3_4",
    "AirBeam3-409151117128": "airbeam3_5"
};

// Estado global AirBeam3
const estadoDescargaAirBeam = {};

// Funciones AirBeam3
async function verificarUsuarioSessionAirBeam(sessionId) {
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

async function obtenerUltimoTimestampDBAirBeam(sensorId) {
    const tabla = SENSOR_TABLES[sensorId];
    if (!tabla) return null;
    
    try {
        const { data, error } = await supabaseAirBeam
            .from(tabla)
            .select("timestamp")
            .order("timestamp", { ascending: false })
            .limit(1)
            .single();
        
        if (error) throw error;
        
        if (data && data.timestamp) {
            const ultimoTimestamp = new Date(data.timestamp);
            const ultimoTimestampMs = ultimoTimestamp.getTime();
            log.info(`Último dato AirBeam en DB: ${ultimoTimestamp.toISOString()}`);
            return ultimoTimestampMs;
        }
    } catch (error) {
        log.error("Error consultando último timestamp AirBeam:", error.message);
    }
    
    return null;
}

async function insertarDatosAirBeamDB(sensorId, datosLista) {
    const tabla = SENSOR_TABLES[sensorId];
    if (!tabla || !datosLista || datosLista.length === 0) return;
    
    const registros = datosLista.map(datos => {
        const valores = datos.values;
        return {
            session_name: datos.title,
            timestamp: datos.timestamp,
            latitude: datos.lat ? parseFloat(datos.lat) : 0,
            longitude: datos.lon ? parseFloat(datos.lon) : 0,
            pm1: valores[5] ? parseFloat(valores[5]) : null,
            temperature: valores[4] ? parseFloat(valores[4]) : null,
            pm25: valores[2] ? parseFloat(valores[2]) : null,
            pm10: valores[1] ? parseFloat(valores[1]) : null,
            humidity: valores[3] ? parseFloat(valores[3]) : null
        };
    });
    
    try {
        const batchSize = 1000;
        let totalInsertados = 0;
        
        for (let i = 0; i < registros.length; i += batchSize) {
            const batch = registros.slice(i, i + batchSize);
            const { error } = await retry(() =>
                withTimeout(
                    supabaseAirBeam.from(tabla).upsert(batch, { onConflict: 'timestamp' })
                )
            );
            
            if (error) throw error;
            
            totalInsertados += batch.length;
            log.info(`AirBeam insertados ${batch.length} registros (total: ${totalInsertados})`);
        }
        
        log.success(`${totalInsertados} registros AirBeam guardados en tabla ${tabla}`);
        
    } catch (error) {
        log.error("Error insertando AirBeam en DB:", error.message);
    }
}

async function descargarDatosAirBeam(sensorId, sessionData, streamsInfo) {
    const sessionId = sessionData.id;
    const title = (sessionData.title || 'SinTitulo').trim().replace(' ', '_');
    const startDatetime = sessionData.start_datetime;
    const endDatetime = sessionData.end_datetime;
    
    // Obtener coordenadas de la sesión
    let sessionLat = 0;
    let sessionLon = 0;
    try {
        const url = API_STREAMS.replace('{session_id}', sessionId);
        const response = await fetch(url);
        const streamsData = await response.json();
        sessionLat = parseFloat(streamsData.latitude) || 0;
        sessionLon = parseFloat(streamsData.longitude) || 0;
        log.info(`Coordenadas de sesión: ${sessionLat}, ${sessionLon}`);
    } catch (error) {
        log.error('Error obteniendo coordenadas de sesión:', error.message);
    }
    
    let currentStart;
    if (estadoDescargaAirBeam[sensorId]) {
        currentStart = estadoDescargaAirBeam[sensorId];
        log.info(`AirBeam continuando desde estado guardado: ${new Date(currentStart).toISOString()}`);
    } else {
        const ultimoTimestampMs = await obtenerUltimoTimestampDBAirBeam(sensorId);
        
        if (ultimoTimestampMs) {
            currentStart = ultimoTimestampMs + (60 * 1000);
            log.info(`AirBeam continuando descarga desde: ${new Date(currentStart).toISOString()}`);
        } else {
            currentStart = new Date(startDatetime).getTime();
            log.info(`AirBeam tabla nueva, descargando desde: ${new Date(currentStart).toISOString()}`);
        }
        
        estadoDescargaAirBeam[sensorId] = currentStart;
    }
    
    if (currentStart >= Date.now()) {
        log.info("AirBeam datos actualizados, no hay nuevos datos que descargar");
        delete estadoDescargaAirBeam[sensorId];
        return false;
    }
    
    const finalEnd = new Date(endDatetime).getTime();
    const loteMs = TAMANO_LOTE_HORAS * 60 * 60 * 1000;
    
    if (currentStart < finalEnd) {
        const currentEnd = Math.min(currentStart + loteMs, finalEnd);
        log.info(`[LOTE AIRBEAM] ${new Date(currentStart).toISOString()} - ${new Date(currentEnd).toISOString()}`);
        
        const medicionesPorTiempo = {};
        let datosEncontrados = false;
        
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
                            const tsStr = ts.toISOString();
                            
                            if (!medicionesPorTiempo[tsStr]) {
                                medicionesPorTiempo[tsStr] = { values: {} };
                            }
                            
                            medicionesPorTiempo[tsStr].values[i + 1] = value;
                        }
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                log.error(`Error AirBeam en ${sensorName}:`, error.message);
            }
        }
        
        if (!datosEncontrados && currentEnd < finalEnd) {
            log.info("AirBeam sin datos en este período, avanzando al siguiente lote");
            estadoDescargaAirBeam[sensorId] = currentEnd;
            return true;
        }
        
        // Subir datos inmediatamente si hay mediciones
        if (Object.keys(medicionesPorTiempo).length > 0) {
            const datosParaSubir = [];
            
            Object.entries(medicionesPorTiempo)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([tsStr, datos]) => {
                    if (Object.keys(datos.values).length > 0) {
                        datosParaSubir.push({
                            timestamp: tsStr,
                            title: title,
                            lat: sessionLat,
                            lon: sessionLon,
                            values: datos.values
                        });
                    }
                });
            
            if (datosParaSubir.length > 0) {
                await insertarDatosAirBeamDB(sensorId, datosParaSubir);
                log.info(`AirBeam subidos ${datosParaSubir.length} registros inmediatamente`);
            }
        }
        
        estadoDescargaAirBeam[sensorId] = currentEnd;
        const hayMas = currentEnd < finalEnd;
        
        if (!hayMas) {
            delete estadoDescargaAirBeam[sensorId];
        }
        
        return hayMas;
    }
    
    return false;
}

async function obtenerSesionesSensorAirBeam(sensorPackageName) {
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

async function procesarSensoresAirBeam() {
    log.info("Procesando sensores AirBeam3...");
    
    for (const sensor of SENSORES_A_VERIFICAR) {
        try {
            log.info(`[AIRBEAM SENSOR] ${sensor}`);
            
            const sesiones = await obtenerSesionesSensorAirBeam(sensor);
            if (sesiones.length === 0) continue;
            
            for (const sessionData of sesiones) {
                const sessionId = sessionData.id;
                
                if (await verificarUsuarioSessionAirBeam(sessionId)) {
                    const url = API_STREAMS.replace('{session_id}', sessionId);
                    const response = await fetch(url);
                    const streamsData = await response.json();
                    const streamsInfo = streamsData.streams || [];
                    
                    if (streamsInfo.length > 0) {
                        while (true) {
                            const hayMas = await descargarDatosAirBeam(sensor, sessionData, streamsInfo);
                            if (!hayMas) {
                                log.info(`AirBeam ${sensor} completado`);
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            log.error(`Error en sensor AirBeam ${sensor}:`, error.message);
        }
    }
}

// Función para Firebase (cada 2 minutos)
async function ejecutarSincronizacionFirebase() {
  const INTERVALO_FIREBASE = 120000; // 2 minutos
  let contador = 0;
  
  log.info("Iniciando sincronización Firebase cada 2 minutos...");
  
  while (true) {
    contador++;
    log.info(`Firebase #${contador}`);
    
    await leerSiguientes300Nodos();
    
    log.info(`Firebase esperando ${INTERVALO_FIREBASE/1000} segundos...`);
    await new Promise(resolve => setTimeout(resolve, INTERVALO_FIREBASE));
  }
}

// Función para AirBeam3 (cada 10 minutos)
async function ejecutarSincronizacionAirBeam() {
  const INTERVALO_AIRBEAM = 600000; // 10 minutos
  let contador = 0;
  
  log.info("Iniciando sincronización AirBeam3 cada 10 minutos...");
  
  while (true) {
    contador++;
    log.info(`AirBeam3 #${contador}`);
    
    await procesarSensoresAirBeam();
    
    log.info(`AirBeam3 esperando ${INTERVALO_AIRBEAM/1000} segundos...`);
    await new Promise(resolve => setTimeout(resolve, INTERVALO_AIRBEAM));
  }
}

// Ejecutar ambos procesos en paralelo
Promise.all([
  ejecutarSincronizacionFirebase(),
  ejecutarSincronizacionAirBeam()
]);