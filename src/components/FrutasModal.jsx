import { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { upsertProduct, generarCodigoInterno } from "../lib/productStore";
import { useAuth } from "../context/AuthContext";
import { money } from "../lib/format";

const CATEGORIA = "fruta";
const EMPTY_FORM = { nombre: "", precio: "", unidades: "" };

/**
 * Modal para vender productos sin código de barras (frutas, verduras…).
 * Se apoya en productStore igual que un producto normal, solo que con
 * `categoria: "fruta"` y un código interno generado (no un barcode real).
 */
export default function FrutasModal({ onAdd, onClose }) {
  const { nombre, rol } = useAuth();
  const actor = { nombre: nombre || "Sistema", rol };

  const productos = useProducts();
  const frutas = productos.filter((p) => p.categoria === CATEGORIA);

  const [busca, setBusca] = useState("");
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const filtradas = busca.trim()
    ? frutas.filter((p) => p.nombre.toLowerCase().includes(busca.trim().toLowerCase()))
    : frutas;

  async function crearFruta(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !(Number(form.precio) > 0)) {
      setError("Ponle nombre y precio.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const nuevo = await upsertProduct(
        {
          barcode: generarCodigoInterno("FRUTA"),
          nombre: form.nombre,
          precio: form.precio,
          unidades: form.unidades || 0,
          categoria: CATEGORIA,
        },
        actor
      );
      setForm(EMPTY_FORM);
      setCreando(false);
      onAdd(nuevo.barcode);
    } catch (err) {
      setError("No se pudo crear: " + err.message);
    }
    setGuardando(false);
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 700, color: "#1a1c2e" }}>🍎 Frutas y verduras</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <input
          style={s.search}
          placeholder="Buscar…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {error && <div style={s.error}>{error}</div>}

        <div style={s.scroll}>
          {frutas.length === 0 ? (
            <div style={s.empty}>Aún no tienes frutas cargadas. Agrega la primera abajo.</div>
          ) : (
            <div style={s.grid}>
              {filtradas.map((p) => (
                <button key={p.barcode} style={s.tile} onClick={() => onAdd(p.barcode)}>
                  <span style={s.tileName}>{p.nombre}</span>
                  <span style={s.tilePrice}>{money(p.precio)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {creando ? (
          <form onSubmit={crearFruta} style={s.form}>
            <div style={s.formGrid}>
              <input
                style={s.input}
                placeholder="Nombre (ej. Manzana kg)"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                autoFocus
              />
              <input
                style={s.input}
                inputMode="decimal"
                placeholder="Precio"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
              <input
                style={s.input}
                inputMode="numeric"
                placeholder="Stock (opcional)"
                value={form.unidades}
                onChange={(e) => setForm({ ...form, unidades: e.target.value })}
              />
            </div>
            <div style={s.formActions}>
              <button type="button" style={s.cancelBtn} onClick={() => { setCreando(false); setError(""); }}>
                Cancelar
              </button>
              <button type="submit" style={s.saveBtn} disabled={guardando}>
                {guardando ? "Guardando…" : "Crear y agregar"}
              </button>
            </div>
          </form>
        ) : (
          <button style={s.addBtn} onClick={() => setCreando(true)}>
            + Agregar fruta nueva
          </button>
        )}
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
    background: "#fff", width: "100%", maxWidth: 520, maxHeight: "88vh", borderRadius: "20px 20px 0 0",
    padding: 16, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  closeBtn: {
    width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f4f5f9",
    fontSize: 15, cursor: "pointer", color: "#5a5e78",
  },
  search: {
    padding: "10px 12px", fontSize: 14, border: "0.5px solid #d0d3e0", borderRadius: 9,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "8px 10px", borderRadius: 8 },
  scroll: { overflowY: "auto", flex: "0 1 auto" },
  empty: { fontSize: 13, color: "#8a8fa8", padding: "20px 4px", textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 },
  tile: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
    padding: "16px 8px", background: "#f4f5f9", border: "0.5px solid #e8eaf0", borderRadius: 12,
    cursor: "pointer", minHeight: 70,
  },
  tileName: { fontSize: 13, fontWeight: 600, color: "#1a1c2e", textAlign: "center" },
  tilePrice: { fontSize: 13, fontWeight: 700, color: "#2e7d32" },

  addBtn: {
    padding: "12px", fontSize: 13, fontWeight: 600, background: "#eef0fb", color: "#1a237e",
    border: "0.5px dashed #c7ccf0", borderRadius: 10, cursor: "pointer",
  },
  form: { display: "flex", flexDirection: "column", gap: 8, background: "#fafbfc", padding: 12, borderRadius: 10 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 },
  input: {
    padding: "10px 11px", fontSize: 13, border: "0.5px solid #d0d3e0", borderRadius: 8,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  formActions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  cancelBtn: { padding: "9px 14px", fontSize: 13, fontWeight: 600, background: "#fff", color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer" },
  saveBtn: { padding: "9px 14px", fontSize: 13, fontWeight: 700, background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
};
