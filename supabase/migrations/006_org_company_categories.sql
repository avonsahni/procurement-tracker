-- ═══════════════════════════════════════════════════════════════════
-- 006_org_company_categories.sql
-- Migrate company_info and categories from per-user to per-org.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────── company_info → org_id ───────────────────────

-- 1. Add org_id column
ALTER TABLE public.company_info
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Populate org_id: pick the user's highest-privilege org membership
UPDATE public.company_info ci
SET org_id = (
  SELECT om.org_id
  FROM public.organization_members om
  WHERE om.user_id = ci.user_id
  ORDER BY CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
  LIMIT 1
)
WHERE ci.org_id IS NULL;

-- 3. Where multiple users in the same org each have a company_info row,
--    keep only the row belonging to the org owner. Delete the rest.
DELETE FROM public.company_info ci
WHERE ci.org_id IS NOT NULL
  AND ci.ctid NOT IN (
    SELECT DISTINCT ON (org_id) ctid
    FROM public.company_info
    ORDER BY org_id,
      CASE (
        SELECT role FROM public.organization_members om
        WHERE om.user_id = company_info.user_id AND om.org_id = company_info.org_id
      )
        WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2
      END
  );

-- 4. Drop rows with no org (orphaned users with no org membership)
DELETE FROM public.company_info WHERE org_id IS NULL;

-- 5. Unique index: one company_info per org
CREATE UNIQUE INDEX IF NOT EXISTS company_info_org_id_unique ON public.company_info(org_id);

-- 6. Update RLS policies for company_info
DROP POLICY IF EXISTS "company_info_user" ON public.company_info;
DROP POLICY IF EXISTS "company_info_org_read" ON public.company_info;
DROP POLICY IF EXISTS "company_info_org_write" ON public.company_info;

CREATE POLICY "company_info_org_read" ON public.company_info
  FOR SELECT USING (org_id = ANY(my_org_ids()));

CREATE POLICY "company_info_org_write" ON public.company_info
  FOR ALL USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- ─────────────────────── categories → org_id ───────────────────────

-- 1. Add org_id column
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Populate org_id from the user's highest-privilege org membership
UPDATE public.categories c
SET org_id = (
  SELECT om.org_id
  FROM public.organization_members om
  WHERE om.user_id = c.user_id
  ORDER BY CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
  LIMIT 1
)
WHERE c.org_id IS NULL;

-- 3. Deduplicate: for same org + same name (case-insensitive), keep one row
DELETE FROM public.categories c
WHERE c.ctid NOT IN (
  SELECT MIN(ctid)
  FROM public.categories
  WHERE org_id IS NOT NULL
  GROUP BY org_id, LOWER(name)
);

-- 4. Drop rows with no org
DELETE FROM public.categories WHERE org_id IS NULL;

-- 5. Drop old unique constraint and add org-scoped one
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS categories_org_name_unique ON public.categories(org_id, LOWER(name));

-- 6. Update RLS policies for categories
DROP POLICY IF EXISTS "categories_owner" ON public.categories;
DROP POLICY IF EXISTS "categories_org" ON public.categories;

-- Any org member can read; any org member with canEdit can write (route guard enforces)
CREATE POLICY "categories_org_read" ON public.categories
  FOR SELECT USING (org_id = ANY(my_org_ids()));

CREATE POLICY "categories_org_write" ON public.categories
  FOR INSERT WITH CHECK (org_id = ANY(my_org_ids()));

CREATE POLICY "categories_org_update" ON public.categories
  FOR UPDATE USING (org_id = ANY(my_org_ids())) WITH CHECK (org_id = ANY(my_org_ids()));

CREATE POLICY "categories_org_delete" ON public.categories
  FOR DELETE USING (org_id = ANY(my_org_ids()));

-- ─────────────────────── update handle_new_user trigger ───────────────────────
-- Admin-created users (with org_id in metadata) skip company_info/categories —
-- they inherit the org's existing ones.
-- Self-signup users get org-scoped company_info and default categories.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  provided_org_id text;
  provided_role text;
  cat text;
BEGIN
  -- Always create a profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  provided_org_id := new.raw_user_meta_data->>'org_id';
  provided_role   := COALESCE(new.raw_user_meta_data->>'org_role', 'viewer');

  IF provided_org_id IS NOT NULL AND provided_org_id <> '' THEN
    -- Admin-created user: join the specified org.
    -- Org already has company_info and categories — don't duplicate them.
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (provided_org_id::uuid, new.id, provided_role)
    ON CONFLICT (org_id, user_id) DO NOTHING;

  ELSE
    -- Self-signup: create a fresh org with full defaults.
    INSERT INTO public.organizations (name)
    VALUES ('My Organization')
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, new.id, 'owner');

    -- Org-scoped company branding
    INSERT INTO public.company_info (user_id, org_id, name, tagline)
    VALUES (new.id, new_org_id, 'Procurement Tracker', 'Enterprise Source of Truth')
    ON CONFLICT DO NOTHING;

    -- Default categories for the org
    FOREACH cat IN ARRAY ARRAY['Civil', 'Electrical', 'Mechanical', 'Instrumentation', 'Services']
    LOOP
      INSERT INTO public.categories (user_id, org_id, name)
      VALUES (new.id, new_org_id, cat)
      ON CONFLICT DO NOTHING;
    END LOOP;

  END IF;

  RETURN new;
END;
$$;
