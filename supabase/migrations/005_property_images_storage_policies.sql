-- Migration 005: RLS policies for the property-images storage bucket.
--
-- The bucket itself is created manually in the Supabase dashboard and marked
-- PUBLIC (anyone can read by URL). These policies gate WRITES — only
-- authenticated users may upload/replace/delete, scoped by deal ownership.
--
-- Path convention: property-images/{deal_id}/{uuid}.{ext}
-- (storage.foldername(name))[1] returns the {deal_id} segment; we then
-- verify the requesting user owns that deal.
--
-- IMPORTANT: We use `(storage.foldername(name))[1] IN (subquery)` at the
-- OUTER level rather than an EXISTS subquery aliased as `deals d`. Putting
-- the call inside an EXISTS with a `deals d` alias causes Postgres to
-- silently resolve the unqualified `name` to `d.name` (the legacy deals.name
-- column), checking the deal's title text instead of the file path — which
-- never matches and blocks every upload with "new row violates RLS policy".
--
-- Run this AFTER creating the bucket in the dashboard.

DROP POLICY IF EXISTS "property_images_insert_owner" ON storage.objects;
CREATE POLICY "property_images_insert_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "property_images_update_owner" ON storage.objects;
CREATE POLICY "property_images_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "property_images_delete_owner" ON storage.objects;
CREATE POLICY "property_images_delete_owner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.deals WHERE user_id = auth.uid()
  )
);

-- Reads go through the public CDN URL; no SELECT policy needed because the
-- bucket is marked PUBLIC. If you ever flip it to private, add an analogous
-- SELECT policy here.
