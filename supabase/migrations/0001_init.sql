-- Core tables for production user-entered data only.
-- No seed/mock data.

-- PROFILES
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  height_cm integer,
  weight_kg numeric,
  bmi numeric,
  diet_type text,
  allergies text,
  cuisine_preferences text,
  goal text
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "profiles_delete_own"
on public.profiles for delete
using (auth.uid() = user_id);

-- MEALS
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  meal_time timestamptz not null default now(),
  title text not null,
  notes text
);

alter table public.meals enable row level security;

create policy "meals_select_own"
on public.meals for select
using (auth.uid() = user_id);

create policy "meals_insert_own"
on public.meals for insert
with check (auth.uid() = user_id);

create policy "meals_update_own"
on public.meals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meals_delete_own"
on public.meals for delete
using (auth.uid() = user_id);

-- MEAL ITEMS
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  created_at timestamptz not null default now(),
  food_name text not null,
  quantity text,
  calories_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric
);

alter table public.meal_items enable row level security;

create policy "meal_items_select_own"
on public.meal_items for select
using (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);

create policy "meal_items_insert_own"
on public.meal_items for insert
with check (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);

create policy "meal_items_update_own"
on public.meal_items for update
using (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);

create policy "meal_items_delete_own"
on public.meal_items for delete
using (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);

-- MOOD LOGS
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now(),
  mood_score integer not null check (mood_score between 1 and 10),
  tags text[] not null default '{}',
  notes text
);

alter table public.mood_logs enable row level security;

create policy "mood_logs_select_own"
on public.mood_logs for select
using (auth.uid() = user_id);

create policy "mood_logs_insert_own"
on public.mood_logs for insert
with check (auth.uid() = user_id);

create policy "mood_logs_update_own"
on public.mood_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mood_logs_delete_own"
on public.mood_logs for delete
using (auth.uid() = user_id);

-- WATER LOGS
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0)
);

alter table public.water_logs enable row level security;

create policy "water_logs_select_own"
on public.water_logs for select
using (auth.uid() = user_id);

create policy "water_logs_insert_own"
on public.water_logs for insert
with check (auth.uid() = user_id);

create policy "water_logs_update_own"
on public.water_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "water_logs_delete_own"
on public.water_logs for delete
using (auth.uid() = user_id);

-- SLEEP LOGS
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now(),
  quality integer not null check (quality between 1 and 5),
  hours numeric
);

alter table public.sleep_logs enable row level security;

create policy "sleep_logs_select_own"
on public.sleep_logs for select
using (auth.uid() = user_id);

create policy "sleep_logs_insert_own"
on public.sleep_logs for insert
with check (auth.uid() = user_id);

create policy "sleep_logs_update_own"
on public.sleep_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sleep_logs_delete_own"
on public.sleep_logs for delete
using (auth.uid() = user_id);

-- WEIGHT LOGS
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now(),
  weight_kg numeric not null check (weight_kg > 0)
);

alter table public.weight_logs enable row level security;

create policy "weight_logs_select_own"
on public.weight_logs for select
using (auth.uid() = user_id);

create policy "weight_logs_insert_own"
on public.weight_logs for insert
with check (auth.uid() = user_id);

create policy "weight_logs_update_own"
on public.weight_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "weight_logs_delete_own"
on public.weight_logs for delete
using (auth.uid() = user_id);

-- COACH MESSAGES (AI + user chat history)
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null
);

alter table public.coach_messages enable row level security;

create policy "coach_messages_select_own"
on public.coach_messages for select
using (auth.uid() = user_id);

create policy "coach_messages_insert_own"
on public.coach_messages for insert
with check (auth.uid() = user_id);

create policy "coach_messages_update_own"
on public.coach_messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "coach_messages_delete_own"
on public.coach_messages for delete
using (auth.uid() = user_id);
