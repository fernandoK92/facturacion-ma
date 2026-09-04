import { useEffect, useRef, useState } from "react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useProducts, useProductStats } from "../hooks/useProducts";
import {
  getProduct,
  upsertProduct,
  addStock,
  deleteProduct,
  normalizeBarcode,
} from "../lib/productStore";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../lib/permisos";
import { fechaHoraCorta } from "../lib/format";
import CameraScanner from "../components/CameraScanner";

const EMPTY_FORM = { nombre: "", precio: "", unidades: "" };

export default function ScanProduct() {
  const { user, nombre, rol } = useAuth();
  const actor = { id: user?.id, nombre: nombre || "Sistema", rol };

  const productos = useProducts();
  const stats = useProductStats();

  // mode: 'idle' | 'found' | 'new' | 'edit'
  const [mode, setMode] = useState("idle");
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState("");
  const [manual, setManual] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  const nombreRef = useRef(null);
  const toastTimer = useRef(null);

  const scanningEnabled = (mode === "idle" || mode === "found") && !camaraAbierta;

  function flash(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  function handleCode(raw) {
    const c = normalizeBarcode(raw);
    if (!c) return;
    setCode(c);
    setManual("");
    setConfirmDelete(false);
    setCamaraAbierta(false);

    const existing = getProduct(c);
    if (existing) {
      setFound(existing);
      setMode("found");
      flash(`Encontrado: ${existing.nombre}`);
    } else {
      setFound(null);
      setForm(EMPTY_FORM);
      setMode("new");
    }
  }

  useBarcodeScanner(handleCode, { enabled: scanningEnabled });

  // Autofoco en el nombre al abrir el formulario de alta.
  useEffect(() => {
    if (mode === "new" || mode === "edit") {
      const t = setTimeout(() => nombreRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [mode]);

  function reset() {
    setMode("idle");
    setCode("");
    setFound(null);
    setForm(EMPTY_FORM);
    setConfirmDelete(false);
  }

  async function handleDelete() {
    const nombre = found?.nombre ?? "";
    try {
      await deleteProduct(code);
      flash(`Eliminado: ${nombre}`);
      reset();
    } catch (err) {
      flash("No se pudo eliminar: " + err.message);
    }
  }

  function submitManual(e) {
    e.preventDefault();
    if (manual.trim()) handleCode(manual);
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      flash("Ponle un nombre al producto");
      nombreRef.current?.focus();
      return;
    }
    try {
      await upsertProduct(
        {
          barcode: code,
          nombre: form.nombre,
          precio: form.precio,
          unidades: form.unidades,
        },
        actor
      );
      flash(mode === "edit" ? "Cambios guardados" : "Producto agregado");
      reset();
    } catch (err) {
      flash("No se pudo guardar: " + err.message);
    }
  }

  async function quickStock(delta) {
    try {
      const updated = await addStock(code, delta, actor);
      setFound(updated);
      flash(`Stock: ${updated.unidades} uds.`);
    } catch (err) {
      flash("No se pudo actualizar: " + err.message);
    }
  }

  function startEdit() {
    setForm({
      nombre: found.nombre,
      precio: String(found.precio),
      unidades: String(found.unidades),
    });
    setMode("edit");
  }

  return (
    <div style={s.wrap}>
      <style>{responsiveCss}</style>

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={s.title}>Escanear producto</h1>
          <p style={s.sub}>
            Escanea con el lector USB o la cámara, y asígnale nombre, precio y unidades.
          </p>
        </div>
        <div style={s.actorBadge}>
          {nombre || "Sistema"}{rol && ` · ${ETIQUETA_ROL[rol] ?? rol}`}
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="scan-kpis" style={s.kpis}>
        <Kpi label="Productos" value={stats.total} />
        <Kpi label="Unidades" value={stats.unidades} />
        <Kpi label="Valor stock" value={`$${stats.valor.toFixed(2)}`} />
        <Kpi label="Sin stock" value={stats.sinStock} accent={stats.sinStock > 0} />
      </div>

      {/* Zona principal */}
      {mode === "idle" && (
        <div style={s.card}>
          <div style={s.scanHero}>
            <div style={s.scanIcon}>▍▍▎▍▎▎▍</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#1a1c2e" }}>
              Listo para escanear
            </div>
            <div style={{ fontSize: 13, color: "#8a8fa8", marginTop: 2 }}>
              Dispara el lector USB sobre cualquier producto
            </div>
          </div>

          <button
            type="button"
            style={s.camScanBtn}
            onClick={() => setCamaraAbierta(true)}
          >
            📷 Escanear con cámara
          </button>

          <form onSubmit={submitManual} style={s.manualRow}>
            <input
              style={s.manualInput}
              inputMode="numeric"
              placeholder="…o escribe el código a mano"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit" style={s.manualBtn}>Buscar</button>
          </form>
        </div>
      )}

      {mode === "found" && found && (
        <div style={s.card}>
          <div style={s.codeChip}>{code}</div>
          <div style={s.foundName}>{found.nombre}</div>

          <div style={s.foundGrid}>
            <div>
              <div style={s.foundLabel}>Precio</div>
              <div style={s.foundValue}>${found.precio.toFixed(2)}</div>
            </div>
            <div>
              <div style={s.foundLabel}>Unidades</div>
              <div style={{ ...s.foundValue, color: found.unidades === 0 ? "#c62828" : "#1a1c2e" }}>
                {found.unidades}
              </div>
            </div>
          </div>

          <div style={s.attribution}>
            Últ. modificación:
            {found.actualizadoPorNombre && (
              <>
                {" "}<strong>{found.actualizadoPorNombre}</strong>
                {found.actualizadoPorRol && ` (${ETIQUETA_ROL[found.actualizadoPorRol] ?? found.actualizadoPorRol})`}
                {" · "}
              </>
            )}
            {fechaHoraCorta(found.updatedAt)}
          </div>

          <div style={s.stepper}>
            <button style={s.stepBtn} onClick={() => quickStock(-1)}>−1</button>
            <button style={s.stepBtn} onClick={() => quickStock(1)}>+1</button>
            <button style={s.stepBtn} onClick={() => quickStock(10)}>+10</button>
          </div>

          {confirmDelete ? (
            <div style={s.confirmBox}>
              <div style={s.confirmText}>
                ¿Eliminar <strong>{found.nombre}</strong> del inventario?
              </div>
              <div style={s.formActions}>
                <button style={s.ghostBtn} onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
                <button style={s.dangerBtn} onClick={handleDelete}>
                  Sí, eliminar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={s.actionRow}>
                <button style={s.secondaryBtn} onClick={startEdit}>✏️ Editar</button>
                <button style={s.dangerGhostBtn} onClick={() => setConfirmDelete(true)}>
                  🗑 Eliminar
                </button>
              </div>
              <button style={s.primaryBtn} onClick={reset}>Escanear otro</button>
            </>
          )}
        </div>
      )}

      {(mode === "new" || mode === "edit") && (
        <form style={s.card} onSubmit={saveForm}>
          <div style={s.codeChip}>{code}</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#1a1c2e", margin: "6px 0 14px" }}>
            {mode === "edit" ? "Editar producto" : "Producto nuevo"}
          </div>

          <label style={s.field}>
            <span style={s.fieldLabel}>Nombre</span>
            <input
              ref={nombreRef}
              style={s.input}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. Coca-Cola 600ml"
            />
          </label>

          <div style={s.twoCols}>
            <label style={s.field}>
              <span style={s.fieldLabel}>Precio</span>
              <input
                style={s.input}
                inputMode="decimal"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                placeholder="0.00"
              />
            </label>
            <label style={s.field}>
              <span style={s.fieldLabel}>Unidades</span>
              <input
                style={s.input}
                inputMode="numeric"
                value={form.unidades}
                onChange={(e) => setForm({ ...form, unidades: e.target.value })}
                placeholder="0"
              />
            </label>
          </div>

          <div style={s.formActions}>
            <button type="button" style={s.ghostBtn} onClick={reset}>Cancelar</button>
            <button type="submit" style={s.primaryBtn}>
              {mode === "edit" ? "Guardar cambios" : "Guardar producto"}
            </button>
          </div>
        </form>
      )}

      {/* Últimos productos */}
      {productos.length > 0 && (
        <div style={{ ...s.card, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1c2e", marginBottom: 10 }}>
            Últimos productos ({productos.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {productos.slice(0, 12).map((p) => (
              <button
                key={p.barcode}
                style={s.recentRow}
                onClick={() => handleCode(p.barcode)}
              >
                <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <span style={s.recentName}>{p.nombre}</span>
                  <span style={s.recentCode}>{p.barcode}</span>
                </span>
                <span style={s.recentPrice}>${p.precio.toFixed(2)}</span>
                <span style={{ ...s.recentQty, color: p.unidades === 0 ? "#c62828" : "#2e7d32" }}>
                  {p.unidades} uds.
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {camaraAbierta && (
        <CameraScanner onDetected={handleCode} onClose={() => setCamaraAbierta(false)} />
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div style={s.kpi}>
      <div style={{ fontSize: 11, color: "#8a8fa8" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: accent ? "#c62828" : "#1a1c2e" }}>
        {value}
      </div>
    </div>
  );
}

const responsiveCss = `
  @media (max-width: 640px) {
    .scan-kpis { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

const s = {
  wrap: { maxWidth: 560, margin: "0 auto", width: "100%" },
  title: { fontSize: 20, fontWeight: 600, color: "#1a1c2e", margin: 0 },
  sub: { fontSize: 13, color: "#8a8fa8", marginTop: 2 },

  kpis: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 },
  kpi: { background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 10, padding: "10px 12px" },

  card: {
    background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 14,
    padding: 18, boxSizing: "border-box",
  },

  scanHero: {
    textAlign: "center", padding: "22px 0 24px",
    border: "2px dashed #d0d3e0", borderRadius: 12, marginBottom: 14,
  },
  scanIcon: { fontSize: 30, letterSpacing: 2, color: "#1a237e", marginBottom: 8 },

  camScanBtn: {
    width: "100%", padding: "13px", fontSize: 14, fontWeight: 600, background: "#eef0fb",
    color: "#1a237e", border: "0.5px solid #d7dbf5", borderRadius: 10, cursor: "pointer",
    marginBottom: 10,
  },
  actorBadge: {
    fontSize: 12, color: "#5a5e78", background: "#f4f5f9", border: "0.5px solid #e8eaf0",
    borderRadius: 8, padding: "7px 12px", whiteSpace: "nowrap",
  },
  attribution: {
    fontSize: 12, color: "#8a8fa8", marginBottom: 12, marginTop: -6,
  },

  manualRow: { display: "flex", gap: 8 },
  manualInput: {
    flex: 1, padding: "12px 14px", fontSize: 15, border: "0.5px solid #e8eaf0",
    borderRadius: 10, outline: "none", boxSizing: "border-box", minWidth: 0,
    background: "#fff", color: "#1a1c2e",
  },
  manualBtn: {
    padding: "0 18px", fontSize: 14, fontWeight: 600, background: "#f4f5f9",
    color: "#1a237e", border: "0.5px solid #e8eaf0", borderRadius: 10, cursor: "pointer",
  },

  codeChip: {
    display: "inline-block", fontFamily: "monospace", fontSize: 12, color: "#5a5e78",
    background: "#f4f5f9", borderRadius: 6, padding: "3px 8px",
  },
  foundName: { fontSize: 20, fontWeight: 600, color: "#1a1c2e", margin: "10px 0 14px" },
  foundGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 },
  foundLabel: { fontSize: 11, color: "#8a8fa8" },
  foundValue: { fontSize: 22, fontWeight: 700, color: "#1a1c2e" },

  stepper: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  stepBtn: {
    flex: "1 1 60px", padding: "14px 0", fontSize: 15, fontWeight: 600,
    background: "#f4f5f9", border: "0.5px solid #e8eaf0", borderRadius: 10, cursor: "pointer",
    color: "#1a1c2e",
  },

  actionRow: { display: "flex", gap: 8, marginBottom: 10 },
  primaryBtn: {
    width: "100%", padding: "15px", fontSize: 16, fontWeight: 600,
    background: "#1a237e", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
  },
  secondaryBtn: {
    flex: 1, padding: "13px 0", fontSize: 14, fontWeight: 600,
    background: "#eef0fb", color: "#1a237e", border: "none", borderRadius: 10, cursor: "pointer",
  },
  dangerGhostBtn: {
    flex: 1, padding: "13px 0", fontSize: 14, fontWeight: 600,
    background: "#fff", color: "#c62828", border: "0.5px solid #f3c6c6",
    borderRadius: 10, cursor: "pointer",
  },
  dangerBtn: {
    flex: 1, padding: "15px", fontSize: 15, fontWeight: 700,
    background: "#c62828", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
  },
  ghostBtn: {
    flex: "0 0 auto", padding: "15px 20px", fontSize: 15, fontWeight: 600,
    background: "#fff", color: "#5a5e78", border: "0.5px solid #e8eaf0",
    borderRadius: 12, cursor: "pointer",
  },
  confirmBox: {
    background: "#fff5f5", border: "0.5px solid #f3c6c6", borderRadius: 12,
    padding: 14, display: "flex", flexDirection: "column", gap: 12,
  },
  confirmText: { fontSize: 14, color: "#1a1c2e", lineHeight: 1.4 },

  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#5a5e78" },
  input: {
    padding: "14px", fontSize: 16, border: "0.5px solid #d0d3e0", borderRadius: 10,
    outline: "none", boxSizing: "border-box", width: "100%",
    background: "#fff", color: "#1a1c2e",
  },
  twoCols: { display: "flex", gap: 12 },
  formActions: { display: "flex", gap: 10, marginTop: 4 },

  recentRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 4px",
    background: "none", border: "none", borderTop: "0.5px solid #f0f1f5",
    cursor: "pointer", width: "100%",
  },
  recentName: { fontSize: 13, fontWeight: 500, color: "#1a1c2e", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentCode: { fontSize: 10, fontFamily: "monospace", color: "#8a8fa8" },
  recentPrice: { fontSize: 13, color: "#5a5e78", flexShrink: 0 },
  recentQty: { fontSize: 12, fontWeight: 600, flexShrink: 0, minWidth: 54, textAlign: "right" },

  toast: {
    position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)",
    background: "#1a1c2e", color: "#fff", padding: "12px 20px", borderRadius: 999,
    fontSize: 13, fontWeight: 500, zIndex: 1100, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    maxWidth: "90vw", textAlign: "center",
  },
};
