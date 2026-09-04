# Conectar Facturación MA con Supabase

La app ya tiene todo el código listo. Solo faltan **3 pasos manuales** (una sola vez).

Mientras no completes estos pasos, la app sigue funcionando con almacenamiento
local del navegador (verás el indicador **"Local"** arriba a la derecha). Al
conectar Supabase cambia a **"Supabase"** y podrás subir tus datos locales con un
botón.

---

## 1. Crear el proyecto

1. Entra a <https://supabase.com> y crea una cuenta (gratis).
2. **New project** → ponle un nombre (ej. `facturacion-ma`), una contraseña de
   base de datos y elige la región más cercana.
3. Espera ~2 minutos a que termine de aprovisionarse.

## 2. Crear las tablas

1. En el proyecto, menú lateral → **SQL Editor** → **New query**.
2. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este
   repositorio, copia **todo** su contenido y pégalo.
3. Dale a **Run**. Debe decir "Success".

Esto crea las tablas `productos` y `ventas`, la función `add_stock`, las
políticas de acceso y activa la sincronización en vivo.

## 3. Pegar las credenciales

1. En Supabase → **Project Settings** (engranaje) → **API**.
2. Copia:
   - **Project URL**
   - **anon public** key (la larga que empieza con `eyJ...`)
3. Abre el archivo `.env` en la raíz del proyecto y pégalas:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

4. **Reinicia el servidor** (`Ctrl+C` y de nuevo `npm run dev`).

Listo. El indicador arriba a la derecha debe decir **"Supabase"**.

---

## Subir los datos que ya tenías

Si ya habías cargado productos o hecho ventas en modo local, al abrir el
**Panel** aparecerá un aviso azul con el botón **"Subir a Supabase"**. Un clic y
quedan en la nube. Después ese aviso desaparece solo.

## ¿Cómo funciona por dentro?

- `src/lib/supabase.js` — cliente. Si no hay `.env`, queda en `null` y la app usa localStorage.
- `src/lib/productStore.js` y `src/lib/salesStore.js` — mantienen una caché en
  memoria (lecturas instantáneas para el escaneo) y escriben en Supabase en
  segundo plano. Se sincronizan solas entre dispositivos vía Supabase Realtime.
- `src/lib/migrate.js` — sube los datos de localStorage a Supabase.

---

## Login y roles (Supabase Auth)

Roles: **admin** y **propietaria** ven todo; **vendedor** solo ve *Escanear* y
*Ventas*.

### 1. Correr el SQL de auth

SQL Editor → New query → pega **todo** `supabase/auth.sql` → **Run**.
Esto crea la tabla `perfiles`, el rol automático al registrarse, y **cierra el
acceso anónimo** (a partir de aquí hay que iniciar sesión para usar la app).

### 2. Desactivar la confirmación por correo

Supabase → **Authentication** → **Sign In / Providers** → **Email** →
apaga **"Confirm email"** → Save.
(Es una herramienta interna; así las cuentas del personal quedan activas al
instante sin tener que confirmar un correo.)

⚠️ **Esto solo aplica a las cuentas que se registren de ahí en adelante.**
Si ya habías creado cuentas (la tuya incluida) mientras el switch seguía
prendido, esas quedaron marcadas como "sin confirmar" y Supabase les va a
seguir bloqueando el login aunque ya hayas apagado el switch. Para
liberarlas: SQL Editor → New query → pega y corre
`supabase/confirmar_correos_pendientes.sql` (una sola vez, confirma a
todas de un saque). Después de eso ya pueden iniciar sesión normal.

### 3. Crear la primera cuenta

Abre la app → pestaña **"Crear cuenta"** → regístrate con tu correo.
**La primera cuenta que se crea queda como `propietaria`** automáticamente.

### 4. Dar de alta al personal

Cada cajero se registra en "Crear cuenta" (entra como `vendedor`). Luego tú,
desde la pantalla **Usuarios** (solo admin/propietaria), le cambias el rol si
hace falta.

> Cuando ya estén todas las cuentas creadas, puedes desactivar el registro
> público en Supabase → Authentication → Sign In / Providers → **"Allow new users to sign up"** → off.

## ¿Cómo funciona por dentro?

- `src/lib/supabase.js` — cliente. Si no hay `.env`, queda en `null` y la app usa localStorage **sin login**.
- `src/context/AuthContext.jsx` — sesión + rol del usuario (`useAuth()`).
- `src/lib/permisos.js` — qué secciones ve cada rol.
- `src/pages/Login.jsx` — pantalla de acceso. `src/pages/Usuarios.jsx` — gestión de roles.
- `src/lib/productStore.js` / `salesStore.js` — caché en memoria + escritura en Supabase en segundo plano, sincronización entre dispositivos vía Realtime.
- `src/lib/migrate.js` — sube los datos de localStorage a Supabase.

## Seguridad

Con `auth.sql` aplicado, las tablas solo aceptan peticiones de usuarios con
sesión iniciada (rol `authenticated`). La publishable key va en el frontend y
**no es secreta**; lo que protege los datos son las políticas RLS + el login.
Los roles se controlan en la tabla `perfiles` (nunca desde el navegador salvo la
pantalla Usuarios, que exige ser admin/propietaria).
