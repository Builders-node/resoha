-- Стадія будівництва ЖК цілком, як у будинків (0035): у каталозі новобудов покупець бачить,
-- що вже здано, а що ще будується, і фільтрує за цим. progress — готовність у відсотках,
-- коли забудовник її називає; порожньо — показуємо лише стадію.
alter table public.developments
  add column if not exists stage text not null default 'construction'
    check (stage in ('planned', 'prep', 'construction', 'built', 'delivered')),
  add column if not exists progress smallint check (progress between 0 and 100);

-- ЖК з будинками: стадія ЖК — найменш готовий із них
update public.developments d
   set stage = s.stage
  from (
    select development_id,
           (array['planned', 'prep', 'construction', 'built', 'delivered'])[
             min(array_position(array['planned', 'prep', 'construction', 'built', 'delivered'], stage))] as stage
      from public.buildings group by development_id
  ) s
 where s.development_id = d.id;

-- Стадії ЖК каталогу за сайтами забудовників (жовтень 2026). Решта лишаються «будується»,
-- доки забудовник не вкаже інше.
update public.developments set stage = 'delivered'
 where slug in ('island-breeze-condos', 'ocean-azure-condos', 'residenza', 'stanza', 'trento', 'viu', 'torres-del-valle');
-- ділянки з готовими дорогами й мережами
update public.developments set stage = 'built' where slug in ('bosques-de-jaragua', 'cumbres-de-jaragua');
update public.developments set stage = 'planned' where slug = 'maya-residences';
