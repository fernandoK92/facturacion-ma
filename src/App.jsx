import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function Gate() {
  const { loading, authRequerida, session, cuentaDesactivada, signOut } = useAuth();

  if (loading) {
    return (
      <div style={splash}>
        <span style={{ fontSize: 34 }}>🧺</span>
        <div style={{ fontSize: 13, color: "#8a8fa8", marginTop: 10 }}>Cargando…</div>
      </div>
    );
  }

  // Sin Supabase configurado: la app corre sin login (modo local).
  if (authRequerida && !session) return <Login />;

  if (cuentaDesactivada) {
    return (
      <div style={splash}>
        <span style={{ fontSize: 34 }}>🔒</span>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1c2e", marginTop: 12 }}>
          Cuenta desactivada
        </div>
        <div style={{ fontSize: 13, color: "#8a8fa8", marginTop: 4, textAlign: "center", maxWidth: 300 }}>
          Tu acceso al sistema fue desactivado. Contacta a la propietaria.
        </div>
        <button
          onClick={signOut}
          style={{ marginTop: 18, padding: "10px 20px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Salir
        </button>
      </div>
    );
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

const splash = {
  minHeight: "100vh", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", background: "#f4f5f9",
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
};
