// --- Dependencias ---
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
  apiKey: "AIzaSyAZQOd4EQHqMSaheCmmw8f7V5U4Il0biE0",
  authDomain: "acueducto-561a1.firebaseapp.com",
  databaseURL: "https://acueducto-561a1-default-rtdb.firebaseio.com",
  projectId: "acueducto-561a1",
  storageBucket: "acueducto-561a1.firebasestorage.app",
  messagingSenderId: "582426682908",
  appId: "1:582426682908:web:0e652d1412fa12f7dee1d9",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// --- Configuración Supabase ---
const SUPABASE_URL = "https://lfagowoxxqmfhjzvkngv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYWdvd294eHFtZmhqenZrbmd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM4ODEzNSwiZXhwIjoyMDc1OTY0MTM1fQ.O8_WEvNt3KpuKJxehxwFJWxSsvO-kL-HORku-3cnEps";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Función de debug ---
async function debugSincronizacion() {
  console.log("🔍 DEBUG: Revisando datos antes de sincronizar...");

  // 1️⃣ Obtener el último nodo procesado de Supabase
  const { data: sync, error: syncError } = await supabase
    .from("sincronizacion")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (syncError) {
    console.error("Error al leer sincronizacion:", syncError);
    return;
  }

  const ultimoNodo = sync?.ultimo_nodo || null;
  console.log("📌 Último nodo procesado en Supabase:", ultimoNodo ?? "ninguno");
  console.log("📋 Datos completos de sincronización:", sync);

  // 2️⃣ Consultar el siguiente lote desde Firebase
  const q = ultimoNodo
    ? query(ref(db, "datos"), orderByKey(), startAfter(ultimoNodo), limitToFirst(5))
    : query(ref(db, "datos"), orderByKey(), limitToFirst(5));

  const snapshot = await get(q);
  const nuevosDatos = snapshot.val();

  if (!nuevosDatos) {
    console.log("✅ No hay datos nuevos para sincronizar.");
    return;
  }

  // 🔍 Mostrar el último dato de Firebase y cómo se mapea
  const ultimoDatoKey = Object.keys(nuevosDatos).pop();
  const ultimoDatoVal = nuevosDatos[ultimoDatoKey];
  console.log("\n🔥 ÚLTIMO DATO DE FIREBASE:");
  console.log("   Nodo:", ultimoDatoKey);
  console.log("   Datos raw:", ultimoDatoVal);
  console.log("   Claves disponibles:", Object.keys(ultimoDatoVal));
  console.log("   Tipo de dato:", typeof ultimoDatoVal);
  console.log("\n📊 MAPEO PARA SUPABASE:");
  console.log("   nodo:", ultimoDatoKey);
  console.log("   temperatura:", ultimoDatoVal[0]);
  console.log("   humedad:", ultimoDatoVal[1]);
  console.log("   pm25:", ultimoDatoVal[2]);
  console.log("   pm10:", ultimoDatoVal[3]);
  console.log("   co:", ultimoDatoVal[4]);
  console.log("   no2:", ultimoDatoVal[5]);
  console.log("   fecha_hora:", ultimoDatoVal[6]);
  console.log("");

  // 3️⃣ Mostrar todos los registros que se procesarían
  const registros = Object.entries(nuevosDatos).map(([key, val]) => ({
    nodo: key,
    temperatura: val[0] ?? null,
    humedad: val[1] ?? null,
    pm25: val[2] ?? null,
    pm10: val[3] ?? null,
    co: val[4] ?? null,
    no2: val[5] ?? null,
    fecha_hora: val[6] ?? new Date().toISOString(),
    tiene_fecha: !!val[6],
  }));

  console.log("📦 REGISTROS QUE SE SUBIRÍAN A SUPABASE:");
  registros.forEach((reg, i) => {
    const fechaInfo = reg.tiene_fecha ? `✅ ${reg.fecha_hora}` : `⚠️ SIN FECHA (usará timestamp actual)`;
    console.log(`   ${i + 1}. ${reg.nodo} -> Temp: ${reg.temperatura}°C, Fecha: ${fechaInfo}`);
  });

  const conFecha = registros.filter(r => r.tiene_fecha).length;
  const sinFecha = registros.length - conFecha;
  console.log(`\n📊 Resumen: ${conFecha} con fecha original, ${sinFecha} sin fecha (usarán timestamp actual)`);

  console.log(`\n⏳ Total: ${registros.length} registros listos para subir`);
  if (sinFecha > 0) {
    console.log(`⚠️  ADVERTENCIA: ${sinFecha} registros no tienen fecha original y usarán timestamp actual`);
  }
  console.log("💡 Para ejecutar la sincronización real, usa: node index.js");
}

// --- Ejecutar debug ---
await debugSincronizacion();