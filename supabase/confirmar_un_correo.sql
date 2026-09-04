-- Confirma manualmente UNA cuenta puntual por si el fix masivo
-- (confirmar_correos_pendientes.sql) no llegó a alcanzarla (por ejemplo,
-- si esta cuenta se registró después de correr ese script).
-- Cambiá el correo y corré esto.
update auth.users
set email_confirmed_at = now()
where email = 'ximena123@gmail.com';
