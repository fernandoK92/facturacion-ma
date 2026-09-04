import { Fragment, useMemo, useState } from "react";
import { useProducts, useProductStats } from "../hooks/useProducts";
import { useMovimientos } from "../hooks/useMovimientos";
import { useIsMobile } from "../hooks/useMediaQuery";
import { upsertProduct, deleteProduct } from "../lib/productStore";
import { Card, KpiCard, EmptyState } from "../components/ui";
import { money, UMBRAL_STOCK_BAJO, fechaHoraCorta } from "../lib/format";
import { ETIQUETA_ROL } from "../lib/permisos";
import { useAuth } from "../context/AuthContext";
import IngresoInventario from "./IngresoInventario";

function porTexto(p) {
  if (!p.actualizadoPorNombre) return "";
  const rol = p.actualizadoPorRol ? ` (${ETIQUETA_ROL[p.actualizadoPorRol] ?? p.actualizadoPorRol})` : "";
  return `${p.actualizadoPorNombre}${rol}`;
}

/** Línea "quién y cuándo" para mostrar bajo cada producto. */
function porYFecha(p) {
  const quien = p.actualizadoPorNombre ? `Por: ${porTexto(p)} · ` : "";
  return `${quien}${fechaHoraCorta(p.updatedAt)}`;
}

const estadoDe = (u) => (u === 0 ? "sin" : u <= UMBRAL_STOCK_BAJO ? "bajo" : "ok");

const BADGE = {
  sin: { bg: "#ffebee", fg: "#c62828", label: "Sin stock" },
  bajo: { bg: "#fff8e1", fg: "#e65100", label: "Stock bajo" },
  ok: { bg: "#e8f5e9", fg: "#2e7d32", label: "Normal" },
};

// Cómo se muestra cada tipo de movimiento en la pestaña "Actividad".
const MOV_META = {
  creacion: { icon: "🆕", label: "Producto nuevo" },
  edicion: { icon: "✏️", label: "Editado" },
  ingreso: { icon: "📥", label: "Ingreso de stock" },
  ajuste: { icon: "🔧", label: "Ajuste de stock" },
  merma: { icon: "📉", label: "Merma" },
};

const EMPTY_FORM = { nombre: "", precio: "", unidades: "" };

