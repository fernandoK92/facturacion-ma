import { useState } from "react";
import CameraScanner from "./CameraScanner";

/**
 * Modal para recargar una tarjeta de bus: escanea el código impreso en la
 * tarjeta (con cámara, como cualquier código de barras — ej. CURA0011600395)
 * y luego pide cuánto se recargó.
 */
export default function BusModal({ onAdd, onClose }) {
  const [codigo, setCodigo] = useState("");
  const [manual, setManual] = useState("");
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");

  function detectado(code) {
    setCodigo(String(code).trim().toUpperCase());
    setCamaraAbierta(false);
  }

  function usarManual(e) {
    e.preventDefault();
    if (manual.trim()) setCodigo(manual.trim().toUpperCase());
  }

  function submit(e) {
    e.preventDefault();
    if (!(Number(monto) > 0)) {
      setError("Escribe cuánto se recargó.");
      return;
    }
    onAdd({
      nombre: `Recarga bus · ${codigo}`,
      precio: Number(monto),
      tipo: "bus",
    });
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 700, color: "#1a1c2e" }}>🚌 Recarga de bus</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!codigo ? (
          <>
            <div style={s.scanHero}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🪪</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1c2e" }}>
                Escanea la tarjeta de bus
              </div>
              <div style={{ fontSize: 12, color: "#8a8fa8", marginTop: 2 }}>
                Se lee igual que un código de barras (ej. CURA0011600395)
              </div>
            </div>

            <button style={s.camBtn} onClick={() => setCamaraAbierta(true)}>
              📷 Escanear con cámara
            </button>

            <form onSubmit={usarManual} style={s.manualRow}>
              <input
                style={s.input}
                placeholder="…o escribe el código a mano"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button type="submit" style={s.manualBtn}>Usar</button>
            </form>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={s.codeChip}>
              {codigo}
              <button type="button" style={s.changeBtn} onClick={() => setCodigo("")}>Cambiar</button>
            </div>
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
        <CameraScanner onDetected={detectado} onClose={() => setCamaraAbierta(false)} />
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
    marginBottom: 10,
  },
  manualRow: { display: "flex", gap: 8 },
  manualBtn: {
    padding: "0 16px", fontSize: 13, fontWeight: 600, background: "#f4f5f9",
    color: "#1a237e", border: "0.5px solid #e8eaf0", borderRadius: 9, cursor: "pointer",
  },
  input: {
    flex: 1, minWidth: 0, padding: "12px 13px", fontSize: 14, border: "0.5px solid #d0d3e0", borderRadius: 9,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box",
  },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  lbl: { fontSize: 12, fontWeight: 600, color: "#5a5e78" },
  codeChip: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#1a237e",
    background: "#eef0fb", borderRadius: 9, padding: "10px 12px",
  },
  changeBtn: {
    fontSize: 11, fontWeight: 600, color: "#5a5e78", background: "#fff",
    border: "0.5px solid #e8eaf0", borderRadius: 7, padding: "4px 8px", cursor: "pointer",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
  },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "8px 10px", borderRadius: 8 },
  addBtn: {
    padding: "14px", fontSize: 15, fontWeight: 700, background: "#2e7d32", color: "#fff",
    border: "none", borderRadius: 10, cursor: "pointer",
  },
};
