-- Ejecutar UNA vez en Supabase → SQL Editor → New query → Run
-- Agrega Desayuno, Merienda y Extra (con nota opcional, ej. "Postre").
alter table public.meals add column if not exists note text;
alter table public.meals drop constraint if exists meals_type_check;
alter table public.meals
  add constraint meals_type_check
  check (type in ('Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Extra'));
