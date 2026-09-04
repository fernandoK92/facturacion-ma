// Almacén de productos.
//  - Si hay Supabase configurado (.env)  -> lee/escribe en la tabla `productos`.
//  - Si no                               -> usa localStorage (modo offline / pruebas).
//
// Las LECTURAS son síncronas y salen de una caché en memoria (para que el
// escaneo sea instantáneo). Las ESCRITURAS actualizan la caché de inmediato
// (optimista) y luego persisten en segundo plano.
//
// `actor` ({nombre, rol}) es opcional y viaja en upsertProduct/addStock para
// dejar registro de quién creó / modificó cada producto.

import { supabase, supabaseReady } from "./supabase";
import { registrarMovimiento } from "./movimientosStore";

// Deja registro de actividad (para admin/propietaria) sin romper la
// operación principal si el log falla (p. ej. falta correr la migración).
async function registrarActividad(mov) {
  try {
    await registrarMovimiento(mov);
  } catch (err) {
    console.debug("No se pudo registrar la actividad —", err.message);
  }
}

const STORAGE_KEY = "facturacion-ma:productos:v1";
const listeners = new Set();

/** barcode -> { barcode, nombre, precio, unidades, createdAt, updatedAt, creadoPorNombre, creadoPorRol, actualizadoPorNombre, actualizadoPorRol } */
let cache = {};

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function normalizeBarcode(code) {
  return String(code ?? "").trim();
}

// ---------- persistencia local ----------
function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("No se pudo guardar en localStorage", err);
  }
}

// ---------- mapeo fila Supabase <-> objeto app ----------
function rowToProduct(r) {
  return {
    barcode: r.barcode,
    nombre: r.nombre ?? "",
    precio: Number(r.precio) || 0,
    unidades: Number(r.unidades) || 0,
    categoria: r.categoria ?? "",
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
    updatedAt: r.updated_at ? Date.parse(r.updated_at) : Date.now(),
    creadoPorNombre: r.creado_por_nombre ?? "",
    creadoPorRol: r.creado_por_rol ?? "",
    actualizadoPorNombre: r.actualizado_por_nombre ?? "",
    actualizadoPorRol: r.actualizado_por_rol ?? "",
  };
}

