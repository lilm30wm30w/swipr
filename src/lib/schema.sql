-- =============================================================
-- SWIPR DATABASE SETUP
-- Run this ENTIRE file in Supabase → SQL Editor → New Query
-- Click "Run" — you should see "Success. No rows returned."
-- =============================================================

-- ---- STEP 1: PROFILES TABLE ----
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

do $$ begin
  create policy "Profiles are viewable by everyone"
    on public.profiles for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own profile"
    on public.profiles for update using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own profile"
    on public.profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- ---- STEP 2: AUTO-CREATE PROFILE ON SIGNUP ----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- STEP 3: ITEMS TABLE ----
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('clothes', 'shoes', 'gadgets', 'accessories', 'other')) not null,
  condition text check (condition in ('new', 'like_new', 'good', 'fair')) not null,
  images text[] default '{}',
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table public.items enable row level security;

do $$ begin
  create policy "Items are viewable by everyone"
    on public.items for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own items"
    on public.items for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own items"
    on public.items for update using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete own items"
    on public.items for delete using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ---- STEP 4: SWIPES TABLE ----
create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.items(id) on delete cascade not null,
  direction text check (direction in ('left', 'right')) not null,
  created_at timestamptz default now(),
  unique(swiper_id, item_id)
);

alter table public.swipes enable row level security;

do $$ begin
  create policy "Users can see own swipes"
    on public.swipes for select using (auth.uid() = swiper_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own swipes"
    on public.swipes for insert with check (auth.uid() = swiper_id);
exception when duplicate_object then null;
end $$;

-- ---- STEP 5: MATCHES TABLE ----
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  item1_id uuid references public.items(id) on delete cascade not null,
  item2_id uuid references public.items(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined', 'completed')) default 'pending',
  created_at timestamptz default now()
);

alter table public.matches enable row level security;

do $$ begin
  create policy "Users can see own matches"
    on public.matches for select using (auth.uid() = user1_id or auth.uid() = user2_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert matches"
    on public.matches for insert with check (auth.uid() = user1_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own matches"
    on public.matches for update using (auth.uid() = user1_id or auth.uid() = user2_id);
exception when duplicate_object then null;
end $$;

-- ---- STEP 6: MESSAGES TABLE ----
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

do $$ begin
  create policy "Match participants can view messages"
    on public.messages for select using (
      exists (
        select 1 from public.matches m
        where m.id = match_id
          and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Match participants can send messages"
    on public.messages for insert with check (
      auth.uid() = sender_id
      and exists (
        select 1 from public.matches m
        where m.id = match_id
          and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

-- ---- STEP 7: STORAGE BUCKET ----
insert into storage.buckets (id, name, public)
values ('items', 'items', true)
on conflict (id) do nothing;

do $$ begin
  create policy "Item images are publicly accessible"
    on storage.objects for select using (bucket_id = 'items');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can upload item images"
    on storage.objects for insert
    with check (bucket_id = 'items' and auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete own images"
    on storage.objects for delete
    using (bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

-- ---- STEP 8: REALTIME ----
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when others then null;
end $$;

-- ---- DONE ----
select 'Swipr database setup complete! All tables, policies, and triggers created.' as result;
