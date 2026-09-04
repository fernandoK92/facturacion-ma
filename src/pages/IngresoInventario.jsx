import { useMemo, useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { addStock } from "../lib/productStore";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui";

export default function IngresoInventario({ onCerrar }) {
  const productos = useProducts();
  const { nombre, user, rol } = useAuth();
  const quien = nombre || "Sistema";
  const actor = { id: user?.id, nombre: quien, rol };

  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(""); // barcode del producto seleccionado
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const list = q
      ? productos.filter(
          (p) => p.nombre.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
        )
      : productos;
    return list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, busca]);

  function seleccionar(barcode) {
    setAbierto(abierto === barcode ? "" : barcode);
    setCantidad("");
    setError("");
    setOk("");
  }

  async function registrar(p) {
    const n = Math.round(Number(cantidad) || 0);
    if (n <= 0) {
      setError("Escribe cuántas unidades ingresan.");
      return;
    }
    setGuardando(true);
    setError("");
    setOk("");
    try {
      await addStock(p.barcode, n, actor, "ingreso");
      setOk(`+${n} uds. de ${p.nombre} · ahora ${p.unidades + n}`);
    } catch (err) {
      setError("No se pudo actualizar el stock: " + err.message);
      setGuardando(false);
      return;
    }
    setAbierto("");
    setCantidad("");
    setGuardando(false);
  }

  return (
    <Card
      title="Ingresar inventario"
      subtitle={`Ingresando como: ${quien}`}
      right={
        <button style={s.cerrar} onClick={onCerrar}>Cerrar</button>
      }
    >
      <div style={{ padding: "12px 16px 4px" }}>
        <input
          style={s.search}
          placeholder="Buscar producto…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {error && <div style={s.error}>{error}</div>}
        {ok && <div style={s.ok}>{ok}</div>}
      </div>

      {filtrados.length === 0 ? (
        <div style={{ padding: 20, fontSize: 13, color: "#8a8fa8" }}>Sin resultados.</div>
      ) : (
        <div style={{ maxHeight: 460, overflowY: "auto" }}>
          {filtrados.map((p) => {
            const sel = abierto === p.barcode;
            return (
              <div key={p.barcode} style={{ borderTop: "0.5px solid #f0f1f5" }}>
                <button style={s.row} onClick={() => seleccionar(p.barcode)}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={s.nombre}>{p.nombre}</div>
                    <div style={s.code}>{p.barcode}</div>
                  </div>
                  <div style={s.stock}>
                    <span style={{ fontSize: 11, color: "#8a8fa8" }}>hay</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1c2e" }}>{p.unidades}</span>
                  </div>
                  <span style={{ color: "#c0c3d0", fontSize: 12, width: 14, textAlign: "center" }}>
                    {sel ? "▲" : "▼"}
                  </span>
                </button>

                {sel && (
                  <div style={s.panel}>
                    <div style={s.panelInfo}>
                      Stock actual: <strong>{p.unidades}</strong> uds.
                      {Number(cantidad) > 0 && (
                        <span style={{ color: "#2e7d32" }}>
                          {" "}→ quedará en <strong>{p.unidades + Math.round(Number(cantidad))}</strong>
                        </span>
                      )}
                    </div>
                    <div style={s.panelRow}>
                      <input
                        style={s.cantInput}
                        inputMode="numeric"
                        autoFocus
                        placeholder="Cantidad que ingresa"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && registrar(p)}
                      />
                      <button
                        style={s.regBtn}
                        disabled={guardando}
                        onClick={() => registrar(p)}
                      >
                        {guardando ? "…" : "Registrar ingreso"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const s = {
  cerrar: {
    padding: "7px 14px", fontSize: 13, fontWeight: 600, background: "#f4f5f9", color: "#5a5e78",
    border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer",
  },
  search: {
    width: "100%", padding: "10px 12px", fontSize: 14, border: "0.5px solid #d0d3e0",
    borderRadius: 9, outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box",
  },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "8px 10px", borderRadius: 8, marginTop: 10 },
  ok: { background: "#e8f5e9", color: "#2e7d32", fontSize: 13, padding: "8px 10px", borderRadius: 8, marginTop: 10 },
  row: {
    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 16px",
    background: "none", border: "none", cursor: "pointer",
  },
  nombre: { fontSize: 13, fontWeight: 600, color: "#1a1c2e" },
  code: { fontSize: 11, fontFamily: "monospace", color: "#8a8fa8" },
  stock: { display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 48 },
  panel: { padding: "8px 16px 16px", background: "#fafbfc" },
  panelInfo: { fontSize: 13, color: "#1a1c2e", marginBottom: 10 },
  panelRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  cantInput: {
    flex: "1 1 160px", padding: "11px 12px", fontSize: 15, border: "0.5px solid #d0d3e0",
    borderRadius: 9, outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box",
  },
  regBtn: {
    padding: "11px 18px", fontSize: 14, fontWeight: 700, background: "#2e7d32", color: "#fff",
    border: "none", borderRadius: 9, cursor: "pointer",
  },
};
