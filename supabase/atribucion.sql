-- ============================================================
--  Atribución: quién escaneó/creó/editó un producto y quién hizo
--  cada venta. Ejecutar en Supabase → SQL Editor (después de
--  schema.sql y auth.sql).
-- ============================================================

-- ---------- PRODUCTOS: quién lo creó / quién lo actualizó ----------
alter table public.productos add column if not exists creado_por_nombre text;
alter table public.productos add column if not exists creado_por_rol text;
alter table public.productos add column if not exists actualizado_por_nombre text;
alter table public.productos add column if not exists actualizado_por_rol text;

-- add_stock ahora también recibe quién hace el ingreso/ajuste de stock.
-- Se reemplaza la función anterior (2 parámetros) por esta (con los
-- nuevos parámetros opcionales, para no romper llamadas viejas).
drop function if exists public.add_stock(text, int);

create or replace function public.add_stock(
  p_barcode text,
  p_delta int,
  p_actor_nombre text default null,
  p_actor_rol text default null
)
returns void
language sql
as $$
  update public.productos
     set unidades              = greatest(0, unidades + p_delta),
         updated_at            = now(),
         actualizado_por_nombre = coalesce(p_actor_nombre, actualizado_por_nombre),
         actualizado_por_rol    = coalesce(p_actor_rol, actualizado_por_rol)
   where barcode = p_barcode;
$$;

revoke execute on function public.add_stock(text, int, text, text) from anon;
grant  execute on function public.add_stock(text, int, text, text) to authenticated;

-- ---------- VENTAS: quién cobró ----------
alter table public.ventas add column if not exists usuario_id uuid references auth.users(id) on delete set null;
alter table public.ventas add column if not exists usuario_nombre text;
alter table public.ventas add column if not exists usuario_rol text;
