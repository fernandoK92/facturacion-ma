import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ROLES, ETIQUETA_ROL } from "../lib/permisos";
import { PageHeader, Card, EmptyState } from "../components/ui";

export default function Usuarios() {
  const { user, refrescarPerfil } = useAuth();
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(Boolean(supabase));
  const [error, setError] = useState(
    supabase ? "" : "La gestión de usuarios requiere conexión a Supabase."
  );
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState("");
  const [confirmDel, setConfirmDel] = useState("");
  const [editando, setEditando] = useState(""); // id en modo edición
  const [form, setForm] = useState({ nombre: "", correo: "", password: "" });

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    (async () => {
      const { data, error } = await supabase
        .from("perfiles")
        .select("id, nombre, correo, rol, activo, creado_en")
        .order("creado_en", { ascending: true });
      if (!vivo) return;
      if (error) setError(error.message);
      else setLista(data);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  function flashAviso(msg) {
    setAviso(msg);
    setTimeout(() => setAviso(""), 4000);
  }

  // Cambios directos en perfiles (rol, activo)
  async function patch(id, campos) {
    setGuardando(id);
    setError("");
    const { error } = await supabase.from("perfiles").update(campos).eq("id", id);
    if (error) setError(error.message);
    else {
      setLista((prev) => prev.map((u) => (u.id === id ? { ...u, ...campos } : u)));
      if (id === user?.id) await refrescarPerfil();
    }
    setGuardando("");
  }

  function abrirEdicion(u) {
    setForm({ nombre: u.nombre ?? "", correo: u.correo ?? "", password: "" });
    setEditando(u.id);
    setError("");
  }

  async function guardarEdicion(id) {
    setGuardando(id);
    setError("");
    const { error } = await supabase.rpc("actualizar_usuario", {
      p_id: id,
      p_nombre: form.nombre.trim() || null,
      p_correo: form.correo.trim() || null,
      p_password: form.password ? form.password : null,
    });
    if (error) {
      setError(error.message);
    } else {
      setLista((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, nombre: form.nombre.trim() || u.nombre, correo: form.correo.trim() || u.correo }
            : u
        )
      );
      setEditando("");
      if (id === user?.id) {
        await refrescarPerfil();
        if (form.correo || form.password)
          flashAviso("Cambiaste tu correo o contraseña: vuelve a iniciar sesión.");
      } else {
        flashAviso("Usuario actualizado.");
      }
    }
    setGuardando("");
  }

  async function eliminar(id) {
    setGuardando(id);
    setError("");
    const { error } = await supabase.rpc("eliminar_usuario", { p_id: id });
    if (error) setError(error.message);
    else setLista((prev) => prev.filter((u) => u.id !== id));
    setConfirmDel("");
    setGuardando("");
  }

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Roles, accesos y datos del personal" />

      {error && <div style={s.error}>{error}</div>}
      {aviso && <div style={s.aviso}>{aviso}</div>}

      {cargando ? (
        <div style={{ fontSize: 13, color: "#8a8fa8" }}>Cargando…</div>
      ) : lista.length === 0 ? (
        <EmptyState icon="👥" title="Sin usuarios" hint="Crea cuentas desde la pantalla de inicio de sesión." />
      ) : (
        <Card title={`${lista.length} usuario(s)`}>
          {lista.map((u) => {
            const soyYo = u.id === user?.id;
            const ocupado = guardando === u.id;
            const enEdicion = editando === u.id;
            return (
              <div key={u.id} style={{ borderTop: "0.5px solid #f0f1f5" }}>
                <div style={{ ...s.row, opacity: u.activo ? 1 : 0.55 }}>
                  <div style={s.info}>
                    <div style={s.nombre}>
                      {u.nombre || "Sin nombre"}
                      {soyYo && <span style={s.tu}> · tú</span>}
                      {!u.activo && <span style={s.inactivo}> · inactivo</span>}
                    </div>
                    <div style={s.correo}>{u.correo || "—"}</div>
                    <div style={s.sub}>Alta: {new Date(u.creado_en).toLocaleDateString("es")}</div>
                  </div>

                  <div style={s.controles}>
                    <select
                      style={s.select}
                      value={u.rol}
                      disabled={ocupado || soyYo}
                      title={soyYo ? "No puedes cambiar tu propio rol" : ""}
                      onChange={(e) => patch(u.id, { rol: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                      ))}
                    </select>

                    <button
                      style={{ ...s.toggle, ...(u.activo ? s.toggleOn : s.toggleOff) }}
                      disabled={ocupado || soyYo}
                      title={soyYo ? "No puedes desactivarte" : u.activo ? "Desactivar" : "Activar"}
                      onClick={() => patch(u.id, { activo: !u.activo })}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </button>

                    <button
                      style={s.iconBtn}
                      disabled={ocupado}
                      title="Editar datos"
                      onClick={() => (enEdicion ? setEditando("") : abrirEdicion(u))}
                    >
                      ✏️
                    </button>

                    {confirmDel === u.id ? (
                      <span style={s.delConfirm}>
                        <button style={s.delYes} disabled={ocupado} onClick={() => eliminar(u.id)}>
                          Eliminar
                        </button>
                        <button style={s.delNo} onClick={() => setConfirmDel("")}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        style={s.delBtn}
                        disabled={ocupado || soyYo}
                        title={soyYo ? "No puedes eliminar tu cuenta" : "Eliminar usuario"}
                        onClick={() => setConfirmDel(u.id)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {enEdicion && (
                  <div style={s.editPanel}>
                    <div style={s.editGrid}>
                      <label style={s.field}>
                        <span style={s.lbl}>Nombre</span>
                        <input
                          style={s.input}
                          value={form.nombre}
                          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        />
                      </label>
                      <label style={s.field}>
                        <span style={s.lbl}>Correo</span>
                        <input
                          style={s.input}
                          type="email"
                          value={form.correo}
                          onChange={(e) => setForm({ ...form, correo: e.target.value })}
                        />
                      </label>
                      <label style={s.field}>
                        <span style={s.lbl}>Nueva contraseña</span>
                        <input
                          style={s.input}
                          type="text"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Dejar en blanco para no cambiar"
                        />
                      </label>
                    </div>
                    <div style={s.editActions}>
                      <button style={s.cancelBtn} onClick={() => setEditando("")}>Cancelar</button>
                      <button
                        style={s.saveBtn}
                        disabled={ocupado}
                        onClick={() => guardarEdicion(u.id)}
                      >
                        {ocupado ? "Guardando…" : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <p style={s.nota}>
        <strong>Vendedor</strong> solo ve Escanear y Ventas. <strong>Administrador</strong> y{" "}
        <strong>Propietaria</strong> ven todo. <strong>Desactivar</strong> bloquea el acceso sin borrar
        el historial; <strong>Eliminar</strong> quita la cuenta por completo. El ✏️ permite cambiar
        nombre, correo y contraseña. Para crear una cuenta, la persona se registra en la pantalla de
        inicio de sesión.
      </p>
    </div>
  );
}

const s = {
  error: { background: "#ffebee", color: "#c62828", fontSize: 13, padding: "10px 12px", borderRadius: 9, marginBottom: 12 },
  aviso: { background: "#e8f5e9", color: "#2e7d32", fontSize: 13, padding: "10px 12px", borderRadius: 9, marginBottom: 12 },
  row: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", flexWrap: "wrap",
  },
  info: { flex: "1 1 200px", minWidth: 0 },
  nombre: { fontSize: 13, fontWeight: 600, color: "#1a1c2e" },
  tu: { color: "#1a237e", fontWeight: 600 },
  inactivo: { color: "#c62828", fontWeight: 600 },
  correo: { fontSize: 12, color: "#5a5e78", wordBreak: "break-all", marginTop: 2 },
  sub: { fontSize: 11, color: "#8a8fa8", marginTop: 1 },

  controles: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  select: {
    padding: "8px 10px", fontSize: 13, border: "0.5px solid #d0d3e0", borderRadius: 8,
    background: "#fff", color: "#1a1c2e", cursor: "pointer",
  },
  toggle: { padding: "8px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "0.5px solid" },
  toggleOn: { background: "#e8f5e9", color: "#2e7d32", borderColor: "#b8dcb9" },
  toggleOff: { background: "#f4f5f9", color: "#8a8fa8", borderColor: "#e8eaf0" },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8, border: "0.5px solid #e8eaf0", background: "#fff",
    fontSize: 14, cursor: "pointer",
  },
  delBtn: {
    width: 34, height: 34, borderRadius: 8, border: "0.5px solid #f3c6c6", background: "#fff",
    color: "#c62828", fontSize: 14, cursor: "pointer",
  },
  delConfirm: { display: "flex", gap: 6 },
  delYes: { padding: "8px 12px", fontSize: 12, fontWeight: 700, background: "#c62828", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  delNo: { padding: "8px 12px", fontSize: 12, fontWeight: 600, background: "#fff", color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer" },

  editPanel: { padding: "4px 18px 16px", background: "#fafbfc" },
  editGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  lbl: { fontSize: 11, fontWeight: 600, color: "#5a5e78" },
  input: {
    padding: "9px 11px", fontSize: 13, border: "0.5px solid #d0d3e0", borderRadius: 8,
    outline: "none", background: "#fff", color: "#1a1c2e", boxSizing: "border-box", width: "100%",
  },
  editActions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  cancelBtn: { padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "#fff", color: "#5a5e78", border: "0.5px solid #e8eaf0", borderRadius: 8, cursor: "pointer" },
  saveBtn: { padding: "9px 16px", fontSize: 13, fontWeight: 700, background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },

  nota: { fontSize: 11, color: "#8a8fa8", lineHeight: 1.6, marginTop: 14 },
};
