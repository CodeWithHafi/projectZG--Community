-- Media Management 

-- 1. Media Table
-- Central registry for all uploaded files
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket_name text not null check (bucket_name in ('avatars', 'posts', 'stories')), -- Aligned with StorageBuckets
  file_path text not null, -- Expected format: bucket_name/user_id/filename usually
  file_name text not null,
  file_size bigint,
  mime_type text,
  width integer,  -- Metadata for UI optimization
  height integer, -- Metadata for UI optimization
  duration integer, -- For videos
  
  alt_text text,
  is_public boolean default true,
  
  -- Tracking usage
  ref_count integer default 0, -- How many posts/stories use this?
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. RLS Policies
alter table public.media enable row level security;

create policy "Media is viewable by everyone"
  on public.media for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can upload own media"
  on public.media for insert
  with check (auth.uid() = user_id);

create policy "Users can update own media metadata"
  on public.media for update
  using (auth.uid() = user_id);

create policy "Users can delete own media"
  on public.media for delete
  using (auth.uid() = user_id);

-- 3. Optimization Indexes
create index if not exists media_user_idx on public.media(user_id);
create index if not exists media_lookup_idx on public.media(bucket_name, file_path);
create index if not exists media_created_idx on public.media(created_at desc);

-- 4. Utility Function to storage path gen (Optional)
-- Helps frontend keep paths consistent (bucket/user_id/uuid.ext)

create or replace function public.media_path(bucket_name text, user_id uuid, file_name text) returns text as $$
begin
    return bucket_name || '/' || user_id || '/' || file_name;
end;
$$ language plpgsql;
