
-- 15_fix_public_access.sql

-- 1. Allow Public (Anon) to read Profiles that are Templates
-- (Crucial: otherwise the "is_template" check logic in other policies always fails for them)
CREATE POLICY "Public can view template profiles" 
ON public.profiles FOR SELECT 
USING (is_template = TRUE);

-- 2. Ensure Public (Anon) has permission to SELECT from these tables
-- often 'anon' has basic usage, but explicit GRANT makes sure they aren't blocked at table level
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.user_badges TO anon, authenticated;

-- 3. Double check user_badges policy for public (idempotent re-creation)
DROP POLICY IF EXISTS "Public can view template badges" ON public.user_badges;
CREATE POLICY "Public can view template badges"
ON public.user_badges FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.user_badges.user_id AND is_template = TRUE)
);
