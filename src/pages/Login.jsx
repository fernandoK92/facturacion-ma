import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState("login"); // login | registro
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cargando, setCargando] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setCargando(true);
    try {
      if (modo === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, nombre.trim());
        setOk("Cuenta creada. Ya puedes iniciar sesión.");
        setModo("login");
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={s.logo}>🧺</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1c2e" }}>Su Market</div>
            <div style={{ fontSize: 12, color: "#8a8fa8" }}>Punto de venta</div>
          </div>
        </div>

        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(modo === "login" ? s.tabOn : null) }}
            onClick={() => { setModo("login"); setError(""); }}
          >
            Iniciar sesión
          </button>
          <button
            style={{ ...s.tab, ...(modo === "registro" ? s.tabOn : null) }}
            onClick={() => { setModo("registro"); setError(""); }}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {modo === "registro" && (
            <label style={s.field}>
              <span style={s.lbl}>Nombre</span>
              <input style={s.input} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </label>
          )}
          <label style={s.field}>
            <span style={s.lbl}>Correo</span>
            <input
              style={s.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </label>
          <label style={s.field}>
            <span style={s.lbl}>Contraseña</span>
            <input
              style={s.input}
              type="password"
              autoComplete={modo === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          {error && <div style={s.error}>{error}</div>}
          {ok && <div style={s.ok}>{ok}</div>}

          <button type="submit" style={s.submit} disabled={cargando}>
            {cargando ? "Un momento…" : modo === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <p style={s.nota}>
          La primera cuenta que se crea es la <strong>propietaria</strong>. Las
          demás entran como <strong>vendedor</strong> y se ajustan desde la
          pantalla <em>Usuarios</em>.
        </p>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#f4f5f9", padding: 20,
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
  },
  card: {
    width: "100%", maxWidth: 380, background: "#fff", borderRadius: 16,
    border: "0.5px solid #e8eaf0", padding: 24, boxShadow: "0 10px 40px rgba(15,18,40,0.08)",
  },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  logo: { fontSize: 34 },
  tabs: {
    display: "flex", gap: 4, background: "#f4f5f9", borderRadius: 10, padding: 4, marginBottom: 18,
  },
  tab: {
    flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, border: "none",
    background: "transparent", color: "#8a8fa8", borderRadius: 8, cursor: "pointer",
  },
  tabOn: { background: "#fff", color: "#1a237e", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  lbl: { fontSize: 12, fontWeight: 600, color: "#5a5e78" },
  input: {
    padding: "12px 13px", fontSize: 15, border: "0.5px solid #d0d3e0", borderRadius: 9,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "10px 12px", borderRadius: 9 },
  ok: { background: "#e8f5e9", color: "#2e7d32", fontSize: 13, padding: "10px 12px", borderRadius: 9 },
  submit: {
    marginTop: 4, padding: "13px", fontSize: 15, fontWeight: 700, background: "#1a237e",
    color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
  },
  nota: { fontSize: 11, color: "#8a8fa8", lineHeight: 1.5, marginTop: 16, marginBottom: 0 },
};
