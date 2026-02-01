-- Fix 500 Error due to RLS Infinite Recursion

-- 1. Create a secure function to check admin status
-- SECURITY DEFINER means this function runs with the privileges of the creator (superuser)
-- causing it to BYPASS RLS when it runs. This prevents the infinite loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic recursive policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- 3. Re-create them using the safe function
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (public.is_admin());

-- 4. Update other tables' admin policies to use the safe function too (Optimization)
-- ASSETS
DROP POLICY IF EXISTS "Admins can manage template assets" ON public.assets;
CREATE POLICY "Admins can manage template assets" ON public.assets FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.assets.user_id AND is_template = TRUE)
  AND public.is_admin()
);

-- LIABILITIES
DROP POLICY IF EXISTS "Admins can manage template liabilities" ON public.liabilities;
CREATE POLICY "Admins can manage template liabilities" ON public.liabilities FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.liabilities.user_id AND is_template = TRUE)
  AND public.is_admin()
);

-- GOALS
DROP POLICY IF EXISTS "Admins can manage template goals" ON public.goals;
CREATE POLICY "Admins can manage template goals" ON public.goals FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.goals.user_id AND is_template = TRUE)
  AND public.is_admin()
);

-- RECURRING
DROP POLICY IF EXISTS "Admins can manage template recurring" ON public.recurring_transactions;
CREATE POLICY "Admins can manage template recurring" ON public.recurring_transactions FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.recurring_transactions.user_id AND is_template = TRUE)
  AND public.is_admin()
);

-- CASH FLOW
DROP POLICY IF EXISTS "Admins can manage template cashflow" ON public.cash_flow_history;
CREATE POLICY "Admins can manage template cashflow" ON public.cash_flow_history FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.cash_flow_history.user_id AND is_template = TRUE)
  AND public.is_admin()
);

-- NET WORTH
DROP POLICY IF EXISTS "Admins can manage template history" ON public.net_worth_history;
CREATE POLICY "Admins can manage template history" ON public.net_worth_history FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.net_worth_history.user_id AND is_template = TRUE)
  AND public.is_admin()
);
