-- Звідки прийшла заявка: '' — з сайту Resoha, 'widget' — з віджета ЖК на сайті забудовника
-- (/embed/developments/<slug>). Кабінет показує позначку, щоб забудовник бачив, що віджет працює.
-- Код уміє жити без цієї колонки: тоді позначка йде в текст повідомлення.

alter table public.leads add column if not exists source text not null default '';

alter table public.leads drop constraint if exists leads_source_len;
alter table public.leads add constraint leads_source_len check (char_length(source) <= 40);
