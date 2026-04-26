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
  interests text[] default '{}',
  accent_color text,
  onboarded_at timestamptz,
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists interests text[] default '{}',
  add column if not exists accent_color text,
  add column if not exists onboarded_at timestamptz;

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

do $$ begin
  create policy "Users can delete own swipes"
    on public.swipes for delete using (auth.uid() = swiper_id);
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
  user1_seen boolean default false,
  user2_seen boolean default false,
  created_at timestamptz default now()
);

alter table public.matches
  add column if not exists user1_seen boolean default false,
  add column if not exists user2_seen boolean default false;

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

-- ---- STEP 5B: ACHIEVEMENTS TABLE ----
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in (
    'first_match',
    'first_trade',
    'ten_swipes',
    'fifty_swipes',
    'first_listing',
    'three_trades',
    'curator'
  )) not null,
  earned_at timestamptz default now(),
  unique(user_id, type)
);

alter table public.achievements enable row level security;

do $$ begin
  create policy "Achievements are viewable by everyone"
    on public.achievements for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can insert achievements"
    on public.achievements for insert
    with check (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

-- ---- STEP 5C: TRADE PROPOSALS TABLE ----
create table if not exists public.trade_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  proposer_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamptz default now(),
  responded_at timestamptz
);

alter table public.trade_proposals enable row level security;

do $$ begin
  create policy "Match participants can view trade proposals"
    on public.trade_proposals for select using (
      exists (
        select 1 from public.matches m
        where m.id = match_id
          and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Match participants can create own trade proposals"
    on public.trade_proposals for insert with check (
      auth.uid() = proposer_id
      and exists (
        select 1 from public.matches m
        where m.id = match_id
          and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Match participants can update trade proposals"
    on public.trade_proposals for update using (
      exists (
        select 1 from public.matches m
        where m.id = match_id
          and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Proposers can delete own trade proposals"
    on public.trade_proposals for delete using (auth.uid() = proposer_id);
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

-- ---- STEP 6B: MATCH TRIGGER ----
create or replace function public.create_match_on_swipe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  other_user_id uuid;
  reciprocal_item_id uuid;
begin
  if new.direction <> 'right' then
    return new;
  end if;

  select user_id into other_user_id
  from public.items
  where id = new.item_id;

  if other_user_id is null or other_user_id = new.swiper_id then
    return new;
  end if;

  select s.item_id into reciprocal_item_id
  from public.swipes s
  join public.items i on i.id = s.item_id
  where s.swiper_id = other_user_id
    and s.direction = 'right'
    and i.user_id = new.swiper_id
    and i.is_available = true
    and not exists (
      select 1 from public.matches m
      where (m.item1_id = s.item_id and m.item2_id = new.item_id)
         or (m.item1_id = new.item_id and m.item2_id = s.item_id)
    )
  order by s.created_at desc
  limit 1;

  if reciprocal_item_id is null then
    return new;
  end if;

  if exists (
    select 1 from public.matches
    where (item1_id = reciprocal_item_id and item2_id = new.item_id)
       or (item1_id = new.item_id and item2_id = reciprocal_item_id)
  ) then
    return new;
  end if;

  insert into public.matches
    (user1_id, user2_id, item1_id, item2_id, status, user1_seen, user2_seen)
  values
    (new.swiper_id, other_user_id, reciprocal_item_id, new.item_id, 'pending', true, false);

  return new;
end;
$$;

drop trigger if exists trg_create_match on public.swipes;
create trigger trg_create_match
  after insert on public.swipes
  for each row execute function public.create_match_on_swipe();

create or replace function public.discover_feed(p_category text default null, p_limit integer default 50)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  category text,
  condition text,
  images text[],
  is_available boolean,
  created_at timestamptz,
  profile_id uuid,
  profile_username text,
  profile_full_name text,
  profile_avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.user_id,
    i.title,
    i.description,
    i.category,
    i.condition,
    i.images,
    i.is_available,
    i.created_at,
    p.id as profile_id,
    p.username as profile_username,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url
  from public.items i
  join public.profiles p on p.id = i.user_id
  where auth.uid() is not null
    and i.is_available = true
    and i.user_id <> auth.uid()
    and (p_category is null or i.category = p_category)
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = auth.uid()
        and s.item_id = i.id
    )
  order by i.created_at desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

create or replace function public.complete_trade(p_match_id uuid, p_proposal_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  current_match public.matches%rowtype;
  current_proposal public.trade_proposals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
    into current_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if auth.uid() not in (current_match.user1_id, current_match.user2_id) then
    raise exception 'Not allowed to complete this trade';
  end if;

  if current_match.status = 'completed' then
    return;
  end if;

  select *
    into current_proposal
  from public.trade_proposals
  where id = p_proposal_id
    and match_id = p_match_id
  for update;

  if not found then
    raise exception 'Trade proposal not found';
  end if;

  if current_proposal.status <> 'pending' then
    raise exception 'Trade proposal is no longer pending';
  end if;

  update public.trade_proposals
  set status = 'accepted',
      responded_at = now()
  where id = current_proposal.id;

  update public.matches
  set status = 'completed'
  where id = current_match.id;

  update public.items
  set is_available = false
  where id in (current_match.item1_id, current_match.item2_id);
end;
$$;

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
    with check (
      bucket_id = 'items'
      and auth.role() = 'authenticated'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own images"
    on storage.objects for update
    using (
      bucket_id = 'items'
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
      bucket_id = 'items'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
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

do $$ begin
  alter publication supabase_realtime add table public.trade_proposals;
exception when others then null;
end $$;

-- ---- DONE ----
select 'Swipr database setup complete! All tables, policies, and triggers created.' as result;
