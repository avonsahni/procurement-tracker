-- ═══════════════════════════════════════════════════════════════════
-- 007_storage_rls.sql
-- Enforce org-level isolation on the `package-documents` storage bucket.
-- Files are stored at:  {org_id}/{package_id}/{uuid}_{filename}
-- These policies ensure a user can only read/write/delete objects
-- whose first path segment matches one of their own org IDs.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- Drop any existing open policies on this bucket
DROP POLICY IF EXISTS "Public read access"         ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload"       ON storage.objects;
DROP POLICY IF EXISTS "Owner delete"               ON storage.objects;
DROP POLICY IF EXISTS "org_storage_select"         ON storage.objects;
DROP POLICY IF EXISTS "org_storage_insert"         ON storage.objects;
DROP POLICY IF EXISTS "org_storage_update"         ON storage.objects;
DROP POLICY IF EXISTS "org_storage_delete"         ON storage.objects;

-- SELECT: user may read objects in their org's folder
CREATE POLICY "org_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'package-documents'
    AND (string_to_array(name, '/'))[1] IN (
      SELECT org_id::text
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: user may upload into their org's folder
CREATE POLICY "org_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'package-documents'
    AND (string_to_array(name, '/'))[1] IN (
      SELECT org_id::text
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE (e.g. upsert): same org restriction
CREATE POLICY "org_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'package-documents'
    AND (string_to_array(name, '/'))[1] IN (
      SELECT org_id::text
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: user may only delete from their org's folder
CREATE POLICY "org_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'package-documents'
    AND (string_to_array(name, '/'))[1] IN (
      SELECT org_id::text
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
