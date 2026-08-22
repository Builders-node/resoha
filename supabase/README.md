# Supabase

Проєкт: **resoha-roatan** (`zgfcysoyksticnbgbhxb`, us-east-1).

Застосовані міграції (джерело істини — сама база, `supabase_migrations.schema_migrations`):

| # | Що робить |
|---|---|
| `0001_schema` | таблиці agencies, profiles, listings, leads, saved_searches, favorites + індекси |
| `0002_rls_and_rpc` | хелпери `is_agency_owner`/`my_agency`, тригери `handle_new_user`, `enforce_owner_rules`, усі RLS-політики |
| `0003_rpc` | RPC: create_agency, join_agency, leave_agency, remove_member, rotate_invite_code, bump_views |
| `0004_storage` | бакет `listing-photos` (публічне читання, запис у власну теку) |
| `0005/0006_seed_import` | тимчасова функція імпорту демо-даних і її видалення |
| `0010_rls_perf_and_indexes` | `(select auth.uid())` у політиках + індекси на зовнішні ключі |
| `0007_agency_board_view` | вʼю `agency_board` з лічильниками оголошень і ріелторів |
| `0008/0009_function_grants` | звуження прав на SECURITY DEFINER-функції (з поверненням прав на предикати RLS) |

Файли в `migrations/` вивантажені з самої бази, тому збігаються з тим, що застосовано.
Оновити після нових змін:

```bash
npx supabase link --project-ref zgfcysoyksticnbgbhxb
npx supabase db pull
```
