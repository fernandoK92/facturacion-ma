import { useSyncExternalStore } from "react";

/** Devuelve true si la media query coincide. Reactivo al cambiar el tamaño. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Atajo: pantallas angostas (teléfono). */
export function useIsMobile() {
  return useMediaQuery("(max-width: 720px)");
}
