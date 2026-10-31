-- Candle Three: initial schema. Every table is private to its owner via row-level security.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  timezone       text not null default 'UTC',
  default_bias   text not null default 'bull' check (default_bias in ('bull','bear')),
  account_size   numeric,
  risk_pct       numeric,
  max_trades_day integer not null default 2,
  max_loss_r     numeric not null default 2,
  theme          text not null default 'system' check (theme in ('system','light','dark')),
  created_at     timestamptz not null default now()
);

-- create a profile row whenever a user signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- instruments ----------
create table if not exists public.instruments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  symbol     text not null,
  tick_size  numeric,
  tick_value numeric,
  unique (user_id, symbol)
);

-- ---------- checklists ----------
create table if not exists public.checklists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]'::jsonb,
  version    integer not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists checklists_one_default on public.checklists (user_id) where is_default;

-- ---------- drafts (the in-progress setup, one per user) ----------
create table if not exists public.drafts (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  checklist_id uuid references public.checklists(id) on delete set null,
  bias         text not null default 'bull' check (bias in ('bull','bear')),
  ticks        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
drop trigger if exists drafts_updated on public.drafts;
create trigger drafts_updated before update on public.drafts
  for each row execute function public.set_updated_at();

-- ---------- trades ----------
create table if not exists public.trades (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  taken_at           timestamptz not null default now(),
  instrument         text not null,
  direction          text not null check (direction in ('bull','bear')),
  session            text check (session in ('Asia','London','New York','Other')),
  entry_type         text check (entry_type in ('Reversal','Continuation','Retest','Positional')),
  checklist_id       uuid references public.checklists(id) on delete set null,
  checklist_version  integer,
  checklist_snapshot jsonb,
  ticks              jsonb not null default '{}'::jsonb,
  status             text not null check (status in ('valid','no_trade','incomplete')),
  entry              numeric,
  stop               numeric,
  target             numeric,
  risk_pct           numeric,
  risk_amount        numeric,
  size               numeric,
  outcome            text not null default 'Open' check (outcome in ('Open','Win','Loss','Breakeven','Skipped')),
  r_result           numeric,
  notes_pre          text,
  notes_post         text,
  tags               text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists trades_user_taken on public.trades (user_id, taken_at desc);
drop trigger if exists trades_updated on public.trades;
create trigger trades_updated before update on public.trades
  for each row execute function public.set_updated_at();

-- ---------- trade images ----------
create table if not exists public.trade_images (
  id       uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  path     text not null,
  label    text,
  phase    text check (phase in ('pre','post'))
);
create index if not exists trade_images_trade on public.trade_images (trade_id);

-- ---------- row-level security ----------
alter table public.profiles     enable row level security;
alter table public.instruments  enable row level security;
alter table public.checklists   enable row level security;
alter table public.drafts       enable row level security;
alter table public.trades       enable row level security;
alter table public.trade_images enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['instruments','checklists','drafts','trades','trade_images'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------- storage: private bucket, files live under <user id>/... ----------
insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', false)
on conflict (id) do nothing;

drop policy if exists "own trade images" on storage.objects;
create policy "own trade images" on storage.objects for all to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
