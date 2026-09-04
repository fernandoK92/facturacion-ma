import { useSyncExternalStore } from "react";
import { subscribeMovimientos, getMovimientos } from "../lib/movimientosStore";

let cache = getMovimientos();
subscribeMovimientos(() => {
  cache = getMovimientos();
});

export function useMovimientos() {
  return useSyncExternalStore(subscribeMovimientos, () => cache);
}
