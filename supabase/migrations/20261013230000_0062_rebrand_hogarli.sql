-- Ребрендинг Resoha → Hogarli: назва й опис службового акаунта з зібраними оголошеннями.
-- Пошта listings@resoha.dev лишається: це логін службового акаунта, а не адреса для листів.
update public.profiles
   set name  = replace(name, 'Resoha', 'Hogarli'),
       about = replace(about, 'Resoha', 'Hogarli')
 where email = 'listings@resoha.dev';

-- Новий домен: планувальник сповіщень штовхає відправку сюди.
update private.notify_config set site_url = 'https://www.hogarli.com' where id = 1;
