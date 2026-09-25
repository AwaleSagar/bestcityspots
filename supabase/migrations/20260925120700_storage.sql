-- =============================================================================
-- Storage: cached Google Places photos (`{googlePlaceId}.jpg`, ≤ 800×600).
--
-- Public bucket → objects are served from
--   <SUPABASE_URL>/storage/v1/object/public/place_images/<id>.jpg
-- without any storage.objects policy. Deliberately, no SELECT policy is
-- created: it isn't needed for public URLs and would let API clients list the
-- bucket. Uploads use the secret key (service_role bypasses storage RLS), so
-- no INSERT/UPDATE policy is needed either.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place_images', 'place_images', true, 1048576, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
