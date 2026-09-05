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

// El código impreso de la tarjeta es letras seguidas de números (ej.
// "CURA0011600395"). Como el OCR corre sobre la foto entera (no hay un
// recorte que aísle solo esa franja), la imagen puede traer también el
// QR de la tarjeta — el whitelist ya evita símbolos, pero Tesseract
// puede igual "leer" el patrón del QR como letras/números sueltos.
// Este patrón separa un prefijo de letras de una tira de dígitos,
// para quedarnos solo con un tramo que tenga esa forma y descartar
// cualquier otro ruido (QR incluido).
//
// La tira de "dígitos" acepta también O/I/L: son las confusiones más
// comunes del OCR con 0/1 (letra O ~ cero, I/L ~ uno) — se normalizan
// después de hacer el match, así no se pierde una lectura válida por
// una sola letra mal reconocida en medio de los números.
const PATRON_CODIGO = /([A-Z]{2,6})([0-9OIL]{8,14})/;

function normalizarDigitos(seg) {
  return seg.replace(/O/g, "0").replace(/[IL]/g, "1");
}

function extraerCodigo(texto) {
  const limpio = texto.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const m = limpio.match(PATRON_CODIGO);
  return m ? m[1] + normalizarDigitos(m[2]) : "";
}

/**
 * Lee el texto de un canvas y devuelve solo el tramo con forma de
 * código de tarjeta (letras + números, ej. "CURA0011600395"); ignora
 * cualquier otro texto/ruido que haya en la foto (como un QR), y
 * corrige las confusiones O/0 e I·L/1 más comunes del OCR.
 */
export async function leerCodigoTarjeta(canvas) {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);
  const texto = data.text || "";

  // Probamos línea por línea primero: el OCR suele separar el código
  // impreso y el ruido del QR en bloques/líneas distintas, así que es
  // más difícil que se mezclen entre sí que si uniéramos todo el texto
  // de una.
  for (const linea of texto.split(/\r?\n/)) {
    const codigo = extraerCodigo(linea);
    if (codigo) return codigo;
  }

  // Respaldo: si el OCR no separó bien las líneas, probamos con todo
  // el texto junto.
  return extraerCodigo(texto);
}
