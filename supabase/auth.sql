-- ============================================================
--  Autenticación y roles para Facturación MA
--  Ejecutar en Supabase → SQL Editor (DESPUÉS de schema.sql).
--  Roles: 'admin', 'vendedor', 'propietaria'
-- ============================================================

-- ---------- PERFILES (un registro por usuario) ----------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null default '',
  correo     text,
  rol        text not null default 'vendedor'
             check (rol in ('admin', 'vendedor', 'propietaria')),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);
alter table public.perfiles add column if not exists correo text;
alter table public.perfiles add column if not exists activo boolean not null default true;

-- ---------- Crear el perfil automáticamente al registrarse ----------
-- El PRIMER usuario que se registra queda como 'propietaria'.
-- Los siguientes quedan como 'vendedor' (se cambian desde la pantalla Usuarios).
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    new.email,
    case when (select count(*) from public.perfiles) = 0 then 'propietaria' else 'vendedor' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------- Helper: rol del usuario actual (sin recursión de RLS) ----------
create or replace function public.mi_rol()
returns text
language sql
security definer
stable
set search_path = public
as $$ select rol from public.perfiles where id = auth.uid() $$;

-- ---------- Eliminar un usuario por completo (solo admin/propietaria) ----------
create or replace function public.eliminar_usuario(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.mi_rol() not in ('admin', 'propietaria') then
    raise exception 'Solo un administrador puede eliminar usuarios';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  delete from auth.users where id = p_id;  -- el perfil se borra por ON DELETE CASCADE
end;
$$;
revoke execute on function public.eliminar_usuario(uuid) from anon;
grant  execute on function public.eliminar_usuario(uuid) to authenticated;

-- ---------- Editar nombre / correo / contraseña (solo admin/propietaria) ----------
create extension if not exists pgcrypto with schema extensions;

create or replace function public.actualizar_usuario(
  p_id       uuid,
  p_nombre   text default null,
  p_correo   text default null,
  p_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_correo text;
begin
  if public.mi_rol() not in ('admin', 'propietaria') then
    raise exception 'Solo un administrador puede editar usuarios';
  end if;

  update public.perfiles
     set nombre = coalesce(nullif(trim(p_nombre), ''), nombre),
         correo = coalesce(nullif(lower(trim(p_correo)), ''), correo)
   where id = p_id;

  if p_correo is not null and trim(p_correo) <> '' then
    v_correo := lower(trim(p_correo));
    update auth.users
       set email = v_correo,
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = p_id;
  end if;

  if p_password is not null and length(p_password) > 0 then
    if length(p_password) < 6 then
      raise exception 'La contraseña debe tener al menos 6 caracteres';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = p_id;
  end if;
end;
$$;
revoke execute on function public.actualizar_usuario(uuid, text, text, text) from anon;
grant  execute on function public.actualizar_usuario(uuid, text, text, text) to authenticated;

-- ---------- RLS de perfiles ----------
alter table public.perfiles enable row level security;

drop policy if exists "perfiles: leer (autenticados)" on public.perfiles;
create policy "perfiles: leer (autenticados)"
  on public.perfiles for select to authenticated
  using (true);

drop policy if exists "perfiles: editar rol (admin/propietaria)" on public.perfiles;
create policy "perfiles: editar rol (admin/propietaria)"
  on public.perfiles for update to authenticated
  using (public.mi_rol() in ('admin', 'propietaria'))
  with check (public.mi_rol() in ('admin', 'propietaria'));

-- ============================================================
--  Cerrar el acceso anónimo: ahora TODO requiere login
-- ============================================================
drop policy if exists "acceso total productos (anon)" on public.productos;
drop policy if exists "acceso total ventas (anon)"    on public.ventas;

drop policy if exists "productos (autenticados)" on public.productos;
create policy "productos (autenticados)"
  on public.productos for all to authenticated
  using (true) with check (true);

drop policy if exists "ventas (autenticados)" on public.ventas;
create policy "ventas (autenticados)"
  on public.ventas for all to authenticated
  using (true) with check (true);

revoke execute on function public.add_stock(text, int) from anon;
grant  execute on function public.add_stock(text, int) to authenticated;

-- ============================================================
--  BOOTSTRAP: crea el perfil de las cuentas que ya existían
--  antes de correr este script y deja la primera como admin.
--  (El trigger solo actúa sobre registros NUEVOS.)
-- ============================================================
insert into public.perfiles (id, nombre, correo, rol)
select
  id,
  coalesce(nullif(split_part(email, '@', 1), ''), 'usuario'),
  email,
  case when row_number() over (order by created_at) = 1 then 'admin' else 'vendedor' end
from auth.users
on conflict (id) do nothing;

-- Rellena el correo en perfiles que ya existían sin él
update public.perfiles p
set correo = u.email
from auth.users u
where u.id = p.id and (p.correo is null or p.correo = '');
