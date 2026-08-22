-- my_agency() не використовує ні застосунок, ні жодна політика: агенцію беремо з профілю.
-- Прибираємо, щоб не тримати зайву SECURITY DEFINER функцію в публічній схемі.
drop function if exists public.my_agency();
