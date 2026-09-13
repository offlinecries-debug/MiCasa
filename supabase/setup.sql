-- Mi Casa — "Dejá tu foto"
-- Ejecutar este script UNA VEZ en: Supabase dashboard > tu proyecto >
-- SQL Editor > New query > pegar todo esto > Run.
--
-- Crea:
--   - un bucket de Storage público llamado "visitor-photos" (las fotos)
--   - una tabla "visitor_photos" (el registro de cada foto)
--   - las policies necesarias para que cualquier visitante, SIN LOGIN,
--     pueda leer la colección y agregar su foto, pero nadie pueda
--     borrar ni modificar las fotos de otra persona desde la web.

-- 1) bucket público para las imágenes
insert into storage.buckets (id, name, public)
values ('visitor-photos', 'visitor-photos', true)
on conflict (id) do nothing;

-- 2) tabla que registra cada foto dejada
create table if not exists public.visitor_photos (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.visitor_photos enable row level security;

-- cualquiera puede LEER la colección (sin login)
drop policy if exists visitor_photos_select_anon on public.visitor_photos;
create policy visitor_photos_select_anon
  on public.visitor_photos
  for select
  to anon
  using (true);

-- cualquiera puede AGREGAR una foto nueva (sin login)
drop policy if exists visitor_photos_insert_anon on public.visitor_photos;
create policy visitor_photos_insert_anon
  on public.visitor_photos
  for insert
  to anon
  with check (true);

-- a propósito NO hay policy de UPDATE ni DELETE para "anon": sin
-- ellas, Postgres deniega esas operaciones por default, así que nadie
-- puede borrar ni modificar fotos ajenas desde la web pública.

-- 3) policies del bucket de Storage: leer y subir sin login,
--    nunca sobreescribir ni borrar lo ya subido
drop policy if exists visitor_photos_bucket_read on storage.objects;
create policy visitor_photos_bucket_read
  on storage.objects
  for select
  to anon
  using (bucket_id = 'visitor-photos');

drop policy if exists visitor_photos_bucket_insert on storage.objects;
create policy visitor_photos_bucket_insert
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'visitor-photos');

-- sin policies de update/delete acá tampoco: mismo motivo que arriba.
