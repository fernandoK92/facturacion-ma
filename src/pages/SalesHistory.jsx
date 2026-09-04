import { useMemo, useState } from "react";
import { useSales } from "../hooks/useSales";
import { PageHeader, Card, KpiCard, EmptyState } from "../components/ui";
import { money, fechaHoraCorta, fechaHoraLarga } from "../lib/format";
import { ROLES, ETIQUETA_ROL } from "../lib/permisos";

const numArticulos = (v) => v.items.reduce((a, it) => a + it.cantidad, 0);
const TIPO_ICON = { recarga: "📱 ", bus: "🚌 " };

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function SalesHistory() {
  const ventas = useSales();
  const [abierta, setAbierta] = useState(null);

  const [rolFiltro, setRolFiltro] = useState("todos");
  const [cajeroFiltro, setCajeroFiltro] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Cajeros con al menos una venta, para el selector (se recalcula si
  // cambia el rol elegido, para no listar gente de otro rol).
  const cajeros = useMemo(() => {
    const set = new Map();
    ventas
      .filter((v) => rolFiltro === "todos" || v.usuarioRol === rolFiltro)
      .forEach((v) => {
        if (v.usuarioNombre) set.set(v.usuarioNombre, v.usuarioRol);
      });
    return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ventas, rolFiltro]);

  const ventasFiltradas = useMemo(() => {
    const desdeMs = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const hastaMs = hasta ? new Date(`${hasta}T23:59:59.999`).getTime() : null;
    return ventas.filter((v) => {
      if (rolFiltro !== "todos" && v.usuarioRol !== rolFiltro) return false;
      if (cajeroFiltro !== "todos" && v.usuarioNombre !== cajeroFiltro) return false;
      if (desdeMs !== null && v.fecha < desdeMs) return false;
      if (hastaMs !== null && v.fecha > hastaMs) return false;
      return true;
    });
  }, [ventas, rolFiltro, cajeroFiltro, desde, hasta]);

  const hoyMs = inicioDeHoy();
  const hoy = useMemo(() => {
    const list = ventasFiltradas.filter((v) => v.fecha >= hoyMs);
    return { numVentas: list.length, totalVendido: list.reduce((a, v) => a + v.total, 0) };
  }, [ventasFiltradas, hoyMs]);
  const totalFiltrado = ventasFiltradas.reduce((a, v) => a + v.total, 0);

  const hayFiltros = rolFiltro !== "todos" || cajeroFiltro !== "todos" || desde || hasta;

  function limpiarFiltros() {
    setRolFiltro("todos");
    setCajeroFiltro("todos");
    setDesde("");
    setHasta("");
  }

  function elegirRol(r) {
    setRolFiltro(r);
    setCajeroFiltro("todos"); // el cajero puede no pertenecer al nuevo rol
  }

  return (
    <div>
      <PageHeader title="Historial de ventas" subtitle="Ventas registradas en la caja" />

      <div style={s.kpis}>
        <KpiCard label="Ventas hoy" value={hoy.numVentas} tone="neutral" />
        <KpiCard label="Cobrado hoy" value={money(hoy.totalVendido)} tone="green" />
        <KpiCard label={hayFiltros ? "Ventas filtradas" : "Ventas totales"} value={ventasFiltradas.length} />
        <KpiCard label={hayFiltros ? "Total filtrado" : "Acumulado"} value={money(totalFiltrado)} />
      </div>

      {ventas.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Aún no hay ventas"
          hint="Cuando cobres en Ventas, las ventas aparecerán aquí."
        />
      ) : (
        <>
          <div style={s.filtros}>
            <div style={s.filtroGrupo}>
              <span style={s.filtroLbl}>Rol</span>
              <div style={s.chipRow}>
                <button
                  style={{ ...s.chip, ...(rolFiltro === "todos" ? s.chipOn : null) }}
                  onClick={() => elegirRol("todos")}
                >
                  Todos
                </button>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    style={{ ...s.chip, ...(rolFiltro === r ? s.chipOn : null) }}
                    onClick={() => elegirRol(r)}
                  >
                    {ETIQUETA_ROL[r] ?? r}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.filtroGrupo}>
              <span style={s.filtroLbl}>Cajero</span>
              <select
                style={s.select}
                value={cajeroFiltro}
                onChange={(e) => setCajeroFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                {cajeros.map(([nombre, rol]) => (
                  <option key={nombre} value={nombre}>
                    {nombre}{rol ? ` (${ETIQUETA_ROL[rol] ?? rol})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.filtroGrupo}>
              <span style={s.filtroLbl}>Desde</span>
              <input
                type="date"
                style={s.dateInput}
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div style={s.filtroGrupo}>
              <span style={s.filtroLbl}>Hasta</span>
              <input
                type="date"
                style={s.dateInput}
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>

            {hayFiltros && (
              <button style={s.limpiarBtn} onClick={limpiarFiltros}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>

          {ventasFiltradas.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="Ninguna venta coincide con el filtro"
              hint="Probá con otro rol, cajero o rango de fechas."
            />
          ) : (
            <Card
              title="Ventas"
              subtitle={hayFiltros ? `${ventasFiltradas.length} de ${ventas.length} registros` : `${ventas.length} registros`}
            >
              {ventasFiltradas.map((v) => {
                const open = abierta === v.id;
                return (
                  <div key={v.id} style={{ borderTop: "0.5px solid #f0f1f5" }}>
                    <button
                      style={s.row}
                      onClick={() => setAbierta(open ? null : v.id)}
                    >
                      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1c2e" }}>
                          {v.cliente?.nombre || "Consumidor final"}
                        </div>
                        <div style={{ fontSize: 11, color: "#8a8fa8" }}>
                          {v.id} · {fechaHoraCorta(v.fecha)} · {v.metodoPago} · {numArticulos(v)} art.
                          {v.usuarioNombre && (
                            <> · {v.usuarioNombre}{v.usuarioRol && ` (${ETIQUETA_ROL[v.usuarioRol] ?? v.usuarioRol})`}</>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a237e" }}>
                        {money(v.total)}
                      </div>
                      <span style={{ color: "#c0c3d0", fontSize: 12, width: 14, textAlign: "center" }}>
                        {open ? "▲" : "▼"}
                      </span>
                    </button>

                    {open && (
                      <div style={s.detail}>
                        <div style={s.detailFecha}>📅 {fechaHoraLarga(v.fecha)}</div>
                        {v.items.map((it) => (
                          <div key={it.barcode} style={s.detailRow}>
                            <span style={{ flex: 1 }}>
                              {TIPO_ICON[it.tipo] ?? ""}{it.nombre}
                              <span style={{ color: "#8a8fa8" }}> × {it.cantidad}</span>
                            </span>
                            <span>{money(it.precio * it.cantidad)}</span>
                          </div>
                        ))}
                        {(v.cliente?.documento || v.cliente?.telefono) && (
                          <div style={{ fontSize: 11, color: "#8a8fa8", marginTop: 6 }}>
                            {v.cliente.documento && `Doc: ${v.cliente.documento}`}
                            {v.cliente.documento && v.cliente.telefono && " · "}
                            {v.cliente.telefono && `Tel: ${v.cliente.telefono}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  kpis: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12, marginBottom: 20,
  },
  filtros: {
    display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14,
    background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 12,
    padding: 14, marginBottom: 14,
  },
  filtroGrupo: { display: "flex", flexDirection: "column", gap: 6 },
  filtroLbl: { fontSize: 11, fontWeight: 600, color: "#8a8fa8" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    padding: "7px 12px", fontSize: 12, fontWeight: 600, background: "#f4f5f9",
    color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 999, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  chipOn: { background: "#1a237e", color: "#fff", borderColor: "#1a237e" },
  select: {
    padding: "8px 10px", fontSize: 13, border: "0.5px solid #d0d3e0", borderRadius: 8,
    outline: "none", background: "#fff", color: "#1a1c2e", minWidth: 160,
  },
  dateInput: {
    padding: "7px 10px", fontSize: 13, border: "0.5px solid #d0d3e0", borderRadius: 8,
    outline: "none", background: "#fff", color: "#1a1c2e",
  },
  limpiarBtn: {
    padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#fff",
    color: "#c62828", border: "0.5px solid #f3c6c6", borderRadius: 8, cursor: "pointer",
    height: 34,
  },
  row: {
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    padding: "12px 18px", background: "none", border: "none", cursor: "pointer",
  },
  detail: { padding: "0 18px 14px 18px", background: "#fafbfc" },
  detailFecha: { fontSize: 11, color: "#5a5e78", fontWeight: 600, padding: "10px 0 6px" },
  detailRow: {
    display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1a1c2e",
    padding: "4px 0",
  },
};
