-- Place images bucket for caching Google Places photos.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor).
-- Bucket is public for read; uploads require service_role or RLS policy below.

insert into storage.buckets (id, name, public)
values ('place_images', 'place_images', true)
on conflict (id) do update set public = true;

-- Allow public read (default for public buckets).
-- Allow service_role and authenticated uploads for place image caching.
drop policy if exists "place_images_public_read" on storage.objects;
create policy "place_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'place_images');

drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects for insert
to authenticated, service_role
with check (bucket_id = 'place_images');
