// --- Dependencias ---
import { createClient } from "@supabase/supabase-js";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
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

// --- Función para subir el nodo actual de sincronización ---
async function subirNodoActual() {
  console.log("🔍 Leyendo nodo de sincronización y subiéndolo a lecturas...");

  // 1️⃣ Obtener el nodo actual de sincronización
  const { data: sync, error: syncError } = await supabase
    .from("sincronizacion")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (syncError) {
    console.error("❌ Error al leer sincronizacion:", syncError);
    return;
  }

  const nodoActual = sync?.ultimo_nodo;
  if (!nodoActual) {
    console.log("⚠️ No hay nodo en sincronización.");
    return;
  }

  console.log("📌 Nodo actual en sincronización:", nodoActual);

  // 2️⃣ Buscar ese nodo específico en Firebase
  const snapshot = await get(ref(db, `datos/${nodoActual}`));
  
  if (!snapshot.exists()) {
    console.log("❌ El nodo no existe en Firebase.");
    return;
  }

  const valores = snapshot.val();
  console.log("\n🔥 DATOS RAW DE FIREBASE:");
  console.log("   Nodo:", nodoActual);
  console.log("   Valores:", valores);

  // 3️⃣ Formatear datos para tabla lecturas
  const registro = {
    nodo: nodoActual,
    temperatura: isNaN(parseFloat(valores[0])) ? null : parseFloat(valores[0]),
    humedad: isNaN(parseFloat(valores[1])) ? null : parseFloat(valores[1]),
    pm25: isNaN(parseFloat(valores[2])) ? null : parseFloat(valores[2]),
    pm10: isNaN(parseFloat(valores[3])) ? null : parseFloat(valores[3]),
    co: isNaN(parseFloat(valores[4])) ? null : parseFloat(valores[4]),
    no2: isNaN(parseFloat(valores[5])) ? null : parseFloat(valores[5]),
    fecha_hora: valores[6] || null
  };

  console.log("\n📊 DATOS FORMATEADOS PARA TABLA LECTURAS:");
  console.log("   nodo:", registro.nodo);
  console.log("   temperatura:", registro.temperatura);
  console.log("   humedad:", registro.humedad);
  console.log("   pm25:", registro.pm25);
  console.log("   pm10:", registro.pm10);
  console.log("   co:", registro.co);
  console.log("   no2:", registro.no2);
  console.log("   fecha_hora:", registro.fecha_hora);

  // 4️⃣ Intentar insertar el nodo (fallará si ya existe debido a la restricción única)
  const { error } = await supabase
    .from("lecturas")
    .insert(registro);

  if (error) {
    console.error("❌ Error guardando en lecturas:", error);
    console.log("📋 Detalles del error:", error.message);
    console.log("🔍 Código del error:", error.code);
  } else {
    console.log("✅ Nodo guardado en tabla lecturas de Supabase");
  }
}

// --- Ejecutar función ---
await subirNodoActual();