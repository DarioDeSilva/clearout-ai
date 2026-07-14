-- Clearout AI schema
-- Run this once in the Supabase SQL Editor after creating the project.
-- Safe to re-run: uses `if not exists` / `on conflict do nothing` where practical.

create extension if not exists "pgcrypto";

-- projects ------------------------------------------------------------

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "Users can view own projects" on projects
  for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on projects
  for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects
  for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on projects
  for delete using (auth.uid() = user_id);

-- items -----------------------------------------------------------------

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text,
  category text,
  condition text,
  brand text,
  owned_since text,
  notes text,
  status text not null default 'sell' check (status in ('keep', 'sell', 'donate', 'trash')),
  listing_title text,
  listing_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table items enable row level security;

create policy "Users can view own items" on items
  for select using (auth.uid() = user_id);
create policy "Users can insert own items" on items
  for insert with check (auth.uid() = user_id);
create policy "Users can update own items" on items
  for update using (auth.uid() = user_id);
create policy "Users can delete own items" on items
  for delete using (auth.uid() = user_id);

-- item_photos -------------------------------------------------------------

create table if not exists item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table item_photos enable row level security;

create policy "Users can view own item photos" on item_photos
  for select using (
    exists (select 1 from items where items.id = item_photos.item_id and items.user_id = auth.uid())
  );
create policy "Users can insert own item photos" on item_photos
  for insert with check (
    exists (select 1 from items where items.id = item_photos.item_id and items.user_id = auth.uid())
  );
create policy "Users can delete own item photos" on item_photos
  for delete using (
    exists (select 1 from items where items.id = item_photos.item_id and items.user_id = auth.uid())
  );

-- item_pricing_preferences -------------------------------------------------
-- min_price is readable here by the owner (they typed it in) but the app's
-- API layer must never include it in a pricing-computation response body.

create table if not exists item_pricing_preferences (
  item_id uuid primary key references items(id) on delete cascade,
  selling_goal text check (selling_goal in ('quick', 'balanced', 'maximize')),
  urgency text,
  negotiable boolean default true,
  obo_or_firm text check (obo_or_firm in ('obo', 'firm')),
  min_price numeric,
  zip_code text,
  delivery_available boolean default false,
  removal_difficulty text,
  pickup_deadline date,
  will_hold boolean default false,
  undetectable_defects text
);

alter table item_pricing_preferences enable row level security;

create policy "Users can view own pricing preferences" on item_pricing_preferences
  for select using (
    exists (select 1 from items where items.id = item_pricing_preferences.item_id and items.user_id = auth.uid())
  );
create policy "Users can insert own pricing preferences" on item_pricing_preferences
  for insert with check (
    exists (select 1 from items where items.id = item_pricing_preferences.item_id and items.user_id = auth.uid())
  );
create policy "Users can update own pricing preferences" on item_pricing_preferences
  for update using (
    exists (select 1 from items where items.id = item_pricing_preferences.item_id and items.user_id = auth.uid())
  );

-- price_comps ---------------------------------------------------------------

create table if not exists price_comps (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  source text not null,
  query_used text,
  title text,
  price numeric,
  condition text,
  url text,
  fetched_at timestamptz not null default now()
);

alter table price_comps enable row level security;

create policy "Users can view own price comps" on price_comps
  for select using (
    exists (select 1 from items where items.id = price_comps.item_id and items.user_id = auth.uid())
  );
create policy "Users can insert own price comps" on price_comps
  for insert with check (
    exists (select 1 from items where items.id = price_comps.item_id and items.user_id = auth.uid())
  );

-- jobs ------------------------------------------------------------------

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  type text not null check (type in ('extract_item', 'price_estimate')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts int not null default 0,
  input_data jsonb,
  output_data jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table jobs enable row level security;

create policy "Users can view own jobs" on jobs
  for select using (
    exists (select 1 from items where items.id = jobs.item_id and items.user_id = auth.uid())
  );
create policy "Users can insert own jobs" on jobs
  for insert with check (
    exists (select 1 from items where items.id = jobs.item_id and items.user_id = auth.uid())
  );
create policy "Users can update own jobs" on jobs
  for update using (
    exists (select 1 from items where items.id = jobs.item_id and items.user_id = auth.uid())
  );

-- Storage: item photo bucket, scoped to a {user_id}/{item_id}/{filename} path
-- convention so RLS can check the leading folder against auth.uid().

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id) do nothing;

create policy "Users can upload own item photos" on storage.objects
  for insert with check (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users can view own item photos in storage" on storage.objects
  for select using (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users can delete own item photos in storage" on storage.objects
  for delete using (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
