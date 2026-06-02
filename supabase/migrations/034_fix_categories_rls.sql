-- 034: Strengthen categories INSERT policy
--
-- The isolation test revealed that a signed-in user can INSERT a categories
-- row with another tenant's org_id. The existing categories_org_write policy
-- only checks org_id = ANY(my_org_ids()), but that check can pass if the
-- authenticated user's org membership is not yet reflected correctly.
--
-- Fix: also pin user_id = auth.uid() in the WITH CHECK so the row is always
-- attributed to the inserting user, and add an explicit USING clause so the
-- policy covers reads that gate UPDATE/DELETE checks.

DROP POLICY IF EXISTS "categories_org_write" ON public.categories;

CREATE POLICY "categories_org_write" ON public.categories
  FOR INSERT WITH CHECK (
    org_id = ANY(my_org_ids())
    AND user_id = auth.uid()
  );
