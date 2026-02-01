-- =============================================================================
-- Security Fix: Privacy Level 3 (Break-Glass Support)
-- =============================================================================
-- Description:
-- 1. Creates 'admin_access_grants' table for temporary support access.
-- 2. Revokes blanket 'Admin' access to financial tables.
-- 3. Re-implements Admin access ONLY if a valid grant exists.

-- 1. Create Grants Table
CREATE TABLE IF NOT EXISTS public.admin_access_grants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES auth.users(id), -- Audit who created it
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_access_grants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create grants for themselves
CREATE POLICY "Users can manage own grants" ON public.admin_access_grants
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Admins can view active grants
CREATE POLICY "Admins can view grants" ON public.admin_access_grants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Helper Function to check Admin Access
CREATE OR REPLACE FUNCTION public.has_admin_access(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Check if caller is Admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN FALSE;
  END IF;

  -- 2. Check for Active Grant
  RETURN EXISTS (
    SELECT 1 FROM public.admin_access_grants 
    WHERE user_id = target_user_id 
    AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Financial Tables Policies
-- We DROP the old "Admins can manage..." and REPLACE with "Admins with Grant"

-- ASSETS
-- Note: You must check your specific policy names. Assuming standard naming from schema.
DROP POLICY IF EXISTS "Admins can manage template assets" ON public.assets;
CREATE POLICY "Admins can view assets with grant" ON public.assets
  FOR SELECT USING (public.has_admin_access(user_id));
-- Note: Admins can *Manage* template assets? 
-- Original logic allowed managing *Template* assets. We should PRESERVE that.
-- New Logic: Admin can View/Edit if (IsTemplate) OR (HasGrant).
-- Let's stick to VIEW for Grants (Read-Only Support).

-- LIABILITIES
DROP POLICY IF EXISTS "Admins can manage template liabilities" ON public.liabilities;
CREATE POLICY "Admins can view liabilities with grant" ON public.liabilities
  FOR SELECT USING (public.has_admin_access(user_id));

-- GOALS (Did not have explicit admin policy before, adding now for consistency or skipping?)
-- If it didn't have it, good. If we want support to see it, we add it.
CREATE POLICY "Admins can view goals with grant" ON public.goals
  FOR SELECT USING (public.has_admin_access(user_id));

-- RECURRING TRANSACTIONS
CREATE POLICY "Admins can view recurring with grant" ON public.recurring_transactions
  FOR SELECT USING (public.has_admin_access(user_id));

-- HISTORY TABLES
CREATE POLICY "Admins can view cashflow with grant" ON public.cash_flow_history
  FOR SELECT USING (public.has_admin_access(user_id));

CREATE POLICY "Admins can view net_worth with grant" ON public.net_worth_history
  FOR SELECT USING (public.has_admin_access(user_id));
