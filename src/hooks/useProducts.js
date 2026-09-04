import { useSyncExternalStore } from "react";
import { subscribe, getAllProducts, getStats } from "../lib/productStore";

// Cache para que useSyncExternalStore reciba la misma referencia mientras no cambie nada.
let cachedList = getAllProducts();
let cachedStats = getStats();

subscribe(() => {
  cachedList = getAllProducts();
  cachedStats = getStats();
});

/** Lista reactiva de todos los productos. */
export function useProducts() {
  return useSyncExternalStore(subscribe, () => cachedList);
}

/** Estadísticas reactivas del inventario. */
export function useProductStats() {
  return useSyncExternalStore(subscribe, () => cachedStats);
}
