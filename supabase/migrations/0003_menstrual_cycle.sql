alter table public.profiles add column if not exists gender text;

create table if not exists public.menstrual_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.menstrual_logs enable row level security;

create policy "menstrual_logs_select_own" on public.menstrual_logs for select using (auth.uid() = user_id);
create policy "menstrual_logs_insert_own" on public.menstrual_logs for insert with check (auth.uid() = user_id);
create policy "menstrual_logs_update_own" on public.menstrual_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "menstrual_logs_delete_own" on public.menstrual_logs for delete using (auth.uid() = user_id);
