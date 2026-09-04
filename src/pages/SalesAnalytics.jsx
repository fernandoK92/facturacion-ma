import { useMemo } from "react";
import { useSales } from "../hooks/useSales";
import { PageHeader, Card, KpiCard, EmptyState } from "../components/ui";
import { money } from "../lib/format";

export default function SalesAnalytics() {
  const ventas = useSales();

  const data = useMemo(() => {
    if (ventas.length === 0) return null;

    const totalVendido = ventas.reduce((a, v) => a + v.total, 0);
    const ticket = totalVendido / ventas.length;

    const porMetodo = {};
    const porProducto = {};
    for (const v of ventas) {
      porMetodo[v.metodoPago] = (porMetodo[v.metodoPago] || 0) + v.total;
      for (const it of v.items) {
        const p = (porProducto[it.nombre] ||= { unidades: 0, importe: 0 });
        p.unidades += it.cantidad;
        p.importe += it.precio * it.cantidad;
      }
    }

    const topProductos = Object.entries(porProducto)
      .sort((a, b) => b[1].importe - a[1].importe)
      .slice(0, 8);

    return { totalVendido, ticket, porMetodo, topProductos };
  }, [ventas]);

  return (
    <div>
      <PageHeader title="Análisis de ventas" subtitle="Resumen de lo vendido" />

      {!data ? (
        <EmptyState
          icon="📈"
          title="Todavía no hay datos"
          hint="Cobra alguna venta para ver el análisis."
        />
      ) : (
        <>
          <div style={s.kpis}>
            <KpiCard label="Vendido" value={money(data.totalVendido)} tone="green" />
            <KpiCard label="N.º de ventas" value={ventas.length} />
            <KpiCard label="Ticket promedio" value={money(data.ticket)} />
          </div>

          <div style={s.grid}>
            <Card title="Productos más vendidos">
              <div style={{ padding: "6px 0" }}>
                {data.topProductos.map(([nombre, info]) => {
                  const max = data.topProductos[0][1].importe || 1;
                  return (
                    <div key={nombre} style={s.barRow}>
                      <div style={s.barInfo}>
                        <span style={s.barName}>{nombre}</span>
                        <span style={s.barVal}>
                          {info.unidades} uds · {money(info.importe)}
                        </span>
                      </div>
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${(info.importe / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Por método de pago">
              <div style={{ padding: "8px 18px 16px" }}>
                {Object.entries(data.porMetodo).map(([m, importe]) => (
                  <div key={m} style={s.metodoRow}>
                    <span>{m}</span>
                    <strong>{money(importe)}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>
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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  barRow: { padding: "8px 18px" },
  barInfo: { display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  barName: { fontSize: 13, color: "#1a1c2e", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  barVal: { fontSize: 11, color: "#8a8fa8", flexShrink: 0 },
  barTrack: { height: 6, borderRadius: 3, background: "#f0f1f5", overflow: "hidden" },
  barFill: { height: "100%", background: "#1a237e", borderRadius: 3 },
  metodoRow: {
    display: "flex", justifyContent: "space-between", fontSize: 13, color: "#1a1c2e",
    padding: "6px 0", borderBottom: "0.5px solid #f0f1f5",
  },
};
