import { useRef, useState } from "react";

// La foto es solo evidencia (no se procesa ni se lee nada de ella), así
// que alcanza con guardarla bien liviana.
const MAX_DIM = 900;
const CALIDAD_JPEG = 0.75;

/**
 * Toma una foto con la cámara NATIVA del teléfono (<input type="file"
 * accept="image/*" capture="environment">) para usarla como evidencia
 * — por ejemplo, la tarjeta de bus que se recargó. No lee ni procesa
 * nada de la imagen, solo la deja lista (achicada y comprimida) y la
 * entrega en `onCapturada(dataUrl)` cuando el usuario la confirma.
 */
export default function CapturaFoto({ titulo = "Tomar foto", onCapturada, onClose }) {
  const inputRef = useRef(null);
  const [fase, setFase] = useState("camara"); // camara | revision
  const [fotoUrl, setFotoUrl] = useState(null);
  const [error, setError] = useState("");

  function abrirCamara() {
    inputRef.current?.click();
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      setFotoUrl(canvas.toDataURL("image/jpeg", CALIDAD_JPEG));
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
    setError("");
    setFase("camara");
  }

  function usarFoto() {
    if (!fotoUrl) return;
    onCapturada(fotoUrl);
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 600, color: "#1a1c2e" }}>{titulo}</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={onFileSelected}
        />

        {fase === "camara" ? (
          <>
            <div style={s.previewPlaceholder}>
              <div style={{ fontSize: 34 }}>🪪</div>
              <p style={s.hint}>Se abre la cámara del teléfono para tomar la foto</p>
            </div>
            <button style={s.captureBtn} onClick={abrirCamara}>📷 Abrir cámara</button>
          </>
        ) : (
          <>
            <div style={s.videoWrap}>
              <img src={fotoUrl} alt="Foto tomada" style={s.video} />
            </div>
            <p style={s.hint}>¿Se ve bien la foto?</p>
            <div style={s.row}>
              <button style={s.retakeBtn} onClick={repetirFoto}>🔄 Repetir foto</button>
              <button style={s.captureBtnFlex} onClick={usarFoto}>✓ Usar esta foto</button>
            </div>
          </>
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
