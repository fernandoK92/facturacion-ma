import { useState } from "react";
import { supabaseReady } from "../lib/supabase";
import { hayDatosLocales, subirDatosLocales } from "../lib/migrate";

/**
 * Aparece solo cuando Supabase está conectado y todavía hay datos
 * guardados en el navegador (de antes de la conexión). Permite subirlos.
 */
export default function MigrateBanner() {
  const [visible, setVisible] = useState(supabaseReady && hayDatosLocales());
  const [estado, setEstado] = useState("idle"); // idle | subiendo | ok | error
  const [msg, setMsg] = useState("");

  if (!visible) return null;

  async function subir() {
    setEstado("subiendo");
    try {
      const r = await subirDatosLocales();
      setMsg(`${r.productos} producto(s) y ${r.ventas} venta(s) subidos.`);
      setEstado("ok");
      setTimeout(() => setVisible(false), 3000);
    } catch (err) {
      setMsg(err.message);
      setEstado("error");
    }
  }

  return (
    <div style={s.wrap}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.title}>Datos guardados en este dispositivo</div>
        <div style={s.text}>
          {estado === "ok"
            ? msg
            : estado === "error"
            ? "Error: " + msg
            : "Hay productos y/o ventas guardados localmente. Súbelos a Supabase para tenerlos en todos los dispositivos."}
        </div>
      </div>
      {estado !== "ok" && (
        <button style={s.btn} onClick={subir} disabled={estado === "subiendo"}>
          {estado === "subiendo" ? "Subiendo…" : "Subir a Supabase"}
        </button>
      )}
    </div>
  );
}

const s = {
  wrap: {
    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    background: "#eef0fb", border: "0.5px solid #c7ccf0", borderRadius: 12,
    padding: "12px 16px", marginBottom: 16,
  },
  title: { fontSize: 13, fontWeight: 700, color: "#1a237e" },
  text: { fontSize: 12, color: "#41477a", marginTop: 2 },
  btn: {
    padding: "9px 16px", background: "#1a237e", color: "#fff", border: "none",
    borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
  },
};
