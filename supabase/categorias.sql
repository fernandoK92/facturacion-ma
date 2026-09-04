-- ============================================================
--  Categoría de producto (para "Frutas" sin código de barras).
--  Ejecutar en Supabase → SQL Editor (después de schema.sql).
-- ============================================================

alter table public.productos add column if not exists categoria text not null default '';
