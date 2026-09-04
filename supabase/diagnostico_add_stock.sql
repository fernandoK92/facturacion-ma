-- ¿Qué versión(es) de la función add_stock existen?
select
  proname,
  pg_get_function_arguments(oid) as parametros
from pg_proc
where proname = 'add_stock';
