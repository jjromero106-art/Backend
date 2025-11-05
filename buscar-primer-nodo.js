// --- Dependencias ---
import { createClient } from "@supabase/supabase-js";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  query,
  orderByKey,
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

// --- Función para buscar el primer nodo con fecha ---
async function buscarPrimerNodoConFecha() {
  console.log("🔍 Buscando el primer nodo con fecha en Firebase...");

  let encontrado = false;
  let lote = 0;
  let ultimoNodo = null;

  while (!encontrado) {
    lote++;
    console.log(`\n📦 Revisando lote ${lote}...`);

    // Consultar lote de 100 registros
    const q = ultimoNodo
      ? query(ref(db, "datos"), orderByKey(), startAfter(ultimoNodo), limitToFirst(100))
      : query(ref(db, "datos"), orderByKey(), limitToFirst(100));

    const snapshot = await get(q);
    const datos = snapshot.val();

    if (!datos) {
      console.log("❌ No hay más datos en Firebase.");
      break;
    }

    // Buscar el primer registro con fecha
    for (const [nodo, valores] of Object.entries(datos)) {
      ultimoNodo = nodo; // Actualizar para el siguiente lote

      if (valores[6]) {
        console.log("\n🎯 ¡PRIMER NODO CON FECHA ENCONTRADO!");
        console.log("   Nodo:", nodo);
        console.log("   Fecha:", valores[6]);
        console.log("   Datos completos:", valores);
        
        // Formatear datos para tabla lecturas
        const registro = {
          nodo: nodo,
          temperatura: isNaN(parseFloat(valores[0])) ? null : parseFloat(valores[0]),
          humedad: isNaN(parseFloat(valores[1])) ? null : parseFloat(valores[1]),
          pm25: isNaN(parseFloat(valores[2])) ? null : parseFloat(valores[2]),
          pm10: isNaN(parseFloat(valores[3])) ? null : parseFloat(valores[3]),
          co: isNaN(parseFloat(valores[4])) ? null : parseFloat(valores[4]),
          no2: isNaN(parseFloat(valores[5])) ? null : parseFloat(valores[5]),
          fecha_hora: valores[6]
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
        console.log("\n💡 Para subirlo a Supabase, descomenta las líneas de inserción.");

        // DESCOMENTA ESTAS LÍNEAS PARA SUBIR A LECTURAS:
        const { error } = await supabase
          .from("lecturas")
          .upsert(registro, { onConflict: 'nodo' });
      
         if (error) {
         console.error("❌ Error guardando en lecturas:", error);
        } else {
          console.log("✅ Primer nodo guardado en tabla lecturas de Supabase");
         }
    
        
        const { error: syncError } = await supabase
        .from("sincronizacion")
        .upsert({
        id: 1,
         ultimo_nodo: nodo
         });
        
         if (syncError) {
          console.error("❌ Error actualizando sincronizacion:", syncError);
        } else {
         console.log("✅ Tabla sincronizacion actualizada");
         }

        encontrado = true;
        break;
      }
    }

    if (!encontrado) {
      console.log(`   Revisados ${Object.keys(datos).length} registros sin fecha...`);
    }
  }

  if (!encontrado) {
    console.log("⚠️ No se encontró ningún nodo con fecha en Firebase.");
  }
}

// --- Ejecutar búsqueda ---
await buscarPrimerNodoConFecha();