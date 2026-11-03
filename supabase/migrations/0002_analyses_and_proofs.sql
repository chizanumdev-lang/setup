-- Several analyses can run at the same time, and each ticked step can carry screenshot proof.

-- drafts: one row per analysis instead of one per user
alter table public.drafts drop constraint if exists drafts_pkey;
alter table public.drafts add column if not exists id uuid not null default gen_random_uuid();
alter table public.drafts add primary key (id);
alter table public.drafts add column if not exists label text not null default '';
alter table public.drafts add column if not exists created_at timestamptz not null default now();
create index if not exists drafts_user_updated on public.drafts (user_id, updated_at desc);

-- screenshots can belong to a draft first and move to the trade when it is saved
alter table public.trade_images alter column trade_id drop not null;
alter table public.trade_images add column if not exists draft_id uuid references public.drafts(id) on delete cascade;
alter table public.trade_images add column if not exists item_key text;
alter table public.trade_images drop constraint if exists trade_images_owner;
alter table public.trade_images add constraint trade_images_owner check (trade_id is not null or draft_id is not null);
create index if not exists trade_images_draft on public.trade_images (draft_id);
