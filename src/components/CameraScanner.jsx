import { useEffect, useRef, useState } from "react";

/**
 * Escáner por cámara. Usa la API nativa BarcodeDetector cuando existe
 * (Android/Chrome) y, si no, carga ZXing de forma dinámica (iOS Safari y
 * navegadores sin soporte nativo).
 */
export default function CameraScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const stopRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;
    let stream = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        if ("BarcodeDetector" in window) {
          await runNativeDetector(video);
        } else {
          await runZxing(video);
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
    }

    async function runNativeDetector(video) {
      const wanted = [
        "ean_13", "ean_8", "upc_a", "upc_e",
        "code_128", "code_39", "code_93", "itf", "codabar",
      ];
      let detector;
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats?.();
        const formats = supported ? wanted.filter((f) => supported.includes(f)) : wanted;
        detector = new window.BarcodeDetector(formats.length ? { formats } : undefined);
      } catch {
        return runZxing(video); // sin soporte real, usamos el fallback
      }
      const tick = async () => {
        if (cancelled) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            finish(codes[0].rawValue);
            return;
          }
        } catch {
          /* frame ilegible, seguimos */
        }
        requestAnimationFrame(tick);
      };
      stopRef.current = () => { cancelled = true; };
      tick();
    }

    async function runZxing(video) {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (cancelled) return;
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoElement(video, (result) => {
        if (result) finish(result.getText());
      });
      stopRef.current = () => {
        cancelled = true;
        controls.stop();
      };
    }

    function finish(code) {
      if (cancelled) return;
      cancelled = true;
      stopRef.current();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      onDetected(String(code).trim());
    }

    start();

    return () => {
      cancelled = true;
      stopRef.current();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 600, color: "#1a1c2e" }}>Escanear con cámara</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error ? (
          <div style={s.error}>{error}</div>
        ) : (
          <div style={s.videoWrap}>
            <video ref={videoRef} style={s.video} muted playsInline />
            <div style={s.reticle} />
          </div>
        )}

        <p style={s.hint}>Centra el código de barras dentro del recuadro</p>
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
  reticle: {
    position: "absolute", left: "10%", right: "10%", top: "30%", bottom: "30%",
    border: "3px solid #69f0ae", borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
  },
  hint: { fontSize: 12, color: "#8a8fa8", textAlign: "center", margin: "12px 0 4px" },
  error: {
    padding: 20, background: "#ffebee", color: "#c62828", borderRadius: 12,
    fontSize: 13, textAlign: "center",
  },
};
