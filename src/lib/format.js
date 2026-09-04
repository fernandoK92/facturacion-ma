/** Formatea un número como precio: 1.5 -> "$1.50" */
export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

/** Umbral para marcar "stock bajo". Ajustable cuando cada producto tenga su mínimo. */
export const UMBRAL_STOCK_BAJO = 5;
