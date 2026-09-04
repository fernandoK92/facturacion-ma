// Lectura de texto impreso (OCR) para tarjetas sin código de barras,
// como las de recarga de bus. Usa Tesseract.js, cargado dinámicamente
// (no engorda el bundle principal) y con un worker reutilizado entre
// lecturas para que solo la primera tarde unos segundos.

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Lee el texto (letras/números) de un canvas y devuelve el código
 * "limpio" (solo A-Z y 0-9, en mayúsculas).
 */
export async function leerCodigoTarjeta(canvas) {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);
  return (data.text || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
