// Registro de ventas.
//  - Con Supabase configurado -> tabla `ventas`.
//  - Sin Supabase             -> localStorage.
// Mismo patrón que productStore: caché en memoria, lecturas síncronas,
// escrituras optimistas.

import { supabase, supabaseReady } from "./supabase";

const STORAGE_KEY = "facturacion-ma:ventas:v1";
const listeners = new Set();

/** Array de ventas { id, fecha(ms), total, metodoPago, cliente, items } */
let cache = [];

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeSales(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- local ----------
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
    console.error("No se pudo guardar la venta", err);
  }
}

// ---------- mapeo ----------
function rowToSale(r) {
  return {
    id: r.id,
    fecha: r.fecha ? Date.parse(r.fecha) : Date.now(),
    total: Number(r.total) || 0,
    metodoPago: r.metodo_pago ?? "Efectivo",
    cliente: r.cliente ?? {},
    items: Array.isArray(r.items) ? r.items : [],
    usuarioNombre: r.usuario_nombre ?? "",
    usuarioRol: r.usuario_rol ?? "",
  };
}
function saleToRow(v) {
  return {
    id: v.id,
    fecha: new Date(v.fecha).toISOString(),
    total: v.total,
    metodo_pago: v.metodoPago,
    cliente: v.cliente,
    items: v.items,
    usuario_id: v.usuarioId || null,
    usuario_nombre: v.usuarioNombre || null,
    usuario_rol: v.usuarioRol || null,
  };
}

// ---------- hidratación ----------
export async function hydrateSales() {
  if (supabaseReady) {
    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) {
      console.debug("ventas: no disponible aún —", error.message);
      return;
    }
    cache = data.map(rowToSale);
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
      hydrateSales();
    }
  });
  supabase
    .channel("ventas-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "ventas" }, () =>
      hydrateSales()
    )
    .subscribe();
} else {
  hydrateSales();
}

// ---------- lecturas ----------
export function getAllSales() {
  return [...cache].sort((a, b) => b.fecha - a.fecha);
}

export function getTodayStats() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const hoy = cache.filter((v) => v.fecha >= start.getTime());
  return {
    numVentas: hoy.length,
    totalVendido: hoy.reduce((a, v) => a + v.total, 0),
  };
}

// ---------- escritura ----------
/**
 * @param {{
 *   items: {barcode:string,nombre:string,precio:number,cantidad:number}[],
 *   total:number, metodoPago:string,
 *   cliente:{nombre?:string,documento?:string,telefono?:string},
 *   usuario?: {id?:string, nombre?:string, rol?:string},
 * }} venta
 */
export async function recordSale(venta) {
  const now = Date.now();
  const registro = {
    id: "V-" + now.toString(36).toUpperCase(),
    fecha: now,
    total: Number(venta.total) || 0,
    metodoPago: venta.metodoPago || "Efectivo",
    cliente: venta.cliente || {},
    items: (venta.items || []).map((i) => ({
      barcode: i.barcode,
      nombre: i.nombre,
      precio: Number(i.precio) || 0,
      cantidad: Math.max(1, Math.round(Number(i.cantidad) || 1)),
    })),
    usuarioId: venta.usuario?.id || null,
    usuarioNombre: venta.usuario?.nombre || "",
    usuarioRol: venta.usuario?.rol || "",
  };

  cache = [registro, ...cache];
  emit();

  if (supabaseReady) {
    const { error } = await supabase.from("ventas").insert(saleToRow(registro));
    if (error) {
      await hydrateSales();
      throw new Error(error.message);
    }
  } else {
    writeLocal();
  }
  return registro;
}
