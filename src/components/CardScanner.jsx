import { useEffect, useRef, useState } from "react";
import { leerCodigoTarjeta } from "../lib/ocr";

// Activa autoenfoque continuo si el dispositivo lo soporta (no todos los
// navegadores lo exponen — si no, sencillamente no hace nada).
function activarEnfoqueContinuo(track) {
  try {
    const modos = track?.getCapabilities?.()?.focusMode;
    if (modos?.includes("continuous")) {
      track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
    }
  } catch {
    // Cámara/navegador sin soporte de enfoque programable: nada que hacer.
  }
}

/**
 * Lee los dígitos IMPRESOS de una tarjeta (sin código de barras) con la
 * cámara, usando OCR (Tesseract.js). Flujo en dos pasos, como una cámara
 * normal: primero se TOMA LA FOTO (queda congelada para revisarla) y
 * recién al confirmarla se manda a leer — así se puede repetir la foto
 * si salió borrosa, antes de gastar tiempo intentando leerla.
 */
export default function CardScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const fotoCanvasRef = useRef(null);

  const [fase, setFase] = useState("camara"); // camara | revision | leyendo
  const [fotoUrl, setFotoUrl] = useState(null);
  const [error, setError] = useState("");
  const [puntoEnfoque, setPuntoEnfoque] = useState(null); // {x,y} en % para el anillo visual

  // Tocar la vista previa reintenta el enfoque en ese punto (como una
  // cámara de celular normal) — mejor esfuerzo: en equipos sin esta
  // capacidad no rompe nada, solo no hace efecto real además del visual.
  function enfocarEn(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPuntoEnfoque({ x, y });
    setTimeout(() => setPuntoEnfoque(null), 700);

    const track = trackRef.current;
    try {
      const cap = track?.getCapabilities?.();
      if (!cap) return;
      const avanzado = {};
      if (cap.focusMode?.includes("single-shot")) avanzado.focusMode = "single-shot";
      else if (cap.focusMode?.includes("continuous")) avanzado.focusMode = "continuous";
      if (cap.pointsOfInterest) {
        avanzado.pointsOfInterest = [{ x: x / 100, y: y / 100 }];
      }
      if (Object.keys(avanzado).length > 0) {
        track.applyConstraints({ advanced: [avanzado] }).catch(() => {});
      }
    } catch {
      // Mismo caso: sin soporte, el toque solo queda como feedback visual.
    }
  }

  // Se abre la cámara mientras estamos en la fase "camara"; al pasar a
  // "revision" (foto tomada) o "leyendo" se cierra sola. Volver a
  // "camara" (repetir foto) la vuelve a abrir.
  useEffect(() => {
    if (fase !== "camara") return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            // "ideal": el navegador se acerca lo que pueda, sin fallar
            // si el dispositivo no llega — ayuda a que el OCR tenga
            // más detalle para leer.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track ?? null;
        activarEnfoqueContinuo(track);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
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
      trackRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [fase]);

  function tomarFoto() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setError("La cámara todavía no está lista, espera un segundo.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    fotoCanvasRef.current = canvas;
    setFotoUrl(canvas.toDataURL("image/jpeg", 0.92));
    setError("");
    setFase("revision"); // el efecto de arriba cierra la cámara sola
  }

  function repetirFoto() {
    setFotoUrl(null);
    fotoCanvasRef.current = null;
    setError("");
    setFase("camara"); // el efecto de arriba vuelve a abrir la cámara
  }

  async function usarFoto() {
    const canvas = fotoCanvasRef.current;
    if (!canvas) return;
    setFase("leyendo");
    setError("");
    try {
      // Recortamos la franja donde va el texto (según la guía) y la
      // agrandamos: ayuda bastante a la precisión del OCR.
      const vw = canvas.width;
      const vh = canvas.height;
      const cropX = vw * 0.06;
      const cropY = vh * 0.38;
      const cropW = vw * 0.88;
      const cropH = vh * 0.24;
      const escala = 2.2;

      const recorte = document.createElement("canvas");
      recorte.width = cropW * escala;
      recorte.height = cropH * escala;
      recorte
        .getContext("2d")
        .drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, recorte.width, recorte.height);

      const texto = await leerCodigoTarjeta(recorte);
      if (!texto) {
        setError("No se pudo leer nada. Repite la foto acercando más la tarjeta.");
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

        <div style={s.videoWrap}>
          {fase === "camara" ? (
            <video
              ref={videoRef}
              style={s.video}
              muted
              playsInline
              onClick={enfocarEn}
            />
          ) : (
            <img src={fotoUrl} alt="Foto de la tarjeta" style={s.video} />
          )}
          <div style={s.strip} />
          {fase === "camara" && puntoEnfoque && (
            <div
              style={{
                ...s.focusRing,
                left: `${puntoEnfoque.x}%`,
                top: `${puntoEnfoque.y}%`,
              }}
            />
          )}
          {fase === "leyendo" && (
            <div style={s.leyendoOverlay}>
              <div style={s.spinner} />
              <span>Leyendo…</span>
            </div>
          )}
        </div>

        {fase === "camara" && (
          <>
            <p style={s.hint}>
              Encuadra los dígitos dentro de la franja · toca la imagen para enfocar antes de tomar la foto
            </p>
            <button style={s.captureBtn} onClick={tomarFoto}>📸 Tomar foto</button>
          </>
        )}

        {fase === "revision" && (
          <>
            <p style={s.hint}>¿Se ve nítida la franja con el código?</p>
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
  videoWrap: {
    position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#000",
    borderRadius: 12, overflow: "hidden",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  strip: {
    position: "absolute", left: "6%", right: "6%", top: "38%", height: "24%",
    border: "3px solid #69f0ae", borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
    pointerEvents: "none",
  },
  focusRing: {
    position: "absolute", width: 56, height: 56, marginLeft: -28, marginTop: -28,
    border: "2px solid #fff", borderRadius: "50%",
    boxShadow: "0 0 0 2px rgba(0,0,0,0.3)",
    pointerEvents: "none", animation: "cs-focus 0.7s ease-out forwards",
  },
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

// Animación del spinner y del anillo de enfoque (se inyecta una sola vez).
if (typeof document !== "undefined" && !document.getElementById("cs-spin-style")) {
  const style = document.createElement("style");
  style.id = "cs-spin-style";
  style.textContent = `
    @keyframes cs-spin { to { transform: rotate(360deg); } }
    @keyframes cs-focus {
      0% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
