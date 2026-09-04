// Movimientos de inventario (ingresos de stock).
//  - Con Supabase -> tabla `movimientos`.
//  - Sin Supabase -> localStorage.
// Mismo patrón que salesStore: caché en memoria, lecturas síncronas, escritura optimista.

import { supabase, supabaseReady } from "./supabase";

const STORAGE_KEY = "facturacion-ma:movimientos:v1";
const listeners = new Set();

/** { id, barcode, nombre, tipo, cantidad, usuarioNombre, fecha(ms) } */
let cache = [];

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeMovimientos(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("No se pudo guardar el movimiento", err);
  }
}

function rowToMov(r) {
  return {
    id: r.id,
    barcode: r.barcode,
    nombre: r.nombre ?? "",
    tipo: r.tipo ?? "ingreso",
    cantidad: Number(r.cantidad) || 0,
    usuarioNombre: r.usuario_nombre ?? "",
    fecha: r.fecha ? Date.parse(r.fecha) : Date.now(),
  };
}

export async function hydrateMovimientos() {
  if (supabaseReady) {
    const { data, error } = await supabase
      .from("movimientos")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(500);
    if (error) {
      console.debug("movimientos: no disponible aún —", error.message);
      return;
    }
    cache = data.map(rowToMov);
  } else {
    cache = readLocal();
  }
  emit();
}

if (supabaseReady) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      cache = [];
      emit();
    } else {
      hydrateMovimientos();
    }
  });
  supabase
    .channel("movimientos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "movimientos" }, () =>
      hydrateMovimientos()
    )
    .subscribe();
} else {
  hydrateMovimientos();
}

export function getMovimientos() {
  return [...cache].sort((a, b) => b.fecha - a.fecha);
}

/**
 * Registra un ingreso de inventario (no toca el stock: eso lo hace quien llama, con addStock).
 * @param {{barcode:string, nombre:string, cantidad:number, tipo?:string,
 *          usuarioId?:string, usuarioNombre?:string}} mov
 */
export async function registrarMovimiento(mov) {
  const now = Date.now();
  const registro = {
    id: "M-" + now.toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5),
    barcode: mov.barcode,
    nombre: mov.nombre ?? "",
    tipo: mov.tipo || "ingreso",
    cantidad: Math.round(Number(mov.cantidad) || 0),
    usuarioNombre: mov.usuarioNombre || "Sistema",
    fecha: now,
  };

  cache = [registro, ...cache];
  emit();

  if (supabaseReady) {
    const { error } = await supabase.from("movimientos").insert({
      barcode: registro.barcode,
      nombre: registro.nombre,
      tipo: registro.tipo,
      cantidad: registro.cantidad,
      usuario_id: mov.usuarioId ?? null,
      usuario_nombre: registro.usuarioNombre,
    });
    if (error) {
      await hydrateMovimientos();
      throw new Error(error.message);
    }
  } else {
    writeLocal();
  }
  return registro;
}
