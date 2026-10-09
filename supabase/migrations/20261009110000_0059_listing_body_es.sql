-- Опис оголошення іспанською. Ріелтор заповнює його у формі сам (без машинного перекладу);
-- іспаномовні відвідувачі бачать body_es, а якщо порожньо — англійський body з приміткою.
-- Права ті самі, що й на весь рядок listings (RLS), окремих політик не треба.

alter table public.listings add column if not exists body_es text not null default '';

comment on column public.listings.body_es is 'Listing description in Spanish, written by the agent; empty = show the English body';
