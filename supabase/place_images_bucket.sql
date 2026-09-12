-- Place images bucket for caching Google Places photos.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor).
-- Bucket is public for read; uploads require service_role or RLS policy below.

insert into storage.buckets (id, name, public)
values ('place_images', 'place_images', true)
on conflict (id) do update set public = true;

-- Allow public read (default for public buckets).
-- Uploads are restricted to service_role (see the policy below).
drop policy if exists "place_images_public_read" on storage.objects;
create policy "place_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'place_images');

-- SECURITY (audit M-1): uploads are service_role ONLY. `authenticated` was
-- previously allowed, but the app writes this bucket exclusively through the
-- service-role client (src/lib/places.ts), and with Supabase sign-ups enabled
-- any self-registered user could otherwise push arbitrary objects into a
-- public bucket on the project domain.
drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects for insert
to service_role
with check (bucket_id = 'place_images');
