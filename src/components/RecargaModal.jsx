import { useState } from "react";

const OPERADORAS = ["Claro", "Movistar", "CNT", "Otra"];

/** Modal para agregar una recarga de celular a la venta. */
export default function RecargaModal({ onAdd, onClose }) {
  const [operadora, setOperadora] = useState("Claro");
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!numero.trim()) {
      setError("Escribe el número al que se hizo la recarga.");
      return;
    }
    if (!(Number(monto) > 0)) {
      setError("Escribe cuánto se cobró.");
      return;
    }
    onAdd({
      nombre: `Recarga ${operadora} · ${numero.trim()}`,
      precio: Number(monto),
      tipo: "recarga",
    });
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 700, color: "#1a1c2e" }}>📱 Recarga de celular</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={s.lbl}>Operadora</div>
            <div style={s.chips}>
              {OPERADORAS.map((op) => (
                <button
                  type="button"
                  key={op}
                  style={{ ...s.chip, ...(operadora === op ? s.chipOn : null) }}
                  onClick={() => setOperadora(op)}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          <label style={s.field}>
            <span style={s.lbl}>Número de celular</span>
            <input
              style={s.input}
              inputMode="tel"
              placeholder="09XXXXXXXX"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              autoFocus
            />
          </label>

          <label style={s.field}>
            <span style={s.lbl}>Cuánto se cobró</span>
            <input
              style={s.input}
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </label>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" style={s.addBtn}>Agregar a la venta</button>
        </form>
      </div>
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
  field: { display: "flex", flexDirection: "column", gap: 5 },
  lbl: { fontSize: 12, fontWeight: 600, color: "#5a5e78", marginBottom: 6 },
  input: {
    padding: "13px 14px", fontSize: 16, border: "0.5px solid #d0d3e0", borderRadius: 10,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    padding: "9px 14px", fontSize: 13, fontWeight: 600, background: "#f4f5f9", color: "#5a5e78",
    border: "0.5px solid #e8eaf0", borderRadius: 999, cursor: "pointer",
  },
  chipOn: { background: "#1a237e", color: "#fff", borderColor: "#1a237e" },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "8px 10px", borderRadius: 8 },
  addBtn: {
    padding: "14px", fontSize: 15, fontWeight: 700, background: "#2e7d32", color: "#fff",
    border: "none", borderRadius: 10, cursor: "pointer",
  },
};
