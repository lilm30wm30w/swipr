-- Run this in your Supabase SQL Editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Items
create table public.items (
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
create policy "Items are viewable by everyone" on public.items for select using (true);
create policy "Users can insert own items" on public.items for insert with check (auth.uid() = user_id);
create policy "Users can update own items" on public.items for update using (auth.uid() = user_id);
create policy "Users can delete own items" on public.items for delete using (auth.uid() = user_id);

-- Swipes
create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.items(id) on delete cascade not null,
  direction text check (direction in ('left', 'right')) not null,
  created_at timestamptz default now(),
  unique(swiper_id, item_id)
);
alter table public.swipes enable row level security;
create policy "Users can see own swipes" on public.swipes for select using (auth.uid() = swiper_id);
create policy "Users can insert own swipes" on public.swipes for insert with check (auth.uid() = swiper_id);

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  item1_id uuid references public.items(id) on delete cascade not null,
  item2_id uuid references public.items(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined', 'completed')) default 'pending',
  created_at timestamptz default now()
);
alter table public.matches enable row level security;
create policy "Users can see own matches" on public.matches for select using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Users can insert matches" on public.matches for insert with check (auth.uid() = user1_id);
create policy "Users can update own matches" on public.matches for update using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Match participants can view messages" on public.messages for select using (
  exists (
    select 1 from public.matches
    where id = match_id and (user1_id = auth.uid() or user2_id = auth.uid())
  )
);
create policy "Match participants can send messages" on public.messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.matches
    where id = match_id and (user1_id = auth.uid() or user2_id = auth.uid())
  )
);

-- Storage bucket for item images
insert into storage.buckets (id, name, public) values ('items', 'items', true);
create policy "Item images are publicly accessible" on storage.objects for select using (bucket_id = 'items');
create policy "Authenticated users can upload item images" on storage.objects for insert with check (bucket_id = 'items' and auth.role() = 'authenticated');
create policy "Users can delete own images" on storage.objects for delete using (bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
