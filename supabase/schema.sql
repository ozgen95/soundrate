-- ============================================
-- SoundRate Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ============================================
-- ARTISTS
-- ============================================
create table public.artists (
  id uuid default uuid_generate_v4() primary key,
  spotify_id text unique not null,
  name text not null,
  image_url text,
  genres text[] default '{}',
  created_at timestamptz default now() not null
);

alter table public.artists enable row level security;

create policy "Artists are viewable by everyone"
  on public.artists for select using (true);

create policy "Authenticated users can insert artists"
  on public.artists for insert with check (auth.role() = 'authenticated');

-- ============================================
-- ALBUMS
-- ============================================
create table public.albums (
  id uuid default uuid_generate_v4() primary key,
  spotify_id text unique not null,
  title text not null,
  artist_id uuid references public.artists on delete cascade not null,
  cover_url text,
  release_date text,
  total_tracks int default 0,
  created_at timestamptz default now() not null
);

alter table public.albums enable row level security;

create policy "Albums are viewable by everyone"
  on public.albums for select using (true);

create policy "Authenticated users can insert albums"
  on public.albums for insert with check (auth.role() = 'authenticated');

-- ============================================
-- SONGS (tracks)
-- ============================================
create table public.songs (
  id uuid default uuid_generate_v4() primary key,
  spotify_id text unique not null,
  title text not null,
  artist_id uuid references public.artists on delete cascade not null,
  album_id uuid references public.albums on delete cascade,
  track_number int,
  duration_ms int,
  preview_url text,
  created_at timestamptz default now() not null
);

alter table public.songs enable row level security;

create policy "Songs are viewable by everyone"
  on public.songs for select using (true);

create policy "Authenticated users can insert songs"
  on public.songs for insert with check (auth.role() = 'authenticated');

-- ============================================
-- RATINGS (polymorphic: songs OR albums)
-- ============================================
create table public.ratings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  song_id uuid references public.songs on delete cascade,
  album_id uuid references public.albums on delete cascade,
  score int not null check (score >= 1 and score <= 5),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Must rate either a song or an album, not both, not neither
  constraint rating_target_check check (
    (song_id is not null and album_id is null) or
    (song_id is null and album_id is not null)
  ),
  -- One rating per user per song
  constraint unique_user_song unique (user_id, song_id),
  -- One rating per user per album
  constraint unique_user_album unique (user_id, album_id)
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.ratings for select using (true);

create policy "Authenticated users can insert ratings"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on public.ratings for update using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on public.ratings for delete using (auth.uid() = user_id);

-- ============================================
-- REVIEWS (optional text review tied to a rating)
-- ============================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  rating_id uuid references public.ratings on delete cascade not null unique,
  body text not null check (char_length(body) > 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);

create policy "Authenticated users can insert reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update their own reviews"
  on public.reviews for update using (auth.uid() = user_id);

create policy "Users can delete their own reviews"
  on public.reviews for delete using (auth.uid() = user_id);

-- ============================================
-- FOLLOWS (social graph)
-- ============================================
create table public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles on delete cascade not null,
  following_id uuid references public.profiles on delete cascade not null,
  created_at timestamptz default now() not null,

  constraint no_self_follow check (follower_id != following_id),
  constraint unique_follow unique (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Authenticated users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_ratings_song on public.ratings(song_id) where song_id is not null;
create index idx_ratings_album on public.ratings(album_id) where album_id is not null;
create index idx_ratings_user on public.ratings(user_id);
create index idx_songs_album on public.songs(album_id);
create index idx_songs_artist on public.songs(artist_id);
create index idx_albums_artist on public.albums(artist_id);
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);
create index idx_reviews_rating on public.reviews(rating_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.ratings
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.reviews
  for each row execute procedure public.handle_updated_at();
