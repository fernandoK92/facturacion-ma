import { useSyncExternalStore } from "react";
import { subscribeSales, getAllSales, getTodayStats } from "../lib/salesStore";

let cachedList = getAllSales();
let cachedToday = getTodayStats();

subscribeSales(() => {
  cachedList = getAllSales();
  cachedToday = getTodayStats();
});

/** Lista reactiva de todas las ventas (más reciente primero). */
export function useSales() {
  return useSyncExternalStore(subscribeSales, () => cachedList);
}

/** Métricas reactivas de las ventas de hoy. */
export function useTodaySales() {
  return useSyncExternalStore(subscribeSales, () => cachedToday);
}
