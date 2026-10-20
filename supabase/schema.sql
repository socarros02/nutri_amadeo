-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run

-- 1) Tabla de comidas (cada fila = una foto)
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  type        text not null check (type in ('Almuerzo', 'Cena')),
  photo_path  text not null,
  created_at  timestamptz not null default now()
);
create index if not exists meals_date_idx on public.meals (date);

-- 2) Tabla de actividad física
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  name        text not null,
  duration    integer not null check (duration > 0),
  created_at  timestamptz not null default now()
);
create index if not exists activities_date_idx on public.activities (date);

-- 3) Seguridad: la app (clave pública) solo puede LEER.
--    Las escrituras se hacen desde las funciones /api de Vercel con la clave secreta.
alter table public.meals enable row level security;
alter table public.activities enable row level security;

drop policy if exists "lectura publica meals" on public.meals;
create policy "lectura publica meals" on public.meals
  for select to anon, authenticated using (true);

drop policy if exists "lectura publica activities" on public.activities;
create policy "lectura publica activities" on public.activities
  for select to anon, authenticated using (true);

-- 4) Bucket de Storage para las fotos (lectura pública por URL, sin escritura pública)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comidas', 'comidas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
