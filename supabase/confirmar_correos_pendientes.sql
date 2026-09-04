-- Confirma de una vez a todas las cuentas que quedaron pendientes de
-- confirmar el correo (creadas mientras "Confirm email" seguía activo en
-- Supabase). Apagar el switch en Authentication → Providers → Email solo
-- evita pedir confirmación a los que se registren DESPUÉS; no confirma
-- retroactivamente a los que ya existían. Correr esto una sola vez luego
-- de apagar el switch.
--
-- Nota: "confirmed_at" es una columna generada (solo lectura) en
-- auth.users, no se puede escribir directo — por eso acá solo se toca
-- "email_confirmed_at" (de ahí se recalcula sola).
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
