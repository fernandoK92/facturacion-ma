import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseReady } from "../lib/supabase";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

async function cargarPerfil(userId) {
  const { data, error } = await supabase
    .from("perfiles")
    .select("nombre, correo, rol, activo")
    .eq("id", userId)
    .single();
  if (error || !data) return { nombre: "", rol: "vendedor", activo: true };
  return { activo: true, ...data };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  // Sin Supabase configurado no hay auth: la app arranca sin pantalla de carga.
  const [loading, setLoading] = useState(supabaseReady);

  useEffect(() => {
    if (!supabaseReady) return;

    let vivo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      if (data.session) setPerfil(await cargarPerfil(data.session.user.id));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, ses) => {
      if (!vivo) return;
      setSession(ses);
      setPerfil(ses ? await cargarPerfil(ses.user.id) : null);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = {
    loading,
    authRequerida: supabaseReady,
    session,
    user: session?.user ?? null,
    perfil,
    rol: supabaseReady ? perfil?.rol : "admin", // sin auth -> acceso total
    nombre: perfil?.nombre || session?.user?.email || "",
    cuentaDesactivada: Boolean(supabaseReady && session && perfil && perfil.activo === false),

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(traducir(error.message));
    },

    async signUp(email, password, nombre) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });
      if (error) throw new Error(traducir(error.message));
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async refrescarPerfil() {
      if (session) setPerfil(await cargarPerfil(session.user.id));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function traducir(msg) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Falta confirmar el correo. Revisa tu bandeja o desactiva la confirmación en Supabase.";
  if (m.includes("already registered")) return "Ese correo ya tiene una cuenta.";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("signups not allowed")) return "El registro está desactivado. Pídele a la propietaria que te cree la cuenta.";
  return msg;
}
