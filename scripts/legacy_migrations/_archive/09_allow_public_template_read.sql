
-- 09_allow_public_template_read.sql
-- Allow all authenticated users to VIEW (Select) data belonging to Templates.
-- This is necessary for "Demo Mode" to work for non-admin users.

-- ASSETS
DROP POLICY IF EXISTS "Public can view template assets" ON public.assets;
CREATE POLICY "Public can view template assets" ON public.assets FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.assets.user_id AND is_template = TRUE)
);

-- LIABILITIES
DROP POLICY IF EXISTS "Public can view template liabilities" ON public.liabilities;
CREATE POLICY "Public can view template liabilities" ON public.liabilities FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.liabilities.user_id AND is_template = TRUE)
);

-- RECURRING TRANSACTIONS
DROP POLICY IF EXISTS "Public can view template recurring" ON public.recurring_transactions;
CREATE POLICY "Public can view template recurring" ON public.recurring_transactions FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.recurring_transactions.user_id AND is_template = TRUE)
);

-- GOALS
DROP POLICY IF EXISTS "Public can view template goals" ON public.goals;
CREATE POLICY "Public can view template goals" ON public.goals FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.goals.user_id AND is_template = TRUE)
);

-- NET WORTH HISTORY
DROP POLICY IF EXISTS "Public can view template history" ON public.net_worth_history;
CREATE POLICY "Public can view template history" ON public.net_worth_history FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.net_worth_history.user_id AND is_template = TRUE)
);

-- CASH FLOW HISTORY
DROP POLICY IF EXISTS "Public can view template cashflow" ON public.cash_flow_history;
CREATE POLICY "Public can view template cashflow" ON public.cash_flow_history FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.cash_flow_history.user_id AND is_template = TRUE)
);
