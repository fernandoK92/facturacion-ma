-- ============================================================
--  Movimientos de inventario (ingresos de stock)
--  Ejecutar en Supabase → SQL Editor (después de schema.sql y auth.sql).
-- ============================================================

create table if not exists public.movimientos (
  id             uuid primary key default gen_random_uuid(),
  barcode        text not null,
  nombre         text not null default '',
  tipo           text not null default 'ingreso' check (tipo in ('ingreso', 'ajuste', 'merma')),
  cantidad       integer not null,
  usuario_id     uuid references auth.users(id) on delete set null,
  usuario_nombre text not null default '',
  fecha          timestamptz not null default now()
);

create index if not exists movimientos_fecha_idx on public.movimientos (fecha desc);

alter table public.movimientos enable row level security;

drop policy if exists "movimientos (autenticados)" on public.movimientos;
create policy "movimientos (autenticados)"
  on public.movimientos for all to authenticated
  using (true) with check (true);

alter publication supabase_realtime add table public.movimientos;
