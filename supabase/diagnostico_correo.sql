-- Diagnóstico rápido de una cuenta puntual que sigue pidiendo confirmación.
-- Cambiá el correo en el "where" y corré esto primero para ver su estado.
select
  id,
  email,
  email_confirmed_at,   -- si es NULL, ahí está el problema
  confirmed_at,          -- se recalcula solo a partir de email_confirmed_at
  created_at,
  last_sign_in_at
from auth.users
where email = 'ximena123@gmail.com';
