create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  plan_date date not null,
  meals jsonb not null default '[]'::jsonb,
  water_target_ml integer,
  sleep_target_hours numeric,
  completed boolean default null
);

alter table public.daily_plans enable row level security;

create policy "daily_plans_select_own"
on public.daily_plans for select
using (auth.uid() = user_id);

create policy "daily_plans_insert_own"
on public.daily_plans for insert
with check (auth.uid() = user_id);

create policy "daily_plans_update_own"
on public.daily_plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "daily_plans_delete_own"
on public.daily_plans for delete
using (auth.uid() = user_id);
