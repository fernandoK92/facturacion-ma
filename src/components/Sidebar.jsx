
// Logo animado SVG inspirado en el carrito con vegetales
function AnimatedLogo() {
  return (
    <>
      <style>{`
        @keyframes cartBounce {
          0%, 100% { transform: translateY(0); }
          30%       { transform: translateY(-4px); }
          50%       { transform: translateY(-2px); }
          70%       { transform: translateY(-5px); }
        }
        @keyframes vegBob1 {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25%       { transform: rotate(-8deg) translateY(-2px); }
          75%       { transform: rotate(5deg) translateY(-1px); }
        }
        @keyframes vegBob2 {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25%       { transform: rotate(6deg) translateY(-3px); }
          75%       { transform: rotate(-4deg) translateY(-1px); }
        }
        @keyframes vegBob3 {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25%       { transform: rotate(-5deg) translateY(-1px); }
          75%       { transform: rotate(8deg) translateY(-3px); }
        }
        .cart-svg     { animation: cartBounce 2.5s ease-in-out infinite; transform-origin: center bottom; }
        .veg-eggplant { animation: vegBob1 2.5s ease-in-out infinite; transform-origin: 22px 23px; }
        .veg-carrot   { animation: vegBob2 2.5s ease-in-out infinite; transform-origin: 33px 22px; }
        .veg-tomato   { animation: vegBob3 2.5s ease-in-out infinite; transform-origin: 45px 23px; }
      `}</style>
      <svg
        className="cart-svg"
        width="52"
        height="58"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: 0 }}
      >
        {/* Cesta */}
        <path d="M4 10 Q8 10 10 16 L18 42" stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="14" y="28" width="38" height="18" rx="2" fill="#f97316" />
        {/* Líneas horizontales */}
        <line x1="14" y1="33" x2="52" y2="33" stroke="#e56a00" strokeWidth="0.8" />
        <line x1="14" y1="38" x2="52" y2="38" stroke="#e56a00" strokeWidth="0.8" />
        <line x1="14" y1="43" x2="52" y2="43" stroke="#e56a00" strokeWidth="0.8" />
        {/* Líneas verticales */}
        <line x1="22" y1="28" x2="22" y2="46" stroke="#e56a00" strokeWidth="0.8" />
        <line x1="30" y1="28" x2="30" y2="46" stroke="#e56a00" strokeWidth="0.8" />
        <line x1="38" y1="28" x2="38" y2="46" stroke="#e56a00" strokeWidth="0.8" />
        <line x1="46" y1="28" x2="46" y2="46" stroke="#e56a00" strokeWidth="0.8" />
        {/* Ruedas */}
        <circle cx="22" cy="52" r="5" fill="#1a1a1a" />
        <circle cx="22" cy="52" r="2" fill="#555" />
        <circle cx="44" cy="52" r="5" fill="#1a1a1a" />
        <circle cx="44" cy="52" r="2" fill="#555" />
        {/* Berenjena */}
        <g className="veg-eggplant">
          <ellipse cx="22" cy="23" rx="5" ry="7" fill="#7c3aed" />
          <path d="M22 16 Q24 12 27 13" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="22" cy="19" rx="2" ry="2.5" fill="#9f67f5" opacity="0.5" />
        </g>
        {/* Zanahoria */}
        <g className="veg-carrot">
          <ellipse cx="33" cy="22" rx="4.5" ry="6.5" fill="#fb923c" />
          <path d="M30 16 Q32 11 35 12" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M33 18 Q36 19 35 22" stroke="#ea6c0a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </g>
        {/* Tomate */}
        <g className="veg-tomato">
          <ellipse cx="45" cy="23" rx="5" ry="5.5" fill="#dc2626" />
          <path d="M43 17 Q45 13 47 14" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="43" cy="21" rx="1.5" ry="2" fill="#ef4444" opacity="0.5" />
        </g>
      </svg>
    </>
  );
}

import {
  TbLayoutDashboard,
  TbBarcode,
  TbCashRegister,
  TbPackages,
  TbReceipt,
  TbChartBar,
  TbUsers,
  TbUserCog,
} from "react-icons/tb";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_ROL } from "../lib/permisos";

const NAV_ITEMS = [
  { Icon: TbLayoutDashboard, label: "Dashboard", section: "main" },
  { Icon: TbBarcode, label: "Escanear", section: "main" },
  { Icon: TbCashRegister, label: "Terminal POS", section: "main" },
  { Icon: TbPackages, label: "Inventario", section: "main" },
  { Icon: TbReceipt, label: "Historial Facturas", section: "main" },
  { Icon: TbChartBar, label: "Análisis de ventas", section: "reports" },
  { Icon: TbUsers, label: "Clientes", section: "reports" },
  { Icon: TbUserCog, label: "Usuarios", section: "reports" },
];

