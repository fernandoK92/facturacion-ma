-- ============================================================
--  Amplía `movimientos` a un registro de ACTIVIDAD completo:
--  antes solo guardaba ingresos de stock ("Ingresar inventario"),
--  ahora también guarda cuando se crea o se edita un producto
--  (nombre/precio/unidades) — para que admin/propietaria vean qué
--  hizo cada usuario (vendedor incluido), con quién y cuándo.
--  Ejecutar en Supabase → SQL Editor (después de movimientos.sql).
-- ============================================================

alter table public.movimientos drop constraint if exists movimientos_tipo_check;
alter table public.movimientos add constraint movimientos_tipo_check
  check (tipo in ('ingreso', 'ajuste', 'merma', 'creacion', 'edicion'));

alter table public.movimientos add column if not exists detalle text not null default '';
alter table public.movimientos add column if not exists usuario_rol text not null default '';
