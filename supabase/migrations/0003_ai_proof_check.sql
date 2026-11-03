-- Optional AI check of step screenshots, plus the switch that turns it on.

alter table public.trade_images add column if not exists ai_verdict text check (ai_verdict in ('valid','invalid','unclear'));
alter table public.trade_images add column if not exists ai_confidence numeric check (ai_confidence between 0 and 1);
alter table public.trade_images add column if not exists ai_reason text;
alter table public.trade_images add column if not exists ai_model text;
alter table public.trade_images add column if not exists ai_checked_at timestamptz;
-- the trader's own call, which wins over the AI's
alter table public.trade_images add column if not exists user_verdict text check (user_verdict in ('valid','invalid','unclear'));

-- off until the user opts in, because screenshots are sent to a third party
alter table public.profiles add column if not exists ai_enabled boolean not null default false;

create index if not exists trade_images_checked on public.trade_images (user_id, ai_checked_at);
