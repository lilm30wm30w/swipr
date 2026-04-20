-- =============================================================
-- SWIPR MATCH-SYSTEM UPDATE
-- Run this in Supabase -> SQL Editor -> New Query -> Run
-- Safe to re-run (idempotent).
-- =============================================================

-- ---- Seen flags on matches for unseen-badge tracking ----
alter table public.matches
  add column if not exists user1_seen boolean default false,
  add column if not exists user2_seen boolean default false;

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
  limit 1;

  if reciprocal_item_id is null then
    return new;
  end if;

  -- De-dupe: don't create a second match between the same pair
  if exists (
    select 1 from public.matches
    where (user1_id = new.swiper_id and user2_id = other_user_id)
       or (user1_id = other_user_id and user2_id = new.swiper_id)
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

select 'Match trigger + seen columns installed.' as result;
