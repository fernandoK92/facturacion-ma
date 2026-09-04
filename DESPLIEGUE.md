# Subir Su Market a Vercel

El proyecto ya tiene git inicializado y un primer commit. Falta subirlo a
GitHub y conectarlo a Vercel.

---

## 1. Subir el código a GitHub

Con **GitHub Desktop** (ya lo tienes instalado):

1. Abre GitHub Desktop → **File → Add local repository…**
2. Elige la carpeta `facturacion-ma`
3. Arriba dice "Publish repository" → clic
4. Nombre: `su-market` (o el que quieras). **Márcalo como Private** (recomendado).
5. **Publish repository**

> El archivo `.env` NO se sube (está en `.gitignore`) — tus claves quedan solo en tu PC y en Vercel.

## 2. Crear el proyecto en Vercel

1. Entra a <https://vercel.com> → inicia sesión (puedes usar tu cuenta de GitHub)
2. **Add New… → Project**
3. Busca el repo `su-market` → **Import**
4. Vercel detecta **Vite** solo. No cambies nada de:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `.` (déjalo así)

## 3. Agregar las variables de entorno (IMPORTANTE)

Antes de darle Deploy, abre **Environment Variables** y agrega estas dos
(los mismos valores de tu archivo `.env`):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://txyraelzgeegfzyslxgi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | tu publishable key completa (`sb_publishable_…`) |

Deja marcadas las 3 casillas (Production, Preview, Development).

## 4. Deploy

Clic en **Deploy**. En ~1 minuto te da una URL tipo
`https://su-market.vercel.app`.

## 5. Avisarle a Supabase la URL nueva

Supabase → tu proyecto → **Authentication → URL Configuration**:

- **Site URL**: pega la URL de Vercel (`https://su-market.vercel.app`)
- **Redirect URLs**: agrega también `https://su-market.vercel.app/**`

(Sin esto el login funciona igual con correo/contraseña, pero si algún día
usas "recuperar contraseña" por correo, hace falta.)

---

## De ahí en adelante

Cada vez que hagas un cambio: **Commit** en GitHub Desktop → **Push** → Vercel
lo despliega solo en ~1 minuto. No hay que volver a configurar nada.

Si cambias las claves de Supabase, actualízalas en Vercel
(**Settings → Environment Variables**) y dale **Redeploy**.
