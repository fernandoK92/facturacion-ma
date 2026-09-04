import { useEffect, useRef, useState } from "react";
import { leerCodigoTarjeta } from "../lib/ocr";

/**
 * Lee los dígitos IMPRESOS de una tarjeta (sin código de barras) con la
 * cámara, usando OCR (Tesseract.js) en vez de un lector de barras.
 * El usuario encuadra el texto y toca "Leer"; el resultado se entrega
 * como texto para que lo confirme/edite (el OCR no es 100% exacto).
 */
export default function CardScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [leyendo, setLeyendo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.name === "NotAllowedError"
              ? "Permiso de cámara denegado. Actívalo en el navegador."
              : "No se pudo abrir la cámara: " + (err?.message || err)
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capturar() {
    const video = videoRef.current;
    if (!video || leyendo) return;
    if (!video.videoWidth) {
      setError("La cámara todavía no está lista, espera un segundo.");
      return;
    }
    setLeyendo(true);
    setError("");
    try {
      // Recortamos la franja central (donde va el texto, según el recuadro
      // guía) y la agrandamos un poco: ayuda bastante a la precisión del OCR.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cropX = vw * 0.06;
      const cropY = vh * 0.38;
      const cropW = vw * 0.88;
      const cropH = vh * 0.24;
      const escala = 2.2;

      const canvas = document.createElement("canvas");
      canvas.width = cropW * escala;
      canvas.height = cropH * escala;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

      const texto = await leerCodigoTarjeta(canvas);
      if (!texto) {
        setError("No se pudo leer nada. Acerca más la tarjeta y evita reflejos.");
        setLeyendo(false);
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onDetected(texto);
    } catch (err) {
      setError("No se pudo leer la tarjeta: " + (err?.message || err));
      setLeyendo(false);
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

        <div style={s.videoWrap}>
          <video ref={videoRef} style={s.video} muted playsInline />
          <div style={s.strip} />
        </div>

        <p style={s.hint}>Alinea los dígitos impresos dentro de la franja</p>

        <button style={s.captureBtn} onClick={capturar} disabled={leyendo}>
          {leyendo ? "Leyendo…" : "📸 Leer tarjeta"}
        </button>
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
  videoWrap: {
    position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#000",
    borderRadius: 12, overflow: "hidden",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  strip: {
    position: "absolute", left: "6%", right: "6%", top: "38%", height: "24%",
    border: "3px solid #69f0ae", borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
  },
  hint: { fontSize: 12, color: "#8a8fa8", textAlign: "center", margin: "12px 0" },
  captureBtn: {
    width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, background: "#1a237e",
    color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
  },
  error: {
    padding: 12, background: "#ffebee", color: "#c62828", borderRadius: 10,
    fontSize: 13, textAlign: "center", marginBottom: 10,
  },
};
