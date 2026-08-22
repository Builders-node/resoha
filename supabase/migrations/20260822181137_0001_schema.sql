create extension if not exists pgcrypto;

create table if not exists public.agencies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text not null default '#16305c',
  phone        text not null default '',
  email        text not null default '',
  about        text not null default '',
  verified     boolean not null default false,
  owner_id     uuid,
  invite_code  text not null unique,
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'user' check (role in ('user', 'agent')),
  name        text not null default '',
  email       text not null default '',
  avatar      text not null default '',
  phone       text not null default '',
  whatsapp    text not null default '',
  agency_id   uuid references public.agencies(id) on delete set null,
  is_owner    boolean not null default false,
  experience  int not null default 0,
  rating      numeric(2,1) not null default 0,
  reviews     int not null default 0,
  verified    boolean not null default false,
  languages   text[] not null default '{English}',
  about       text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.agencies
  add constraint agencies_owner_fk foreign key (owner_id) references public.profiles(id) on delete set null;

create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  deal            text not null check (deal in ('sale', 'rent')),
  type            text not null check (type in ('condo', 'house', 'land', 'commercial')),
  title           text not null,
  island          text not null default 'Roatán',
  neighborhood    text not null,
  address         text not null default '',
  price           numeric not null check (price >= 0),
  hoa             numeric not null default 0,
  beds            int not null default 0,
  baths           numeric(3,1) not null default 0,
  sqft            int not null default 0,
  lot_acres       numeric(6,2) not null default 0,
  year            int not null default 0,
  oceanfront      boolean not null default false,
  titled          boolean not null default true,
  owner_financing boolean not null default false,
  lat             double precision not null,
  lng             double precision not null,
  agent_id        uuid not null references public.profiles(id) on delete cascade,
  agency_id       uuid references public.agencies(id) on delete set null,
  featured        boolean not null default false,
  active          boolean not null default true,
  views           int not null default 0,
  tags            text[] not null default '{}',
  photos          text[] not null default '{}',
  body            text not null default '',
  created_at      timestamptz not null default now()
);

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  agent_id    uuid not null references public.profiles(id) on delete cascade,
  agency_id   uuid references public.agencies(id) on delete set null,
  name        text not null,
  phone       text not null,
  message     text not null default '',
  status      text not null default 'new' check (status in ('new', 'done')),
  created_at  timestamptz not null default now()
);

create table if not exists public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  query       text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists listings_search_idx on public.listings (active, deal, type, neighborhood);
create index if not exists listings_price_idx  on public.listings (price);
create index if not exists listings_agent_idx  on public.listings (agent_id);
create index if not exists listings_agency_idx on public.listings (agency_id);
create index if not exists leads_agent_idx     on public.leads (agent_id);
create index if not exists profiles_agency_idx on public.profiles (agency_id);
