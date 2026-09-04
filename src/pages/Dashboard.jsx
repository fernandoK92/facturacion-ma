import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import InventoryDashboard from "./InventoryDashboard";
import ScanProduct from "./ScanProduct";
import NewSale from "./NewSale";
import SalesHistory from "./SalesHistory";
import SalesAnalytics from "./SalesAnalytics";
import Clientes from "./Clientes";
import Usuarios from "./Usuarios";
import { useProducts, useProductStats } from "../hooks/useProducts";
import { useSales, useTodaySales } from "../hooks/useSales";
import { KpiCard, Card, EmptyState } from "../components/ui";
import { money, UMBRAL_STOCK_BAJO, fechaHoraCorta } from "../lib/format";
import { supabaseReady } from "../lib/supabase";
import MigrateBanner from "../components/MigrateBanner";
import { useAuth } from "../context/AuthContext";
import { seccionesPermitidas, seccionInicial } from "../lib/permisos";

const hoyTexto = () => {
  const t = new Date().toLocaleDateString("es", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Panel({ goTo }) {
  const productos = useProducts();
  const stats = useProductStats();
  const ventas = useSales();
  const hoy = useTodaySales();

  const porReponer = productos
    .filter((p) => p.unidades <= UMBRAL_STOCK_BAJO)
    .sort((a, b) => a.unidades - b.unidades)
    .slice(0, 6);

  return (
    <>
      <MigrateBanner />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1c2e", margin: 0 }}>Panel</h1>
        <p style={{ fontSize: 13, color: "#8a8fa8", marginTop: 2 }}>{hoyTexto()}</p>
      </div>

      <div style={ps.kpis}>
        <KpiCard label="Productos" value={stats.total} hint="En catálogo" />
        <KpiCard label="Valor inventario" value={money(stats.valor)} hint="A precio de venta" tone="neutral" />
        <KpiCard label="Ventas hoy" value={hoy.numVentas} hint="Tickets" tone="green" />
        <KpiCard label="Cobrado hoy" value={money(hoy.totalVendido)} hint="Total del día" tone="green" />
      </div>

      <div style={ps.grid}>
        <Card
          title="Stock por reponer"
          subtitle={
            porReponer.length === 0
              ? "Todo por encima del mínimo"
              : `${porReponer.length} producto(s) en el mínimo o por debajo`
          }
          right={
            <button style={ps.link} onClick={() => goTo("Inventario")}>
              Ver inventario →
            </button>
          }
        >
          {porReponer.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState
                icon="✅"
                title="Sin alertas de stock"
                hint={productos.length === 0 ? "Aún no hay productos registrados." : "Todo por encima del mínimo."}
              />
            </div>
          ) : (
            porReponer.map((p) => (
              <div key={p.barcode} style={ps.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={ps.rowName}>{p.nombre}</div>
                  <div style={ps.rowSub}>{p.barcode}</div>
                </div>
                <span
                  style={{
                    ...ps.badge,
                    background: p.unidades === 0 ? "#ffebee" : "#fff8e1",
                    color: p.unidades === 0 ? "#c62828" : "#e65100",
                  }}
                >
                  {p.unidades === 0 ? "Sin stock" : "Stock bajo"}
                </span>
                <div style={{ ...ps.rowQty, color: p.unidades === 0 ? "#c62828" : "#e65100" }}>
                  {p.unidades} uds.
                </div>
              </div>
            ))
          )}
        </Card>

        <Card
          title="Ventas recientes"
          right={
            <button style={ps.link} onClick={() => goTo("Historial de ventas")}>
              Ver historial →
            </button>
          }
        >
          {ventas.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState
                icon="🧾"
                title="Aún no hay ventas"
                hint="Cobra en Ventas para empezar."
                action={
                  <button style={ps.cta} onClick={() => goTo("Ventas")}>
                    Nueva venta
                  </button>
                }
              />
            </div>
          ) : (
            ventas.slice(0, 6).map((v) => (
              <div key={v.id} style={ps.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={ps.rowName}>{v.cliente?.nombre || "Consumidor final"}</div>
                  <div style={ps.rowSub}>
                    {fechaHoraCorta(v.fecha)} · {v.metodoPago}
                    {v.usuarioNombre && ` · ${v.usuarioNombre}`}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a237e" }}>{money(v.total)}</div>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}

const ps = {
  kpis: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12, marginBottom: 20,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  link: { fontSize: 12, color: "#1a237e", background: "none", border: "none", cursor: "pointer", fontWeight: 600 },
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "11px 18px",
    borderTop: "0.5px solid #f0f1f5",
  },
  rowName: { fontSize: 13, fontWeight: 600, color: "#1a1c2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  rowSub: { fontSize: 11, color: "#8a8fa8" },
  rowQty: { fontSize: 13, fontWeight: 700, minWidth: 58, textAlign: "right" },
  badge: { display: "inline-flex", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  cta: {
    padding: "9px 16px", background: "#1a237e", color: "#fff", border: "none",
    borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};

const ROUTES = {
  Dashboard: null, // Panel
  Escanear: ScanProduct,
  "Ventas": NewSale,
  Inventario: InventoryDashboard,
  "Historial de ventas": SalesHistory,
  "Análisis de ventas": SalesAnalytics,
  Clientes,
  Usuarios,
};

export default function Dashboard() {
  const { rol } = useAuth();
  const permitidas = useMemo(() => seccionesPermitidas(rol), [rol]);

  const [activeNav, setActiveNav] = useState(() => seccionInicial(rol));
  const [menuOpen, setMenuOpen] = useState(false);

  // Si el usuario no puede ver la sección actual (p. ej. cambió de rol), lo devolvemos a la inicial.
  const seccionActual = permitidas.includes(activeNav) ? activeNav : seccionInicial(rol);
  const ActivePage = ROUTES[seccionActual];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f5f9", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        .app-content { padding: 24px 24px 100px; }
        @media (max-width: 860px) {
          .app-shell { padding-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
          .topbar-actions { display: none !important; }
          .app-content { padding: 16px 14px 104px; }
        }
        .sidebar-backdrop {
          display: none;
          position: fixed; inset: 0; background: rgba(15,18,40,0.4); z-index: 99;
        }
        @media (max-width: 860px) {
          .sidebar-backdrop.show { display: block; }
        }
      `}</style>

      <Sidebar
        activeNav={seccionActual}
        setActiveNav={setActiveNav}
        permitidas={permitidas}
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
      />
      <div
        className={`sidebar-backdrop${menuOpen ? " show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className="app-shell" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, maxWidth: "100%", overflowX: "hidden", paddingLeft: 264 }}>
        <header style={{ height: 52, background: "#fff", borderBottom: "0.5px solid #e8eaf0", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(true)}
            style={{ display: "none", width: 34, height: 34, borderRadius: 8, border: "0.5px solid #e8eaf0", background: "#fff", cursor: "pointer", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1a1c2e" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>

          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1c2e" }}>{seccionActual}</div>

          <span style={{ marginLeft: "auto" }} />
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              title={supabaseReady ? "Conectado a Supabase" : "Guardando solo en este dispositivo"}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a8fa8" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: supabaseReady ? "#2e7d32" : "#c9ccd6" }} />
              {supabaseReady ? "Supabase" : "Local"}
            </span>
            <button
              onClick={() => setActiveNav("Ventas")}
              style={{ padding: "7px 16px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              + Nueva venta
            </button>
          </div>
        </header>

        <div className="app-content" style={{ flex: 1, minWidth: 0 }}>
          {ActivePage ? <ActivePage /> : <Panel goTo={setActiveNav} />}
        </div>

        {seccionActual !== "Ventas" && (
          <button
            onClick={() => setActiveNav("Ventas")}
            title="Nueva venta"
            aria-label="Nueva venta"
            style={{ position: "fixed", bottom: 28, right: 28, width: 52, height: 52, borderRadius: "50%", background: "#1a237e", color: "white", border: "none", fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(26,35,126,0.35)", zIndex: 100 }}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
