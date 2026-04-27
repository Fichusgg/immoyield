-- Migration 005: RLS policies for the property-images storage bucket.
--
-- The bucket itself is created manually in the Supabase dashboard and marked
-- PUBLIC (anyone can read by URL). These policies gate WRITES — only
-- authenticated users may upload/replace/delete, scoped by deal ownership.
--
-- Path convention: property-images/{deal_id}/{uuid}.{ext}
-- We extract deal_id with (storage.foldername(name))[1] and verify the
-- requesting user owns that deal.
--
-- Run this AFTER creating the bucket in the dashboard.

-- ── INSERT (upload) ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "property_images_insert_owner" ON storage.objects;
CREATE POLICY "property_images_insert_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id = auth.uid()
  )
);

-- ── UPDATE (overwrite — only used when upsert=true) ─────────────────────────
DROP POLICY IF EXISTS "property_images_update_owner" ON storage.objects;
CREATE POLICY "property_images_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id = auth.uid()
  )
);

-- ── DELETE ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "property_images_delete_owner" ON storage.objects;
CREATE POLICY "property_images_delete_owner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id = auth.uid()
  )
);

-- ── SELECT ─────────────────────────────────────────────────────────────────
-- Reads go through the public CDN URL; no policy needed because the bucket
-- is marked PUBLIC. If you ever flip it to private, add an analogous SELECT
-- policy here.
