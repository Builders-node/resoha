-- Знятий з показу обʼєкт (прострочений, прихований, на модерації, автора заблоковано):
-- замість голого 404 сторінка «більше недоступний» і схожі в тому ж районі.
-- RLS ховає такі оголошення від гостей, тож функція віддає лише кілька безпечних полів —
-- і лише для того, що колись уже було опубліковано: чернетки ніхто не бачив, їх не світимо.

create or replace function public.listing_gone(p_id uuid)
returns table (title text, neighborhood text, island text, type text, deal text, price numeric, sold boolean)
language sql stable security definer set search_path = public as $$
  select l.title, l.neighborhood, l.island, l.type, l.deal, l.price, l.status in ('sold', 'rented')
  from public.listings l
  where l.id = p_id and l.published_at is not null
$$;

revoke all on function public.listing_gone(uuid) from public;
grant execute on function public.listing_gone(uuid) to anon, authenticated;
