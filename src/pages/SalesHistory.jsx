import { useState } from "react";
import { useSales, useTodaySales } from "../hooks/useSales";
import { PageHeader, Card, KpiCard, EmptyState } from "../components/ui";
import { money } from "../lib/format";
import { ETIQUETA_ROL } from "../lib/permisos";

const fmtFecha = (ts) =>
  new Date(ts).toLocaleString("es", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

export default function SalesHistory() {
  const ventas = useSales();
  const hoy = useTodaySales();
  const [abierta, setAbierta] = useState(null);

  const totalHistorico = ventas.reduce((a, v) => a + v.total, 0);

  return (
    <div>
      <PageHeader title="Historial de ventas" subtitle="Ventas registradas en la caja" />

      <div style={s.kpis}>
        <KpiCard label="Ventas hoy" value={hoy.numVentas} tone="neutral" />
        <KpiCard label="Cobrado hoy" value={money(hoy.totalVendido)} tone="green" />
        <KpiCard label="Ventas totales" value={ventas.length} />
        <KpiCard label="Acumulado" value={money(totalHistorico)} />
      </div>

      {ventas.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Aún no hay ventas"
          hint="Cuando cobres en la Terminal POS, las ventas aparecerán aquí."
        />
      ) : (
        <Card title="Ventas" subtitle={`${ventas.length} registros`}>
          {ventas.map((v) => {
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
                      {v.id} · {fmtFecha(v.fecha)} · {v.metodoPago}
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
                    {v.items.map((it) => (
                      <div key={it.barcode} style={s.detailRow}>
                        <span style={{ flex: 1 }}>
                          {it.nombre}
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
    </div>
  );
}

const s = {
  kpis: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12, marginBottom: 20,
  },
  row: {
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    padding: "12px 18px", background: "none", border: "none", cursor: "pointer",
  },
  detail: { padding: "0 18px 14px 18px", background: "#fafbfc" },
  detailRow: {
    display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1a1c2e",
    padding: "4px 0",
  },
};