/** Genera un código interno único para productos sin código de barras real (frutas, etc.). */
export function generarCodigoInterno(prefijo) {
  return `${prefijo}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// ---------- hidratación ----------
export async function hydrateProducts() {
  if (supabaseReady) {
    const { data, error } = await supabase.from("productos").select("*");
    if (error) {
      // Antes de iniciar sesión esto falla (acceso restringido): es esperado.
      console.debug("productos: no disponible aún —", error.message);
      return;
    }
    cache = Object.fromEntries(data.map((r) => [r.barcode, rowToProduct(r)]));
  } else {
    cache = readLocal();
  }
  emit();
}

// Carga inicial + sincronización en vivo entre dispositivos.
if (supabaseReady) {
  // Re-hidrata al iniciar sesión (INITIAL_SESSION / SIGNED_IN); limpia al salir.
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      cache = {};
      emit();
    } else {
      hydrateProducts();
    }
  });
  supabase
    .channel("productos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () =>
      hydrateProducts()
    )
    .subscribe();
} else {
  hydrateProducts();
}

// ---------- LECTURAS (síncronas, desde caché) ----------
export function getAllProducts() {
  return Object.values(cache).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function getProduct(barcode) {
  const key = normalizeBarcode(barcode);
  return key ? cache[key] ?? null : null;
}

export function getStats() {
  const items = getAllProducts();
  return {
    total: items.length,
    unidades: items.reduce((a, p) => a + p.unidades, 0),
    valor: items.reduce((a, p) => a + p.unidades * p.precio, 0),
    sinStock: items.filter((p) => p.unidades === 0).length,
  };
}

// ---------- ESCRITURAS (optimistas + persistencia async) ----------
/**
 * @param {{barcode:string,nombre:string,precio:number,unidades:number,categoria?:string}} data
 * @param {{nombre?:string, rol?:string}} [actor] quién hace el cambio (opcional)
 */
export async function upsertProduct({ barcode, nombre, precio, unidades, categoria }, actor) {
  const key = normalizeBarcode(barcode);
  if (!key) throw new Error("Código de barras vacío");

  const now = Date.now();
  const prev = cache[key];
  const esNuevo = !prev;
  const producto = {
    barcode: key,
    nombre: String(nombre ?? "").trim(),
    precio: Number(precio) || 0,
    unidades: Math.max(0, Math.round(Number(unidades) || 0)),
    categoria: categoria ?? prev?.categoria ?? "",
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    creadoPorNombre: esNuevo ? actor?.nombre ?? "" : prev?.creadoPorNombre ?? "",
    creadoPorRol: esNuevo ? actor?.rol ?? "" : prev?.creadoPorRol ?? "",
    actualizadoPorNombre: actor?.nombre ?? prev?.actualizadoPorNombre ?? "",
    actualizadoPorRol: actor?.rol ?? prev?.actualizadoPorRol ?? "",
  };
  cache[key] = producto;
  emit();

  if (supabaseReady) {
    const payload = {
      barcode: producto.barcode,
      nombre: producto.nombre,
      precio: producto.precio,
      unidades: producto.unidades,
      categoria: producto.categoria,
      updated_at: new Date(now).toISOString(),
      actualizado_por_nombre: producto.actualizadoPorNombre || null,
      actualizado_por_rol: producto.actualizadoPorRol || null,
    };
    if (esNuevo) {
      payload.creado_por_nombre = producto.creadoPorNombre || null;
      payload.creado_por_rol = producto.creadoPorRol || null;
    }
    const { error } = await supabase.from("productos").upsert(payload);
    if (error) {
      await hydrateProducts();
      throw new Error(error.message);
    }
  } else {
    writeLocal();
  }

  // Rastro de actividad: alta o edición, con quién y qué cambió.
  if (esNuevo) {
    await registrarActividad({
      barcode: producto.barcode,
      nombre: producto.nombre,
      tipo: "creacion",
      cantidad: producto.unidades,
      detalle: `Producto nuevo · precio $${producto.precio.toFixed(2)} · stock inicial ${producto.unidades} uds.`,
      usuarioId: actor?.id,
      usuarioNombre: actor?.nombre,
      usuarioRol: actor?.rol,
    });
  } else {
    const cambios = [];
    if (prev.nombre !== producto.nombre) {
      cambios.push(`Nombre: "${prev.nombre}" → "${producto.nombre}"`);
    }
    if (prev.precio !== producto.precio) {
      cambios.push(`Precio: $${prev.precio.toFixed(2)} → $${producto.precio.toFixed(2)}`);
    }
    if (prev.unidades !== producto.unidades) {
      cambios.push(`Unidades: ${prev.unidades} → ${producto.unidades}`);
    }
    if (cambios.length > 0) {
      await registrarActividad({
        barcode: producto.barcode,
        nombre: producto.nombre,
        tipo: "edicion",
        cantidad: 0,
        detalle: cambios.join(" · "),
        usuarioId: actor?.id,
        usuarioNombre: actor?.nombre,
        usuarioRol: actor?.rol,
      });
    }
  }

  return producto;
}

/**
 * @param {string} barcode
 * @param {number} delta
 * @param {{id?:string, nombre?:string, rol?:string}} [actor]
 * @param {string} [tipo] "ajuste" (default, p. ej. los botones −1/+1/+10) o
 *   "ingreso" (pantalla "Ingresar inventario") / "merma".
 * @param {boolean} [registrarLog] en false no deja movimiento propio —
 *   lo usa el checkout de Terminal POS, que ya deja UN registro "venta"
 *   con todo el detalle en vez de uno suelto por cada producto vendido.
 */
export async function addStock(barcode, delta, actor, tipo = "ajuste", registrarLog = true) {
  const key = normalizeBarcode(barcode);
  const prev = cache[key];
  if (!prev) throw new Error("El producto no existe");

  const d = Math.round(Number(delta) || 0);
  cache[key] = {
    ...prev,
    unidades: Math.max(0, prev.unidades + d),
    updatedAt: Date.now(),
    actualizadoPorNombre: actor?.nombre ?? prev.actualizadoPorNombre,
    actualizadoPorRol: actor?.rol ?? prev.actualizadoPorRol,
  };
  emit();

  if (supabaseReady) {
    const { error } = await supabase.rpc("add_stock", {
      p_barcode: key,
      p_delta: d,
      p_actor_nombre: actor?.nombre || null,
      p_actor_rol: actor?.rol || null,
    });
    if (error) {
      await hydrateProducts();
      throw new Error(error.message);
    }
  } else {
    writeLocal();
  }

  if (d !== 0 && registrarLog) {
    await registrarActividad({
      barcode: key,
      nombre: prev.nombre,
      tipo,
      cantidad: d,
      usuarioId: actor?.id,
      usuarioNombre: actor?.nombre,
      usuarioRol: actor?.rol,
    });
  }

  return cache[key];
}

export async function deleteProduct(barcode) {
  const key = normalizeBarcode(barcode);
  if (!cache[key]) return;
  delete cache[key];
  emit();

  if (supabaseReady) {
    const { error } = await supabase.from("productos").delete().eq("barcode", key);
    if (error) {
      await hydrateProducts();
      throw new Error(error.message);
    }
  } else {
    writeLocal();
  }
}
