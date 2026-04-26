-- =============================================================
-- SWIPR MATCH-SYSTEM UPDATE
-- Run this in Supabase -> SQL Editor -> New Query -> Run
-- Safe to re-run (idempotent).
-- =============================================================

-- ---- Profiles fields used by onboarding/profile edit ----
alter table public.profiles
  add column if not exists interests text[] default '{}',
  add column if not exists accent_color text,
  add column if not exists onboarded_at timestamptz;

-- ---- Seen flags on matches for unseen-badge tracking ----
alter table public.matches
  add column if not exists user1_seen boolean default false,
  add column if not exists user2_seen boolean default false;

do $$ begin
  create policy "Users can delete own swipes"
    on public.swipes for delete using (auth.uid() = swiper_id);
exception when duplicate_object then null;
end $$;

-- ---- Achievements used by profile + lifecycle events ----
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

-- ---- Trade proposals used inside chat ----
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

-- ---- Server-side match creation on reciprocal right-swipes ----
-- SECURITY DEFINER lets this bypass the swipes RLS policy so it can see
-- swipes from both users. It also prevents client-side race conditions.
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

  -- Has the other user right-swiped any item owned by the current swiper?
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

  -- De-dupe by item pair, not user pair, so new listings can still match.
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
  -- user1 (the swiper who triggered the match) is shown the modal immediately,
  -- so we pre-mark them as seen. user2 gets the realtime push + badge.

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

-- ---- Storage policy repair for avatars + item media ----
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
  drop policy if exists "Authenticated users can upload item images" on storage.objects;
exception when undefined_object then null;
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
  alter publication supabase_realtime add table public.trade_proposals;
exception when others then null;
end $$;

select 'Match trigger, trade transaction, storage repair, and missing tables installed.' as result;
