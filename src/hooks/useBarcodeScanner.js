import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Detecta lectores de código de barras físicos (USB / Bluetooth).
 * Estos lectores se comportan como un teclado: "escriben" los dígitos muy
 * rápido y terminan con Enter. Distinguimos el escaneo de la escritura manual
 * midiendo el tiempo entre teclas.
 *
 * @param {(code: string) => void} onScan  Se llama con el código detectado.
 * @param {{ enabled?: boolean, minLength?: number, maxKeyDelay?: number }} opts
 */
export function useBarcodeScanner(onScan, opts = {}) {
  const { enabled = true, minLength = 3, maxKeyDelay = 40 } = opts;
  const onScanRef = useRef(onScan);
  useLayoutEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let lastTime = 0;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const gap = now - lastTime;
      lastTime = now;

      // Si pasó demasiado tiempo entre teclas, es escritura humana: reinicia.
      if (gap > maxKeyDelay) buffer = "";

      if (e.key === "Enter") {
        if (buffer.length >= minLength) {
          const code = buffer;
          buffer = "";
          e.preventDefault();
          onScanRef.current(code);
        } else {
          buffer = "";
        }
        return;
      }

      // Solo caracteres imprimibles de un carácter (dígitos, letras, símbolos).
      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, minLength, maxKeyDelay]);
}
