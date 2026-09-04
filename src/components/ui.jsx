// Piezas de UI compartidas entre las pantallas.

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1c2e", margin: 0 }}>{title}</h1>
      {subtitle && (
        <p style={{ fontSize: 13, color: "#8a8fa8", marginTop: 2 }}>{subtitle}</p>
      )}
    </div>
  );
}

export function Card({ title, subtitle, right, children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e8eaf0",
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || right) && (
        <div
          style={{
            padding: "14px 18px",
            borderBottom: children ? "0.5px solid #e8eaf0" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            {title && (
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1c2e" }}>{title}</div>
            )}
            {subtitle && (
              <div style={{ fontSize: 12, color: "#8a8fa8", marginTop: 1 }}>{subtitle}</div>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function KpiCard({ icon, label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#eef0fb", fg: "#1a237e" },
    green: { bg: "#e8f5e9", fg: "#2e7d32" },
    amber: { bg: "#fff8e1", fg: "#e65100" },
    red: { bg: "#ffebee", fg: "#c62828" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e8eaf0", borderRadius: 12, padding: 16 }}>
      {icon && (
        <div
          style={{
            width: 34, height: 34, borderRadius: 9, marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: t.bg, color: t.fg, fontSize: 18,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 12, color: "#8a8fa8", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: tone === "red" ? "#c62828" : "#1a1c2e" }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 11, color: "#8a8fa8", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, hint, action }) {
  return (
    <div
      style={{
        padding: "40px 20px", textAlign: "center", background: "#fff",
        border: "2px dashed #d0d3e0", borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1c2e" }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: "#8a8fa8", marginTop: 4 }}>{hint}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
