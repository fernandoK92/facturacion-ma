-- 1) ¿Existen ya las columnas nuevas que necesita "Actividad"?
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'movimientos'
  and column_name in ('detalle', 'usuario_rol');
-- Si esto devuelve 0 filas -> falta correr supabase/movimientos_actividad.sql.

-- 2) Últimos movimientos guardados (para ver si algo se está insertando).
select tipo, nombre, detalle, usuario_nombre, usuario_rol, fecha
from public.movimientos
order by fecha desc
limit 10;
