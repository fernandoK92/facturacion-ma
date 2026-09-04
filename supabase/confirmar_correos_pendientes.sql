-- Confirma de una vez a todas las cuentas que quedaron pendientes de
-- confirmar el correo (creadas mientras "Confirm email" seguía activo en
-- Supabase). Apagar el switch en Authentication → Providers → Email solo
-- evita pedir confirmación a los que se registren DESPUÉS; no confirma
-- retroactivamente a los que ya existían. Correr esto una sola vez luego
-- de apagar el switch.
update auth.users
set email_confirmed_at = now(),
    confirmed_at = now()
where email_confirmed_at is null;
