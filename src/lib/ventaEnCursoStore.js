// Guarda en localStorage la venta que se está armando en Ventas
// (carrito, cliente, método de pago), para que sobreviva si se recarga
// la página o se navega a otra pantalla sin querer, antes de cobrar.
// Es solo un "borrador" del navegador — no tiene nada que ver con el
// registro final de la venta (eso lo hace salesStore al cobrar).

const KEY = "facturacion-ma:venta-en-curso:v1";

export function leerVentaEnCurso() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function guardarVentaEnCurso(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno o no disponible: no es crítico, se pierde el borrador.
  }
}

export function borrarVentaEnCurso() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