// ---------- Formulario de edición (se usa en tabla y en tarjetas) ----------
function EditProductoForm({ form, setForm, onGuardar, onCancelar, ocupado }) {
  return (
    <div style={s.editWrap}>
      <div style={s.editGrid}>
        <label style={s.field}>
          <span style={s.lbl}>Nombre</span>
          <input style={s.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label style={s.field}>
          <span style={s.lbl}>Precio</span>
          <input style={s.input} inputMode="decimal" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
        </label>
        <label style={s.field}>
          <span style={s.lbl}>Unidades</span>
          <input style={s.input} inputMode="numeric" value={form.unidades} onChange={(e) => setForm({ ...form, unidades: e.target.value })} />
        </label>
      </div>
      <div style={s.editActions}>
        <button style={s.cancelBtn} onClick={onCancelar}>Cancelar</button>
        <button style={s.saveBtn} disabled={ocupado} onClick={onGuardar}>
          {ocupado ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export default function InventoryDashboard() {
  const productos = useProducts();
  const stats = useProductStats();
  const movimientos = useMovimientos();
  const esMovil = useIsMobile();
  const { user, nombre, rol } = useAuth();
  const actor = { id: user?.id, nombre: nombre || "Sistema", rol };

  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("stock");
  const [ingresoAbierto, setIngresoAbierto] = useState(false);

  const [editando, setEditando] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [guardando, setGuardando] = useState("");
  const [confirmDel, setConfirmDel] = useState("");
  const [error, setError] = useState("");

  const bajos = useMemo(
    () => productos.filter((p) => p.unidades <= UMBRAL_STOCK_BAJO),
    [productos]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    );
  }, [productos, busca]);

  function abrirEdicion(p) {
    setForm({ nombre: p.nombre, precio: String(p.precio), unidades: String(p.unidades) });
    setEditando(p.barcode);
    setConfirmDel("");
    setError("");
  }

  async function guardar(barcode) {
    if (!form.nombre.trim()) {
      setError("El producto necesita un nombre.");
      return;
    }
    setGuardando(barcode);
    setError("");
    try {
      await upsertProduct({ barcode, nombre: form.nombre, precio: form.precio, unidades: form.unidades }, actor);
      setEditando("");
    } catch (err) {
      setError("No se pudo guardar: " + err.message);
    }
    setGuardando("");
  }

  async function eliminar(barcode) {
    setGuardando(barcode);
    setError("");
    try {
      await deleteProduct(barcode);
      setConfirmDel("");
    } catch (err) {
      setError("No se pudo eliminar: " + err.message);
    }
    setGuardando("");
  }

  const Acciones = ({ p, ocupado }) =>
    confirmDel === p.barcode ? (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button style={s.delYes} disabled={ocupado} onClick={() => eliminar(p.barcode)}>Eliminar</button>
        <button style={s.delNo} onClick={() => setConfirmDel("")}>No</button>
      </span>
    ) : (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button style={s.iconBtn} title="Editar" onClick={() => (editando === p.barcode ? setEditando("") : abrirEdicion(p))}>
          ✏️
        </button>
        <button style={s.delBtn} title="Eliminar" onClick={() => { setConfirmDel(p.barcode); setEditando(""); }}>
          🗑
        </button>
      </span>
    );

  return (
    <div>
      <div style={s.headRow}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1c2e", margin: 0 }}>Gestión de inventario</h1>
          <p style={{ fontSize: 13, color: "#8a8fa8", marginTop: 2 }}>Control de stock de tus productos</p>
        </div>
        {productos.length > 0 && !ingresoAbierto && (
          <button style={s.ingresoBtn} onClick={() => setIngresoAbierto(true)}>
            📥 Ingresar inventario
          </button>
        )}
      </div>

      <div style={s.kpis}>
        <KpiCard label="Productos" value={stats.total} hint="Registrados" />
        <KpiCard label="Unidades" value={stats.unidades} hint="En stock" tone="green" />
        <KpiCard label="Valor inventario" value={money(stats.valor)} hint="A precio de venta" />
        <KpiCard label="Sin stock" value={stats.sinStock} hint="Reponer" tone={stats.sinStock ? "red" : "neutral"} />
      </div>

      {error && <div style={s.error}>{error}</div>}

      {ingresoAbierto ? (
        <IngresoInventario onCerrar={() => setIngresoAbierto(false)} />
      ) : productos.length === 0 ? (
        <EmptyState icon="📦" title="Aún no hay productos" hint="Agrega productos escaneándolos en la pantalla Escanear." />
      ) : (
        <>
          <div style={s.tabBar}>
            {[
              { id: "stock", label: `Todos (${productos.length})` },
              { id: "alertas", label: `Alertas (${bajos.length})` },
              { id: "movimientos", label: `Actividad (${movimientos.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  ...s.tab,
                  color: tab === t.id ? "#1a237e" : "#8a8fa8",
                  borderBottomColor: tab === t.id ? "#1a237e" : "transparent",
                  fontWeight: tab === t.id ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "stock" && (
            <Card
              title="Productos"
              subtitle={`${filtrados.length} de ${productos.length}`}
              right={
                <input style={s.search} placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              }
            >
              {esMovil ? (
                /* ---------- Tarjetas (móvil) ---------- */
                <div>
                  {filtrados.map((p) => {
                    const est = estadoDe(p.unidades);
                    const ocupado = guardando === p.barcode;
                    return (
                      <div key={p.barcode} style={s.pcard}>
                        <div style={s.pcardTop}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={s.pcardName}>{p.nombre}</div>
                            <div style={s.pcardCode}>{p.barcode}</div>
                            <div style={s.pcardBy}>{porYFecha(p)}</div>
                          </div>
                          <span style={{ ...s.badge, background: BADGE[est].bg, color: BADGE[est].fg }}>
                            {BADGE[est].label}
                          </span>
                        </div>
                        <div style={s.pcardStats}>
                          <span>Precio <b>{money(p.precio)}</b></span>
                          <span>Stock <b style={{ color: BADGE[est].fg }}>{p.unidades}</b></span>
                          <span>Valor <b>{money(p.precio * p.unidades)}</b></span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Acciones p={p} ocupado={ocupado} />
                        </div>
                        {editando === p.barcode && (
                          <EditProductoForm
                            form={form}
                            setForm={setForm}
                            ocupado={ocupado}
                            onCancelar={() => setEditando("")}
                            onGuardar={() => guardar(p.barcode)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ---------- Tabla (escritorio) ---------- */
                <div style={{ overflowX: "auto" }}>
                  <table style={s.table}>
                    <thead>
                      <tr style={{ background: "#f7f8fb" }}>
                        {["Código", "Producto", "Precio", "Unidades", "Valor", "Estado", ""].map((h, i) => (
                          <th key={h || "acc"} style={{ ...s.th, textAlign: i >= 2 && i <= 4 ? "right" : "left" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((p) => {
                        const est = estadoDe(p.unidades);
                        const ocupado = guardando === p.barcode;
                        return (
                          <Fragment key={p.barcode}>
                            <tr>
                              <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: "#8a8fa8" }}>{p.barcode}</td>
                              <td style={{ ...s.td, fontWeight: 500 }}>
                                {p.nombre}
                                <div style={s.tdSub}>{porYFecha(p)}</div>
                              </td>
                              <td style={{ ...s.td, textAlign: "right" }}>{money(p.precio)}</td>
                              <td style={{ ...s.td, textAlign: "right", fontWeight: 600, color: BADGE[est].fg }}>{p.unidades}</td>
                              <td style={{ ...s.td, textAlign: "right", color: "#5a5e78" }}>{money(p.precio * p.unidades)}</td>
                              <td style={s.td}>
                                <span style={{ ...s.badge, background: BADGE[est].bg, color: BADGE[est].fg }}>{BADGE[est].label}</span>
                              </td>
                              <td style={{ ...s.td, whiteSpace: "nowrap", textAlign: "right" }}>
                                <Acciones p={p} ocupado={ocupado} />
                              </td>
                            </tr>
                            {editando === p.barcode && (
                              <tr>
                                <td colSpan={7} style={{ background: "#fafbfc", borderTop: "0.5px solid #f0f1f5", padding: 0 }}>
                                  <EditProductoForm
                                    form={form}
                                    setForm={setForm}
                                    ocupado={ocupado}
                                    onCancelar={() => setEditando("")}
                                    onGuardar={() => guardar(p.barcode)}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {tab === "alertas" &&
            (bajos.length === 0 ? (
              <EmptyState icon="✅" title="Todo en orden" hint="Ningún producto por debajo del umbral." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {bajos.map((p) => {
                  const est = estadoDe(p.unidades);
                  return (
                    <div key={p.barcode} style={{ ...s.alertRow, borderColor: BADGE[est].fg + "55" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1c2e" }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#8a8fa8" }}>{p.barcode}</div>
                      </div>
                      <span style={{ ...s.badge, background: BADGE[est].bg, color: BADGE[est].fg }}>{BADGE[est].label}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: BADGE[est].fg, minWidth: 60, textAlign: "right" }}>
                        {p.unidades} uds.
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          {tab === "movimientos" &&
            (movimientos.length === 0 ? (
              <EmptyState
                icon="📋"
                title="Sin actividad registrada"
                hint="Acá vas a ver cada alta, edición o ingreso de stock que haga cualquier usuario (vendedor incluido), con quién y cuándo."
              />
            ) : (
              <Card title="Actividad de inventario" subtitle={`${movimientos.length} registro(s)`}>
                {movimientos.map((m) => {
                  const meta = MOV_META[m.tipo] ?? MOV_META.ajuste;
                  const quien = m.usuarioNombre
                    ? `${m.usuarioNombre}${m.usuarioRol ? ` (${ETIQUETA_ROL[m.usuarioRol] ?? m.usuarioRol})` : ""}`
                    : "Sistema";
                  return (
                    <div key={m.id} style={s.movRow}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1c2e" }}>
                          {meta.label} · {m.nombre}
                        </div>
                        {m.detalle && (
                          <div style={{ fontSize: 12, color: "#5a5e78", marginTop: 1 }}>{m.detalle}</div>
                        )}
                        <div style={{ fontSize: 11, color: "#8a8fa8", marginTop: 2 }}>
                          {fechaHoraCorta(m.fecha)} · {quien}
                        </div>
                      </div>
                      {m.cantidad !== 0 && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: m.cantidad > 0 ? "#2e7d32" : "#c62828", whiteSpace: "nowrap" }}>
                          {m.cantidad > 0 ? "+" : ""}{m.cantidad} uds.
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            ))}
        </>
      )}
    </div>
  );
}

const s = {
  headRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  kpis: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12, marginBottom: 20,
  },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "10px 12px", borderRadius: 9, marginBottom: 12 },
  tabBar: { display: "flex", gap: 16, margin: "4px 0 16px", borderBottom: "0.5px solid #e8eaf0", flexWrap: "wrap" },
  tab: {
    background: "none", border: "none", fontSize: 14, padding: "8px 0", cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  search: {
    padding: "7px 12px", fontSize: 13, border: "0.5px solid #e8eaf0", borderRadius: 8,
    outline: "none", background: "#fff", color: "#1a1c2e", maxWidth: 180,
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 560 },
  th: {
    padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#8a8fa8",
    letterSpacing: "0.04em", whiteSpace: "nowrap",
  },
  td: { padding: "12px 12px", fontSize: 13, borderTop: "0.5px solid #f0f1f5", color: "#1a1c2e" },
  tdSub: { fontSize: 10, color: "#a0a3b5", fontWeight: 400, marginTop: 2 },
  badge: {
    display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
  },

  // tarjetas móvil
  pcard: { padding: "14px 16px", borderTop: "0.5px solid #f0f1f5" },
  pcardTop: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  pcardName: { fontSize: 14, fontWeight: 600, color: "#1a1c2e" },
  pcardCode: { fontSize: 11, fontFamily: "monospace", color: "#8a8fa8", marginTop: 1 },
  pcardBy: { fontSize: 11, color: "#a0a3b5", marginTop: 2 },
  pcardStats: {
    display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#8a8fa8",
  },

  iconBtn: {
    width: 34, height: 34, borderRadius: 8, border: "0.5px solid #e8eaf0", background: "#fff",
    fontSize: 14, cursor: "pointer",
  },
  delBtn: {
    width: 34, height: 34, borderRadius: 8, border: "0.5px solid #f3c6c6", background: "#fff",
    color: "#c62828", fontSize: 14, cursor: "pointer",
  },
  delYes: { padding: "8px 12px", fontSize: 12, fontWeight: 700, background: "#c62828", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  delNo: { padding: "8px 12px", fontSize: 12, fontWeight: 600, background: "#fff", color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer" },

  editWrap: { background: "#fafbfc", padding: "12px 16px 14px", marginTop: 10, borderRadius: 10 },
  editGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 10 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  lbl: { fontSize: 11, fontWeight: 600, color: "#5a5e78" },
  input: {
    padding: "10px 11px", fontSize: 14, border: "0.5px solid #d0d3e0", borderRadius: 8,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  editActions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  cancelBtn: { padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "#fff", color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer" },
  saveBtn: { padding: "10px 16px", fontSize: 13, fontWeight: 700, background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },

  alertRow: {
    display: "flex", alignItems: "center", gap: 12, background: "#fff",
    border: "0.5px solid", borderRadius: 12, padding: 14, flexWrap: "wrap",
  },

  ingresoBtn: {
    padding: "10px 16px", fontSize: 13, fontWeight: 700, background: "#1a237e", color: "#fff",
    border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
  },
  movRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
    borderTop: "0.5px solid #f0f1f5",
  },
};