export default function Sidebar({ activeNav, setActiveNav, permitidas, open = false, onNavigate }) {
  const { authRequerida, nombre, rol, signOut } = useAuth();
  const go = (label) => {
    setActiveNav(label);
    onNavigate?.();
  };

  const visibles = permitidas
    ? NAV_ITEMS.filter((n) => permitidas.includes(n.label))
    : NAV_ITEMS;
  const principales = visibles.filter((n) => n.section === "main");
  const reportes = visibles.filter((n) => n.section === "reports");

  const NavBtn = (item) => (
    <button
      key={item.label}
      className={`sidebar-nav-item${activeNav === item.label ? " active" : ""}`}
      onClick={() => go(item.label)}
    >
      <span className="sidebar-icon"><item.Icon size={19} /></span>
      <span>{item.label}</span>
    </button>
  );

  return (
    <aside className={`sidebar-modern${open ? " open" : ""}`}>
      <div className="sidebar-logo-area">
        <div className="sidebar-logo-icon" style={{background: 'none', marginBottom: 0, height: '58px', width: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <AnimatedLogo />
        </div>
        <div className="sidebar-brand">Su Market</div>
      </div>

      {principales.length > 0 && <div className="sidebar-section">PRINCIPAL</div>}
      {principales.map(NavBtn)}

      {reportes.length > 0 && (
        <div className="sidebar-section" style={{ marginTop: 16 }}>REPORTES</div>
      )}
      {reportes.map(NavBtn)}

      <div style={{ flex: 1 }} />

      <div className="sidebar-bottom">
        <button className="sidebar-new-sale-btn" onClick={() => go("Terminal POS")}>
          <span className="sidebar-plus">+</span> Nueva Venta
        </button>

        {authRequerida && (
          <div style={{ marginTop: 12, borderTop: "1.5px solid #e5e7eb", paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{nombre}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
              {ETIQUETA_ROL[rol] ?? rol}
            </div>
            <button
              onClick={signOut}
              style={{
                width: "100%", padding: "9px 0", background: "#fff", color: "#c62828",
                border: "1px solid #f3c6c6", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      <style>{`
        .sidebar-modern {
          width: 240px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-right: 1.5px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          padding: 0;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 2px 0 16px 0 rgba(30,41,59,0.04);
          scrollbar-width: none;         /* Firefox */
          -ms-overflow-style: none;      /* IE/Edge viejo */
        }
        .sidebar-modern::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .sidebar-logo-area {
          padding: 18px 20px 12px 24px;
          border-bottom: 1.5px solid #e5e7eb;
          margin-bottom: 4px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          background: #fff;
        }
        .sidebar-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #1a237e;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }
        .sidebar-brand {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
        }
        .sidebar-section {
          font-size: 11px;
          letter-spacing: 0.09em;
          color: #94a3b8;
          padding: 8px 24px 3px 28px;
          font-weight: 600;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 9px 24px 9px 28px;
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          border-left: 3px solid transparent;
          border-radius: 0 18px 18px 0;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          margin-bottom: 1px;
        }
        .sidebar-nav-item.active {
          background: linear-gradient(90deg, #f0f1fb 60%, #e0e7ff 100%);
          color: #1e40af;
          border-left: 3px solid #f97316;
          font-weight: 600;
          box-shadow: 0 2px 8px 0 rgba(30,41,59,0.03);
        }
        .sidebar-nav-item:hover:not(.active) {
          background: #f3f4f6;
          color: #0f172a;
        }
        .sidebar-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
        }
        .sidebar-bottom {
          padding: 8px 18px 16px 18px;
          margin-top: auto;
        }
        .sidebar-new-sale-btn {
          width: 100%;
          padding: 10px 0;
          background: linear-gradient(90deg, #f97316 60%, #fb923c 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 2px 8px 0 rgba(251,146,60,0.08);
          transition: background 0.15s, box-shadow 0.15s;
        }
        .sidebar-new-sale-btn:hover {
          background: linear-gradient(90deg, #fb923c 60%, #f97316 100%);
          box-shadow: 0 4px 16px 0 rgba(251,146,60,0.13);
        }
        .sidebar-plus {
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
        }
        @media (max-width: 860px) {
          .sidebar-modern {
            transform: translateX(-100%);
            transition: transform 0.22s ease;
            box-shadow: 0 0 40px rgba(15,18,40,0.25);
          }
          .sidebar-modern.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
}
