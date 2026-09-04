import { createClient } from "@supabase/supabase-js";

// Credenciales del proyecto Supabase. Se leen de las variables de entorno de Vite.
// Copia .env.example a .env y pega tu URL y anon key.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente de Supabase, o `null` si todavía no hay credenciales configuradas.
 * Mientras sea `null`, la app sigue funcionando con almacenamiento local.
 */
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

/** true cuando hay conexión a Supabase configurada. */
export const supabaseReady = Boolean(supabase);
