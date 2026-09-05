import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import LOGIN_LOGO from "../assets/login-logo.png";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState("login"); // login | registro
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cargando, setCargando] = useState(false);

  const esRegistro = modo === "registro";

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

  function cambiarModo(m) {
    setModo(m);
    setError("");
  }

  return (
    <>
      <style>{`
        :root{
          --tinta:#4a2c17;
          --acento:#c2670d;
          --acento-oscuro:#9a4f0a;
          --acento-claro:#fce6c8;
          --acento-linea:#f0c383;
          --muted:#9c8567;
          --muted-2:#c7b498;
          --borde:#efe3d0;
          --bg:#ffffff;
          --card-bg:#ffffff;
          --input-bg:#ffffff;
        }

        .sm-body{
          min-height:100vh;
          background:
            radial-gradient(65% 55% at 50% 38%, var(--acento-claro) 0%, #ffffff 75%);
          font-family:'Inter',system-ui,sans-serif;
          color:var(--tinta);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:32px 16px;
          box-sizing:border-box;
        }
        .sm-body *{ box-sizing:border-box; }

        .sm-page{
          width:100%;
          max-width:396px;
          display:flex;
          flex-direction:column;
          align-items:center;
          position:relative;
        }

        .sm-page::before{
          content:"";
          position:absolute;
          top:8%;
          left:50%;
          transform:translateX(-50%);
          width:86%;
          height:76%;
          background:radial-gradient(closest-side, rgba(194,103,13,.32), rgba(194,103,13,0) 72%);
          filter:blur(4px);
          z-index:0;
          pointer-events:none;
        }

        /* ---------- LOGO / HERO ---------- */
        .sm-logo-zone{
          display:flex;
          flex-direction:column;
          align-items:center;
          text-align:center;
          z-index:2;
          position:relative;
          margin-bottom:-38px;
        }

        .sm-logo-img{
          width:216px;
          max-width:70vw;
          height:auto;
          filter:drop-shadow(0 16px 22px rgba(74,44,23,.28)) drop-shadow(0 4px 8px rgba(194,103,13,.2));
          animation:sm-float 3.4s ease-in-out infinite;
        }
        @keyframes sm-float{
          0%,100%{ transform:translateY(0) rotate(0deg); }
          50%{ transform:translateY(-6px) rotate(-1deg); }
        }
        @media (prefers-reduced-motion: reduce){
          .sm-logo-img{ animation:none !important; }
        }

        /* ---------- CARD ---------- */
        .sm-card{
          width:100%;
          background:var(--card-bg);
          border:1px solid var(--acento-linea);
          border-top:3px solid var(--acento);
          border-radius:16px;
          padding:54px 28px 28px;
          box-shadow:
            0 24px 48px -20px rgba(74,44,23,.28),
            0 10px 22px -12px rgba(194,103,13,.24),
            0 2px 4px rgba(74,44,23,.05);
          position:relative;
          z-index:1;
        }
        @media (max-width:420px){
          .sm-card{ padding:48px 20px 22px; border-radius:14px; }
        }

        .sm-card-head{ margin-bottom:22px; }
        .sm-card-head h2{
          font-family:'Fredoka',sans-serif;
          font-weight:600;
          font-size:19px;
          margin:0 0 4px;
          color:var(--tinta);
        }
        .sm-card-head p{
          margin:0;
          color:var(--muted);
          font-size:13.5px;
        }

        .sm-tabs{
          position:relative;
          display:grid;
          grid-template-columns:1fr 1fr;
          border-bottom:1px solid var(--borde);
          margin-bottom:24px;
        }
        .sm-tab-highlight{
          position:absolute;
          bottom:-1px; left:0;
          width:50%;
          height:2px;
          background:var(--acento);
          transition:transform .3s cubic-bezier(.4,0,.2,1);
        }
        .sm-tab-highlight.signup{ transform:translateX(100%); }
        .sm-tab-btn{
          position:relative; z-index:1;
          border:none; background:transparent;
          padding:0 0 12px;
          font-family:'Inter',sans-serif;
          font-size:13.5px; font-weight:600;
          color:var(--muted-2);
          cursor:pointer;
          transition:color .25s ease;
        }
        .sm-tab-btn.active{ color:var(--tinta); }

        .sm-form{ display:flex; flex-direction:column; gap:16px; }
        .sm-field{ display:flex; flex-direction:column; gap:6px; }
        .sm-field label{ font-size:12.5px; font-weight:600; color:var(--tinta); }
        .sm-input-wrap{ position:relative; display:flex; align-items:center; width:100%; }
        .sm-input-wrap svg{
          position:absolute; left:13px;
          width:15px; height:15px;
          color:var(--muted-2);
          pointer-events:none;
          transition:color .2s ease;
        }
        .sm-input-wrap input{
          width:100%;
          padding:10.5px 14px 10.5px 36px;
          border-radius:10px;
          border:1px solid var(--acento-linea);
          background:var(--input-bg);
          color:var(--tinta);
          font-family:'Inter',sans-serif;
          font-size:13.5px;
          outline:none;
          box-shadow:
            0 2px 6px rgba(194,103,13,.12),
            0 1px 0 rgba(255,255,255,.6) inset;
          transition:border-color .2s ease, box-shadow .2s ease, transform .15s ease;
        }
        .sm-input-wrap input::placeholder{ color:var(--muted-2); }
        .sm-input-wrap input:focus{
          border-color:var(--acento);
          box-shadow:
            0 6px 14px rgba(194,103,13,.24),
            0 0 0 4px var(--acento-claro);
          transform:translateY(-1px);
        }
        .sm-input-wrap:focus-within svg{ color:var(--acento); }

        .sm-toggle-pass{
          position:absolute; right:12px; top:50%;
          transform:translateY(-50%);
          background:none; border:none; cursor:pointer;
          color:var(--muted-2); padding:0;
          width:22px; height:22px;
          display:flex; align-items:center; justify-content:center;
          z-index:2;
        }
        .sm-toggle-pass:hover{ color:var(--tinta); }
        .sm-pass-input{ padding-right:40px !important; }

        .sm-btn-entrar{
          margin-top:6px;
          padding:11.5px 18px;
          border:none; border-radius:9px;
          background:var(--acento);
          color:#fff;
          font-family:'Inter',sans-serif;
          font-size:14px; font-weight:600;
          cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background .15s ease, transform .1s ease;
        }
        .sm-btn-entrar:hover{ background:var(--acento-oscuro); }
        .sm-btn-entrar:active{ transform:scale(.99); }
        .sm-btn-entrar[data-loading="true"]{ pointer-events:none; opacity:.85; }
        .sm-btn-entrar:disabled{ pointer-events:none; opacity:.7; }
        .sm-spinner{
          width:14px; height:14px; border-radius:50%;
          border:2px solid rgba(255,255,255,.4);
          border-top-color:#fff;
          animation:sm-spin .7s linear infinite;
          display:inline-block;
        }
        @keyframes sm-spin{ to{ transform:rotate(360deg); } }

        .sm-alert{
          font-size:12.5px; padding:9px 12px; border-radius:9px;
          font-family:'Inter',sans-serif;
        }
        .sm-alert-error{ background:#fdecea; color:#b3261e; border:1px solid #f6c6c1; }
        .sm-alert-ok{ background:#eaf6ec; color:#1e7a34; border:1px solid #bfe3c6; }
      `}</style>

      <div className="sm-body">
        <div className="sm-page">

          <div className="sm-logo-zone">
            <img className="sm-logo-img" src={LOGIN_LOGO} alt="Su Market" />
          </div>

          <div className="sm-card">
            <div className="sm-card-head">
              <h2>{esRegistro ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2>
              <p>
                {esRegistro
                  ? "Configura el acceso de tu minimercado"
                  : "Ingresa tus datos para abrir la caja"}
              </p>
            </div>

            <div className="sm-tabs">
              <div className={`sm-tab-highlight ${esRegistro ? "signup" : ""}`} />
              <button
                type="button"
                className={`sm-tab-btn ${!esRegistro ? "active" : ""}`}
                onClick={() => cambiarModo("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={`sm-tab-btn ${esRegistro ? "active" : ""}`}
                onClick={() => cambiarModo("registro")}
              >
                Crear cuenta
              </button>
            </div>

            <form className="sm-form" onSubmit={submit}>
              {esRegistro && (
                <div className="sm-field">
                  <label htmlFor="nombre">Nombre</label>
                  <div className="sm-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      id="nombre"
                      placeholder="Tu nombre completo"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="sm-field">
                <label htmlFor="email">Correo</label>
                <div className="sm-input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 6-10 7L2 6" />
                  </svg>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sm-field">
                <label htmlFor="pass">Contraseña</label>
                <div className="sm-input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    className="sm-pass-input"
                    type={showPass ? "text" : "password"}
                    id="pass"
                    autoComplete={modo === "login" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="sm-toggle-pass"
                    aria-label="Mostrar contraseña"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && <div className="sm-alert sm-alert-error">{error}</div>}
              {ok && <div className="sm-alert sm-alert-ok">{ok}</div>}

              <button
                className="sm-btn-entrar"
                type="submit"
                disabled={cargando}
                data-loading={cargando ? "true" : "false"}
              >
                {cargando && <span className="sm-spinner" />}
                <span>{cargando ? "Un momento…" : esRegistro ? "Crear cuenta" : "Entrar"}</span>
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
