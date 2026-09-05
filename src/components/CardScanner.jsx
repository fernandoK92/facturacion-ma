import { useRef, useState } from "react";
import { leerCodigoTarjeta } from "../lib/ocr";

// Si la foto viene enorme (cámaras de celular actuales: 3000-4000px de
// ancho) la reducimos antes de mandarla al OCR — Tesseract tarda mucho
// con imágenes gigantes y no hace falta tanto detalle.
const MAX_DIM = 1600;

/**
 * Lee los dígitos IMPRESOS de una tarjeta (sin código de barras) con la
 * cámara, usando OCR (Tesseract.js).
 *
 * Usa la app de cámara NATIVA del teléfono (<input type="file"
 * accept="image/*" capture="environment">) en vez de mostrar una vista
 * previa en vivo dentro de la página: los navegadores móviles casi no
 * exponen control de enfoque programable (probado con getCapabilities/
 * applyConstraints y con reintentos al tocar — no funcionaba en la
 * práctica), pero la app de cámara del propio teléfono SÍ enfoca bien
 * (autoenfoque real, tocar para enfocar, zoom, todo lo de siempre).
 *
 * Flujo en dos pasos: se toma la foto con la cámara nativa, se revisa
 * acá (puede repetirse si salió borrosa) y recién al confirmarla se
 * manda a leer.
 */
export default function CardScanner({ onDetected, onClose }) {
  const inputRef = useRef(null);
  const fotoCanvasRef = useRef(null);

  const [fase, setFase] = useState("camara"); // camara | revision | leyendo
  const [fotoUrl, setFotoUrl] = useState(null);
  const [error, setError] = useState("");

  function abrirCamara() {
    inputRef.current?.click();
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir/tomar la misma foto después
    if (!file) return;
    setError("");

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const max = Math.max(width, height);
      if (max > MAX_DIM) {
        const escala = MAX_DIM / max;
        width = Math.round(width * escala);
        height = Math.round(height * escala);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      fotoCanvasRef.current = canvas;
      setFotoUrl(canvas.toDataURL("image/jpeg", 0.9));
      setFase("revision");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("No se pudo abrir la foto. Probá de nuevo.");
    };
    img.src = url;
  }

  function repetirFoto() {
    setFotoUrl(null);
    fotoCanvasRef.current = null;
    setError("");
    setFase("camara");
  }

  async function usarFoto() {
    const canvas = fotoCanvasRef.current;
    if (!canvas) return;
    setFase("leyendo");
    setError("");
    try {
      const texto = await leerCodigoTarjeta(canvas);
      if (!texto) {
        setError("No se pudo leer nada. Repite la foto con más luz y acercando la tarjeta.");
        setFase("revision");
        return;
      }
      onDetected(texto);
    } catch (err) {
      setError("No se pudo leer la tarjeta: " + (err?.message || err));
      setFase("revision");
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 600, color: "#1a1c2e" }}>Leer tarjeta de bus</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {/* Oculto: dispara la cámara/galería nativa del dispositivo. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={onFileSelected}
        />

        {fase === "camara" && (
          <>
            <div style={s.previewPlaceholder}>
              <div style={{ fontSize: 34 }}>🪪</div>
              <p style={s.hint}>
                Se abre la cámara del teléfono: encuadrá y enfocá bien los
                dígitos antes de tomar la foto (tocá la pantalla para
                enfocar, como en cualquier foto).
              </p>
            </div>
            <button style={s.captureBtn} onClick={abrirCamara}>📷 Abrir cámara</button>
          </>
        )}

        {(fase === "revision" || fase === "leyendo") && (
          <div style={s.videoWrap}>
            <img src={fotoUrl} alt="Foto de la tarjeta" style={s.video} />
            {fase === "leyendo" && (
              <div style={s.leyendoOverlay}>
                <div style={s.spinner} />
                <span>Leyendo…</span>
              </div>
            )}
          </div>
        )}

        {fase === "revision" && (
          <>
            <p style={s.hint}>¿Se ven claros los dígitos de la tarjeta?</p>
            <div style={s.row}>
              <button style={s.retakeBtn} onClick={repetirFoto}>🔄 Repetir foto</button>
              <button style={s.captureBtnFlex} onClick={usarFoto}>✓ Usar esta foto</button>
            </div>
          </>
        )}

        {fase === "leyendo" && (
          <p style={s.hint}>Un momento, reconociendo el texto…</p>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,18,40,0.75)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000,
  },
  sheet: {
    background: "#fff", width: "100%", maxWidth: 480, borderRadius: "20px 20px 0 0",
    padding: 16, boxSizing: "border-box",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  closeBtn: {
    width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f4f5f9",
    fontSize: 15, cursor: "pointer", color: "#5a5e78",
  },
  previewPlaceholder: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    width: "100%", aspectRatio: "4 / 3", background: "#f4f5f9", borderRadius: 12,
    padding: "0 16px", boxSizing: "border-box", textAlign: "center",
  },
  videoWrap: {
    position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#000",
    borderRadius: 12, overflow: "hidden",
  },
  video: { width: "100%", height: "100%", objectFit: "contain" },
  leyendoOverlay: {
    position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", color: "#fff",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
    fontSize: 13, fontWeight: 600,
  },
  spinner: {
    width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.35)",
    borderTopColor: "#fff", animation: "cs-spin 0.8s linear infinite",
  },
  hint: { fontSize: 12, color: "#8a8fa8", textAlign: "center", margin: "12px 0" },
  captureBtn: {
    width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, background: "#1a237e",
    color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
  },
  captureBtnFlex: {
    flex: 1, padding: "14px", fontSize: 15, fontWeight: 700, background: "#2e7d32",
    color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
  },
  retakeBtn: {
    flex: "0 0 auto", padding: "14px 16px", fontSize: 14, fontWeight: 600, background: "#fff",
    color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 10, cursor: "pointer",
  },
  row: { display: "flex", gap: 8 },
  error: {
    padding: 12, background: "#ffebee", color: "#c62828", borderRadius: 10,
    fontSize: 13, textAlign: "center", marginBottom: 10,
  },
};

// Animación del spinner (se inyecta una sola vez).
if (typeof document !== "undefined" && !document.getElementById("cs-spin-style")) {
  const style = document.createElement("style");
  style.id = "cs-spin-style";
  style.textContent = "@keyframes cs-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}
