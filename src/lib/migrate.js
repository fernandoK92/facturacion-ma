// Sube a Supabase los datos que quedaron guardados en localStorage
// (de cuando la app funcionaba sin base de datos).

import { supabase, supabaseReady } from "./supabase";
import { hydrateProducts } from "./productStore";
import { hydrateSales } from "./salesStore";

const K_PROD = "facturacion-ma:productos:v1";
const K_VENTAS = "facturacion-ma:ventas:v1";

function leerLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** ¿Hay datos locales pendientes de subir? */
export function hayDatosLocales() {
  const prod = Object.keys(leerLocal(K_PROD, {})).length;
  const ventas = leerLocal(K_VENTAS, []).length;
  return prod + ventas > 0;
}

/**
 * Sube productos y ventas locales a Supabase (upsert, no duplica).
 * Devuelve { productos, ventas } con las cantidades subidas.
 */
export async function subirDatosLocales() {
  if (!supabaseReady) throw new Error("Supabase no está configurado");

  const productos = Object.values(leerLocal(K_PROD, {})).map((p) => ({
    barcode: String(p.barcode),
    nombre: p.nombre ?? "",
    precio: Number(p.precio) || 0,
    unidades: Math.max(0, Math.round(Number(p.unidades) || 0)),
    updated_at: new Date(p.updatedAt || Date.now()).toISOString(),
  }));

  const ventas = leerLocal(K_VENTAS, []).map((v) => ({
    id: v.id,
    fecha: new Date(v.fecha || Date.now()).toISOString(),
    total: Number(v.total) || 0,
    metodo_pago: v.metodoPago || "Efectivo",
    cliente: v.cliente || {},
    items: v.items || [],
  }));

  if (productos.length) {
    const { error } = await supabase.from("productos").upsert(productos);
    if (error) throw new Error("Productos: " + error.message);
  }
  if (ventas.length) {
    const { error } = await supabase.from("ventas").upsert(ventas);
    if (error) throw new Error("Ventas: " + error.message);
  }

  // Marcamos como migrado para no volver a ofrecerlo, y refrescamos la app.
  localStorage.setItem(K_PROD + ":migrado", "1");
  localStorage.setItem(K_VENTAS + ":migrado", "1");
  localStorage.removeItem(K_PROD);
  localStorage.removeItem(K_VENTAS);
  await Promise.all([hydrateProducts(), hydrateSales()]);

  return { productos: productos.length, ventas: ventas.length };
}
