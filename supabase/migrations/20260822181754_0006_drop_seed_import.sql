-- Сидування завершено — прибираємо тимчасову функцію, щоб її не можна було викликати ззовні.
drop function if exists public.seed_import(jsonb);
