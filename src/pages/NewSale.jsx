import { useEffect, useMemo, useRef, useState } from "react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useProducts } from "../hooks/useProducts";
import { getProduct, addStock, normalizeBarcode, generarCodigoInterno } from "../lib/productStore";
import { recordSale } from "../lib/salesStore";
import { leerVentaEnCurso, guardarVentaEnCurso, borrarVentaEnCurso } from "../lib/ventaEnCursoStore";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../lib/permisos";
import CameraScanner from "../components/CameraScanner";
import FrutasModal from "../components/FrutasModal";
import RecargaModal from "../components/RecargaModal";
import BusModal from "../components/BusModal";

const EMPTY_CLIENTE = { nombre: "", documento: "", telefono: "" };
const METODOS = ["Efectivo", "Tarjeta", "Transferencia"];
const TIPO_ICON = { recarga: "📱 ", bus: "🚌 " };

export default function NewSale() {
  const { user, nombre, rol } = useAuth();
  const actor = { id: user?.id, nombre: nombre || "Sistema", rol };

  const productos = useProducts();
  const stockMap = useMemo(
    () => new Map(productos.map((p) => [p.barcode, p.unidades])),
    [productos]
  );

  // Se restaura lo que hubiera quedado a medio armar (F5, cambio de
  // pantalla) — así no se pierde una venta en curso por accidente.
  const [cart, setCart] = useState(() => leerVentaEnCurso()?.cart ?? []); // { barcode, nombre, precio, cantidad }
  const [cliente, setCliente] = useState(() => leerVentaEnCurso()?.cliente ?? EMPTY_CLIENTE);
  const [metodo, setMetodo] = useState(() => leerVentaEnCurso()?.metodo ?? "Efectivo");

  // Guarda el borrador mientras haya algo en el carrito; lo borra apenas
  // se vacía (venta cobrada o cancelada).
  useEffect(() => {
    if (cart.length > 0) {
      guardarVentaEnCurso({ cart, cliente, metodo });
    } else {
      borrarVentaEnCurso();
    }
  }, [cart, cliente, metodo]);
  const [manual, setManual] = useState("");
  const [confirmPay, setConfirmPay] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [modal, setModal] = useState(null); // null | "frutas" | "recarga" | "bus"
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const total = cart.reduce((a, l) => a + l.precio * l.cantidad, 0);
  const numArticulos = cart.reduce((a, l) => a + l.cantidad, 0);

  function flash(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  function addToCart(rawCode) {
    const c = normalizeBarcode(rawCode);
    if (!c) return;
    setManual("");
    setCamaraAbierta(false);
    const prod = getProduct(c);
    if (!prod) {
      flash(`Código ${c} no está registrado`);
      return;
    }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.barcode === c);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], cantidad: copy[i].cantidad + 1 };
        return copy;
      }
      return [...prev, { barcode: c, nombre: prod.nombre, precio: prod.precio, cantidad: 1 }];
    });
    flash(`+ ${prod.nombre}`);
  }

  useBarcodeScanner(addToCart, { enabled: !confirmPay && !camaraAbierta && !modal });

  /** Agrega una línea que no es un producto de inventario (recarga, bus…). */
  function addServiceLine({ nombre, precio, tipo, codigo }) {
    const prefix = tipo === "bus" ? "BUS" : "REC";
    const barcode = codigo
      ? `${prefix}-${codigo}-${Date.now().toString(36).toUpperCase()}`
      : generarCodigoInterno(prefix);
    setCart((prev) => [...prev, { barcode, nombre, precio: Number(precio) || 0, cantidad: 1, tipo }]);
    flash(`+ ${nombre}`);
    setModal(null);
  }

  function setCantidad(barcode, cantidad) {
    setCart((prev) =>
      prev
        .map((l) => (l.barcode === barcode ? { ...l, cantidad } : l))
        .filter((l) => l.cantidad > 0)
    );
  }

  function removeLine(barcode) {
    setCart((prev) => prev.filter((l) => l.barcode !== barcode));
  }

  function cancelarVenta() {
    setCart([]);
    setCliente(EMPTY_CLIENTE);
    setMetodo("Efectivo");
    setConfirmPay(false);
  }

  async function confirmarCobro() {
    if (cobrando) return;
    setCobrando(true);
    const montoVenta = total;
    try {
      await recordSale({ items: cart, total: montoVenta, metodoPago: metodo, cliente, usuario: actor });
      // Descontamos del inventario solo en líneas de producto real
      // (recargas y bus no tienen stock que descontar). No dejamos un
      // "ajuste" suelto por cada línea: recordSale ya deja UN registro
      // "venta" con todo el detalle en Actividad.
      await Promise.all(
        cart
          .filter((l) => (l.tipo ?? "producto") === "producto")
          .map((l) => addStock(l.barcode, -l.cantidad, actor, "ajuste", false).catch(() => {}))
      );
      flash(`Venta registrada · ${money(montoVenta)}`);
      cancelarVenta();
    } catch (err) {
      flash("No se pudo cobrar: " + err.message);
    } finally {
      setCobrando(false);
    }
  }

  function submitManual(e) {
    e.preventDefault();
    if (manual.trim()) addToCart(manual);
  }

  return (
    <div style={s.wrap}>
      <style>{responsiveCss}</style>

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={s.title}>Nueva venta</h1>
          <p style={s.sub}>Escanea los productos con el lector USB o la cámara, y cobra.</p>
        </div>
        <div style={s.cajeroBadge}>
          Cajero: <strong>{actor.nombre}</strong>{rol && ` · ${ETIQUETA_ROL[rol] ?? rol}`}
        </div>
      </div>

      <div className="pos-layout" style={s.layout}>
        {/* ------- Columna izquierda: escaneo + carrito ------- */}
        <div className="pos-main" style={s.main}>
          <form onSubmit={submitManual} style={s.scanBar}>
            <span style={s.scanBarIcon}>▍▍▎▍▎▎▍</span>
            <input
              style={s.scanInput}
              inputMode="numeric"
              placeholder="Dispara el lector o escribe un código…"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit" style={s.scanBtn}>Agregar</button>
            <button
              type="button"
              style={s.camBtn}
              onClick={() => setCamaraAbierta(true)}
              title="Escanear con cámara"
            >
              📷
            </button>
          </form>

          <div style={s.tilesRow}>
            <button style={s.tile} onClick={() => setModal("frutas")}>
              <span style={s.tileIcon}>🍎</span> Frutas
            </button>
            <button style={s.tile} onClick={() => setModal("recarga")}>
              <span style={s.tileIcon}>📱</span> Recargas
            </button>
            <button style={s.tile} onClick={() => setModal("bus")}>
              <span style={s.tileIcon}>🚌</span> Recarga bus
            </button>
          </div>

          {cart.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1c2e" }}>
                Carrito vacío
              </div>
              <div style={{ fontSize: 13, color: "#8a8fa8", marginTop: 4 }}>
                El primer escaneo agrega el producto aquí
              </div>
            </div>
          ) : (
            <div style={s.cartCard}>
              {cart.map((l) => {
                const stock = stockMap.get(l.barcode);
                const sinStock = typeof stock === "number" && l.cantidad > stock;
                return (
                  <div key={l.barcode} style={s.cartRow}>
                    <div style={s.cartInfo}>
                      <div style={s.cartName}>{TIPO_ICON[l.tipo] ?? ""}{l.nombre}</div>
                      <div style={s.cartCode}>
                        {money(l.precio)} c/u
                        {sinStock && (
                          <span style={s.stockWarn}> · solo {stock} en stock</span>
                        )}
                      </div>
                    </div>

                    <div style={s.qtyBox}>
                      <button
                        type="button"
                        style={s.qtyBtn}
                        onClick={() => setCantidad(l.barcode, l.cantidad - 1)}
                      >
                        −
                      </button>
                      <input
                        style={s.qtyInput}
                        inputMode="numeric"
                        value={l.cantidad}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          setCantidad(l.barcode, Number.isNaN(n) ? 0 : n);
                        }}
                      />
                      <button
                        type="button"
                        style={s.qtyBtn}
                        onClick={() => setCantidad(l.barcode, l.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>

                    <div style={s.lineTotal}>{money(l.precio * l.cantidad)}</div>

                    <button
                      type="button"
                      style={s.removeBtn}
                      onClick={() => removeLine(l.barcode)}
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ------- Columna derecha: totales + cliente + cobro ------- */}
        <div className="pos-side" style={s.side}>
          <div style={s.totalCard}>
            <div style={s.totalRow}>
              <span>Artículos</span>
              <span>{numArticulos}</span>
            </div>
            {/* Aquí iría el IVA cuando se necesite: total = subtotal + iva */}
            <div style={s.grandRow}>
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Cliente <span style={s.opt}>(opcional)</span></div>
            <input
              style={s.input}
              placeholder="Nombre"
              value={cliente.nombre}
              onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
            />
            <div style={s.twoCols}>
              <input
                style={s.input}
                placeholder="Cédula / RUC"
                value={cliente.documento}
                onChange={(e) => setCliente({ ...cliente, documento: e.target.value })}
              />
              <input
                style={s.input}
                inputMode="tel"
                placeholder="Teléfono"
                value={cliente.telefono}
                onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
              />
            </div>

            <div style={{ ...s.cardTitle, marginTop: 8 }}>Método de pago</div>
            <div style={s.metodoRow}>
              {METODOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  style={{
                    ...s.metodoBtn,
                    ...(metodo === m ? s.metodoBtnActive : null),
                  }}
                  onClick={() => setMetodo(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {confirmPay ? (
            <div style={s.confirmBox}>
              <div style={s.confirmText}>
                Cobrar <strong>{money(total)}</strong> en {metodo.toLowerCase()}
                {cliente.nombre ? ` a ${cliente.nombre}` : ""}?
              </div>
              <div style={s.actionRow}>
                <button style={s.ghostBtn} onClick={() => setConfirmPay(false)}>
                  Volver
                </button>
                <button
                  style={{ ...s.payConfirmBtn, opacity: cobrando ? 0.6 : 1 }}
                  onClick={confirmarCobro}
                  disabled={cobrando}
                >
                  {cobrando ? "Guardando…" : "Confirmar cobro"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                style={{ ...s.payBtn, opacity: cart.length ? 1 : 0.5 }}
                disabled={!cart.length}
                onClick={() => setConfirmPay(true)}
              >
                Cobrar {money(total)}
              </button>
              {cart.length > 0 && (
                <button style={s.cancelBtn} onClick={cancelarVenta}>
                  Cancelar venta
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {camaraAbierta && (
        <CameraScanner onDetected={addToCart} onClose={() => setCamaraAbierta(false)} />
      )}

      {modal === "frutas" && (
        <FrutasModal onAdd={(barcode) => { addToCart(barcode); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {modal === "recarga" && (
        <RecargaModal onAdd={addServiceLine} onClose={() => setModal(null)} />
      )}
      {modal === "bus" && (
        <BusModal onAdd={addServiceLine} onClose={() => setModal(null)} />
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

const responsiveCss = `
  @media (max-width: 860px) {
    .pos-layout { flex-direction: column !important; }
    .pos-side { position: static !important; width: 100% !important; }
  }
`;

const s = {
  wrap: { maxWidth: 960, margin: "0 auto", width: "100%", minWidth: 0 },
  title: { fontSize: 20, fontWeight: 600, color: "#1a1c2e", margin: 0 },
  sub: { fontSize: 13, color: "#8a8fa8", marginTop: 2 },

  layout: { display: "flex", gap: 16, alignItems: "flex-start", minWidth: 0 },
  main: { flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 12 },
  side: {
    width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12,
    position: "sticky", top: 68,
  },

  scanBar: {
    display: "flex", alignItems: "center", gap: 8, background: "#fff",
    border: "0.5px solid #e8eaf0", borderRadius: 12, padding: 10,
  },
  scanBarIcon: { fontSize: 16, letterSpacing: 1, color: "#1a237e", paddingLeft: 4 },
  scanInput: {
    flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 14, border: "0.5px solid #e8eaf0",
    borderRadius: 8, outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box",
  },
  scanBtn: {
    padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "#1a237e",
    color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0,
  },
  camBtn: {
    width: 40, height: 40, flexShrink: 0, fontSize: 17, background: "#eef0fb",
    border: "0.5px solid #d7dbf5", borderRadius: 8, cursor: "pointer",
  },
  cajeroBadge: {
    fontSize: 12, color: "#5a5e78", background: "#f4f5f9", border: "0.5px solid #e8eaf0",
    borderRadius: 8, padding: "7px 12px", whiteSpace: "nowrap",
  },

  tilesRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  tile: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "12px 6px", fontSize: 13, fontWeight: 600, color: "#1a1c2e",
    background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 10, cursor: "pointer",
  },
  tileIcon: { fontSize: 16 },

  empty: {
    background: "#fff", border: "2px dashed #d0d3e0", borderRadius: 12,
    padding: "40px 16px", textAlign: "center",
  },

  cartCard: {
    background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 12,
    overflow: "hidden",
  },
  cartRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
    borderTop: "0.5px solid #f0f1f5",
  },
  cartInfo: { flex: 1, minWidth: 90 },
  cartName: { fontSize: 13, fontWeight: 600, color: "#1a1c2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cartCode: { fontSize: 11, color: "#8a8fa8" },
  stockWarn: { color: "#c62828", fontWeight: 600 },

  qtyBox: {
    display: "flex", alignItems: "center", border: "0.5px solid #e8eaf0",
    borderRadius: 8, overflow: "hidden", flexShrink: 0,
  },
  qtyBtn: {
    width: 26, height: 30, border: "none", background: "#f4f5f9", color: "#1a1c2e",
    fontSize: 15, cursor: "pointer", lineHeight: 1,
  },
  qtyInput: {
    width: 30, height: 30, border: "none", textAlign: "center", fontSize: 13,
    outline: "none", background: "#fff", color: "#1a1c2e", padding: 0,
  },
  lineTotal: { width: 62, flexShrink: 0, textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1a1c2e" },
  removeBtn: {
    width: 20, height: 20, flexShrink: 0, border: "none", background: "none",
    color: "#c0c3d0", fontSize: 12, cursor: "pointer", padding: 0,
  },

  totalCard: {
    background: "#1a237e", color: "#fff", borderRadius: 14, padding: 16,
  },
  totalRow: {
    display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.8,
    marginBottom: 8,
  },
  grandRow: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    fontSize: 15, fontWeight: 700, borderTop: "1px solid rgba(255,255,255,0.2)",
    paddingTop: 8,
  },

  card: {
    background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 14, padding: 14,
    display: "flex", flexDirection: "column", gap: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: 700, color: "#5a5e78" },
  opt: { fontWeight: 400, color: "#a0a3b5" },
  input: {
    padding: "11px 12px", fontSize: 14, border: "0.5px solid #d0d3e0", borderRadius: 9,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  twoCols: { display: "flex", gap: 8 },

  metodoRow: { display: "flex", gap: 6 },
  metodoBtn: {
    flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600, background: "#f4f5f9",
    color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer",
  },
  metodoBtnActive: { background: "#1a237e", color: "#fff", borderColor: "#1a237e" },

  payBtn: {
    width: "100%", padding: "16px", fontSize: 16, fontWeight: 700, background: "#2e7d32",
    color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
  },
  cancelBtn: {
    width: "100%", padding: "11px", fontSize: 13, fontWeight: 600, background: "#fff",
    color: "#c62828", border: "0.5px solid #f3c6c6", borderRadius: 10, cursor: "pointer",
  },
  confirmBox: {
    background: "#f0f7f0", border: "0.5px solid #b8dcb9", borderRadius: 12, padding: 14,
    display: "flex", flexDirection: "column", gap: 12,
  },
  confirmText: { fontSize: 14, color: "#1a1c2e", lineHeight: 1.4 },
  actionRow: { display: "flex", gap: 8 },
  ghostBtn: {
    flex: "0 0 auto", padding: "13px 18px", fontSize: 14, fontWeight: 600, background: "#fff",
    color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 10, cursor: "pointer",
  },
  payConfirmBtn: {
    flex: 1, padding: "13px", fontSize: 15, fontWeight: 700, background: "#2e7d32",
    color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
  },

  toast: {
    position: "fixed", left: "50%", bottom: 96, transform: "translateX(-50%)",
    background: "#1a1c2e", color: "#fff", padding: "12px 20px", borderRadius: 999,
    fontSize: 13, fontWeight: 500, zIndex: 1100, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    maxWidth: "90vw", textAlign: "center",
  },
};
