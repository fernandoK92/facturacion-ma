-- ============================================================
--  Suma el tipo 'eliminacion' a `movimientos`: ahora borrar un
--  producto del inventario también deja registro en Actividad (quién,
--  qué producto, y cuándo), además de altas/ediciones/ajustes/ventas.
--  Ejecutar en Supabase → SQL Editor (después de movimientos_venta.sql).
-- ============================================================

alter table public.movimientos drop constraint if exists movimientos_tipo_check;
alter table public.movimientos add constraint movimientos_tipo_check
  check (tipo in ('ingreso', 'ajuste', 'merma', 'creacion', 'edicion', 'venta', 'eliminacion'));
