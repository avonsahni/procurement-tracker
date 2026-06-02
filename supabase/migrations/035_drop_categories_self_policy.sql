-- 035: Drop the stale per-user categories_self policy
--
-- The isolation test (run 16) still showed a cross-tenant INSERT leak on
-- categories even after 034 tightened categories_org_write. Root cause:
-- migration 000 created a FOR ALL policy "categories_self" with
--   USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
-- Migration 006 dropped categories_owner and categories_org but NOT
-- categories_self. PostgreSQL OR's permissive policies, so categories_self
-- allowed any authenticated user to INSERT a row carrying their own user_id
-- but ANOTHER tenant's org_id — the org_id check in categories_org_write
-- was bypassed entirely.
--
-- Dropping categories_self leaves the org-scoped policies (006 + 034) as the
-- sole gate, which correctly require org_id = ANY(my_org_ids()).

DROP POLICY IF EXISTS "categories_self" ON public.categories;
