/** Formatea un número como precio: 1.5 -> "$1.50" */
export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

/** Umbral para marcar "stock bajo". Ajustable cuando cada producto tenga su mínimo. */
export const UMBRAL_STOCK_BAJO = 5;

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
}

/**
 * Fecha + día de la semana + hora, en formato compacto para listas.
 * Ej: "Jue 04 sept · 15:32"
 */
export function fechaHoraCorta(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const dia = capitalizar(d.toLocaleDateString("es", { weekday: "short" }).replace(".", ""));
  const fecha = d.toLocaleDateString("es", { day: "2-digit", month: "short" });
  const hora = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return `${dia} ${fecha} · ${hora}`;
}

/**
 * Fecha + día de la semana + hora, en formato largo para detalle.
 * Ej: "Jueves, 4 de septiembre de 2026 · 15:32"
 */
export function fechaHoraLarga(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const dia = capitalizar(d.toLocaleDateString("es", { weekday: "long" }));
  const fecha = d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  const hora = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return `${dia}, ${fecha} · ${hora}`;
}
