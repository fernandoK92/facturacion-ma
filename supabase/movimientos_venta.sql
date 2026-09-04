-- ============================================================
--  Suma el tipo 'venta' a `movimientos`: ahora cada venta cobrada
--  también deja un registro en Actividad (quién vendió, qué, cuánto y
--  cuándo), además de las altas/ediciones/ajustes de inventario.
--  Ejecutar en Supabase → SQL Editor (después de movimientos_actividad.sql).
-- ============================================================

alter table public.movimientos drop constraint if exists movimientos_tipo_check;
alter table public.movimientos add constraint movimientos_tipo_check
  check (tipo in ('ingreso', 'ajuste', 'merma', 'creacion', 'edicion', 'venta'));
