-- Ejecutar UNA vez en Supabase → SQL Editor → New query → Run
-- Agrega la descripción opcional de cada comida ("¿Qué comiste?").
alter table public.meals add column if not exists description text;
