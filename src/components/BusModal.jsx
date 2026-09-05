import { useState } from "react";
import CapturaFoto from "./CapturaFoto";

/**
 * Modal para recargar una tarjeta de bus. Se toma una foto de la
 * tarjeta como evidencia (no se lee ni procesa nada de ella) y se
 * pone cuánto se recargó — la foto queda guardada junto con la venta
 * por si hace falta revisarla después.
 */
export default function BusModal({ onAdd, onClose }) {
  const [paso, setPaso] = useState("foto"); // foto | monto
  const [foto, setFoto] = useState(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");

  function fotoTomada(dataUrl) {
    setFoto(dataUrl);
    setCamaraAbierta(false);
    setPaso("monto");
    setError("");
  }

  function submit(e) {
    e.preventDefault();
    if (!(Number(monto) > 0)) {
      setError("Escribe cuánto se recargó.");
      return;
    }
    onAdd({
      nombre: "Recarga bus",
      precio: Number(monto),
      tipo: "bus",
      foto,
    });
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 700, color: "#1a1c2e" }}>🚌 Recarga de bus</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {paso === "foto" && (
          <>
            <div style={s.scanHero}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🪪</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1c2e" }}>
                Sacale una foto a la tarjeta
              </div>
              <div style={{ fontSize: 12, color: "#8a8fa8", marginTop: 2 }}>
                Queda como evidencia de que se recargó esta tarjeta
              </div>
            </div>

            <button style={s.camBtn} onClick={() => setCamaraAbierta(true)}>
              📷 Tomar foto de la tarjeta
            </button>
          </>
        )}

        {paso === "monto" && (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {foto && (
              <div style={s.fotoPreviewWrap}>
                <img src={foto} alt="Foto de la tarjeta" style={s.fotoPreview} />
                <button
                  type="button"
                  style={s.cambiarFotoBtn}
                  onClick={() => setCamaraAbierta(true)}
                >
                  🔄 Cambiar foto
                </button>
              </div>
            )}
            <label style={s.field}>
              <span style={s.lbl}>Cuánto se recargó</span>
              <input
                style={s.input}
                inputMode="decimal"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
              />
            </label>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" style={s.addBtn}>Agregar a la venta</button>
          </form>
        )}
      </div>

      {camaraAbierta && (
        <CapturaFoto
          titulo="Foto de la tarjeta"
          onCapturada={fotoTomada}
          onClose={() => setCamaraAbierta(false)}
        />
      )}
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,18,40,0.6)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000,
  },
  sheet: {
    background: "#fff", width: "100%", maxWidth: 420, borderRadius: "20px 20px 0 0",
    padding: 16, boxSizing: "border-box",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  closeBtn: {
    width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f4f5f9",
    fontSize: 15, cursor: "pointer", color: "#5a5e78",
  },
  scanHero: {
    textAlign: "center", padding: "18px 0 20px",
    border: "2px dashed #d0d3e0", borderRadius: 12, marginBottom: 12,
  },
  camBtn: {
    width: "100%", padding: "13px", fontSize: 14, fontWeight: 600, background: "#eef0fb",
    color: "#1a237e", border: "0.5px solid #d7dbf5", borderRadius: 10, cursor: "pointer",
  },
  fotoPreviewWrap: { position: "relative", borderRadius: 12, overflow: "hidden" },
  fotoPreview: { width: "100%", maxHeight: 220, objectFit: "cover", display: "block" },
  cambiarFotoBtn: {
    position: "absolute", right: 8, bottom: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600,
    background: "rgba(26,28,46,0.75)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
  },
  input: {
    padding: "13px 14px", fontSize: 16, border: "0.5px solid #d0d3e0", borderRadius: 9,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  lbl: { fontSize: 12, fontWeight: 600, color: "#5a5e78" },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "8px 10px", borderRadius: 8 },
  addBtn: {
    width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, background: "#2e7d32", color: "#fff",
    border: "none", borderRadius: 10, cursor: "pointer",
  },
};
