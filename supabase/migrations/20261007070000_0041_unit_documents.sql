-- Документи окремої квартири: план юніта з декларації кондомініуму тощо.
-- Живуть у тій самій таблиці, що й документи ЖК (ті самі права й редактор);
-- listing_id = null — документ усього ЖК, інакше — лише цієї квартири.
alter table public.development_documents
  add column if not exists listing_id uuid references public.listings(id) on delete cascade;
create index if not exists development_documents_listing_idx
  on public.development_documents (listing_id) where listing_id is not null;

-- Нові типи: декларація кондомініуму / HOA і план квартири
alter table public.development_documents drop constraint if exists development_documents_kind_check;
alter table public.development_documents add constraint development_documents_kind_check
  check (kind in ('land', 'permit', 'environment', 'completion', 'company', 'condo', 'unit', 'other'));
