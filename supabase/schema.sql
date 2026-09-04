-- ============================================================
--  Esquema de base de datos para Facturación MA
--  Ejecutar en:  Supabase → tu proyecto → SQL Editor → New query
--  (pega todo esto y dale a "Run")
-- ============================================================

-- ---------- PRODUCTOS ----------
create table if not exists public.productos (
  barcode     text primary key,
  nombre      text        not null default '',
  precio      numeric      not null default 0,
  unidades    integer      not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- ---------- VENTAS ----------
-- items y cliente se guardan como JSON para simplificar (sin tablas hijas por ahora).
create table if not exists public.ventas (
  id          text primary key,
  fecha       timestamptz  not null default now(),
  total       numeric      not null default 0,
  metodo_pago text         not null default 'Efectivo',
  cliente     jsonb        not null default '{}'::jsonb,
  items       jsonb        not null default '[]'::jsonb
);

create index if not exists ventas_fecha_idx on public.ventas (fecha desc);

-- ---------- FUNCIÓN: sumar/restar stock de forma atómica ----------
create or replace function public.add_stock(p_barcode text, p_delta int)
returns void
language sql
as $$
  update public.productos
     set unidades   = greatest(0, unidades + p_delta),
         updated_at = now()
   where barcode = p_barcode;
$$;

-- ============================================================
--  SEGURIDAD (RLS)
--  Por ahora la app usa solo la "anon key" (sin login), así que
--  damos acceso completo al rol anónimo. Cuando agregues login
--  de cajeros, reemplaza estas políticas por unas basadas en auth.
-- ============================================================
alter table public.productos enable row level security;
alter table public.ventas    enable row level security;

drop policy if exists "acceso total productos (anon)" on public.productos;
create policy "acceso total productos (anon)"
  on public.productos for all
  to anon
  using (true) with check (true);

drop policy if exists "acceso total ventas (anon)" on public.ventas;
create policy "acceso total ventas (anon)"
  on public.ventas for all
  to anon
  using (true) with check (true);

grant execute on function public.add_stock(text, int) to anon;

-- ---------- Realtime (para que tablet y computadora se sincronicen) ----------
alter publication supabase_realtime add table public.productos;
alter publication supabase_realtime add table public.ventas;
