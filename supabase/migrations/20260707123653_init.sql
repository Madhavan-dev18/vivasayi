-- ============================================================================
-- Vivasayi — Supabase schema migrations
-- ============================================================================
-- This file did not exist before. It was reverse-engineered from every
-- `.from('table_name')` and `.storage.from('bucket')` call in src/, so it
-- matches what the application code actually queries today. If your live
-- Supabase project's schema differs from this, the app's queries are
-- either failing silently or returning unexpected shapes right now —
-- run this file (or reconcile manually) to bring them in sync.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query),
-- or via the Supabase CLI: supabase db push
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. farms
-- ----------------------------------------------------------------------------
-- Columns match src/app/farms/add/page.tsx's insert() and
-- src/components/features/farm-overview.tsx / dashboard/page.tsx's select().
create table if not exists public.farms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  area        text,                 -- stored as text in the app (toString() of acres)
  soil_type   text,
  location    text,
  district    text,
  topography  text,
  water_source text,
  created_at  timestamptz not null default now()
);

alter table public.farms enable row level security;

create policy "Users can view their own farms"
  on public.farms for select
  using (auth.uid() = user_id);

create policy "Users can insert their own farms"
  on public.farms for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own farms"
  on public.farms for update
  using (auth.uid() = user_id);

create policy "Users can delete their own farms"
  on public.farms for delete
  using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 2. crops
-- ----------------------------------------------------------------------------
-- Columns match src/components/features/crop-status.tsx's select('*') and
-- its mapping: c.id, c.name, c.planted_date, c.status, c.progress.
create table if not exists public.crops (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  farm_id       uuid references public.farms(id) on delete set null,
  name          text not null,
  planted_date  date,
  status        text not null default 'Healthy'
                check (status in ('Healthy', 'Needs Attention', 'Harvesting Soon')),
  progress      integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at    timestamptz not null default now()
);

alter table public.crops enable row level security;

create policy "Users can view their own crops"
  on public.crops for select
  using (auth.uid() = user_id);

create policy "Users can insert their own crops"
  on public.crops for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own crops"
  on public.crops for update
  using (auth.uid() = user_id);

create policy "Users can delete their own crops"
  on public.crops for delete
  using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 3. sensor_readings
-- ----------------------------------------------------------------------------
-- Columns match src/components/features/recent-sensor-readings.tsx's
-- rendering: reading.created_at, reading.temperature, reading.humidity.
-- If you have real IoT sensors, point their ingestion at this table; until
-- then this table can simply stay empty (the UI already handles a
-- zero-rows case).
create table if not exists public.sensor_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  farm_id      uuid references public.farms(id) on delete set null,
  temperature  numeric,
  humidity     numeric,
  soil_moisture numeric,
  created_at   timestamptz not null default now()
);

alter table public.sensor_readings enable row level security;

create policy "Users can view their own sensor readings"
  on public.sensor_readings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sensor readings"
  on public.sensor_readings for insert
  with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 4. cultivation_plans
-- ----------------------------------------------------------------------------
-- Columns match src/components/features/personalized-space.tsx's
-- handleSavePlan() insert: user_id, crop_type, district, sowing_date,
-- plan_data (the full AI-generated JSON plan), status.
create table if not exists public.cultivation_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  crop_type   text not null,
  district    text not null,
  sowing_date date not null,
  plan_data   jsonb not null,
  status      text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at  timestamptz not null default now()
);

alter table public.cultivation_plans enable row level security;

create policy "Users can view their own cultivation plans"
  on public.cultivation_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own cultivation plans"
  on public.cultivation_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cultivation plans"
  on public.cultivation_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete their own cultivation plans"
  on public.cultivation_plans for delete
  using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 5. Storage: vivasayi-storage bucket (soil reports)
-- ----------------------------------------------------------------------------
-- IMPORTANT MANUAL STEP — this INSERT only registers the bucket; you also
-- need to set it to PRIVATE in the dashboard (see instructions below this
-- file, or in chat). A bucket created with public = false is what makes
-- getPublicUrl() return nothing usable and forces signed URLs — that's
-- the whole point of this change.
insert into storage.buckets (id, name, public)
values ('vivasayi-storage', 'vivasayi-storage', false)
on conflict (id) do update set public = false;

-- Files are stored at path: {user_id}/{folder}/{filename} (see
-- src/lib/storage.ts). These policies restrict read/write/delete to the
-- folder matching the requesting user's own auth.uid(), so one farmer
-- can never list or sign a URL for another farmer's soil report.
create policy "Users can upload to their own storage folder"
  on storage.objects for insert
  with check (
    bucket_id = 'vivasayi-storage'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own storage files"
  on storage.objects for select
  using (
    bucket_id = 'vivasayi-storage'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own storage files"
  on storage.objects for delete
  using (
    bucket_id = 'vivasayi-storage'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- Manual dashboard step required (cannot be done via SQL):
-- ============================================================================
-- 1. Go to Supabase Dashboard → Storage → vivasayi-storage → Settings.
-- 2. Confirm "Public bucket" is OFF. If the bucket already existed and
--    was created public, the INSERT...ON CONFLICT above sets public=false
--    in the storage.buckets table, but double-check in the UI — some
--    Supabase versions cache this client-side.
-- 3. That's it. src/actions/storage-actions.ts's getSignedFileUrl() will
--    now work; the old getPublicUrl() approach is no longer used anywhere
--    in the codebase as of this fix pass.
-- ============================================================================
