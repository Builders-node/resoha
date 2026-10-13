-- Ребрендинг Resoha → Hogarli: назва й опис службового акаунта з зібраними оголошеннями.
-- Пошта listings@resoha.dev і notify_config.site_url лишаються, доки не підключено новий домен.
update public.profiles
   set name  = replace(name, 'Resoha', 'Hogarli'),
       about = replace(about, 'Resoha', 'Hogarli')
 where email = 'listings@resoha.dev';
