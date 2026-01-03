-- Migration: Admin & Demo Profile Features

-- 1. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user', -- 'admin' | 'user'
ADD COLUMN IF NOT EXISTS template_name TEXT,       -- e.g. "UK Starter"
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS country_code TEXT;        -- Optional: 'GB', 'US', etc.

-- 2. Create Admin Policy (Admins can do EVERYTHING on profiles)
-- Note: You might need to manually set your own user to 'admin' in the table first!
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can insert/update/delete all profiles" 
ON public.profiles FOR ALL 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. Create Public/Demo Policy (Everyone can view templates)
CREATE POLICY "Everyone can view template profiles" 
ON public.profiles FOR SELECT 
USING (is_template = TRUE);

-- 4. Enable RLS on other tables for impersonation? 
-- Existing policies are: "Users can view own assets" USING (auth.uid() = user_id)
-- We need to allow Admins to view/edit ANY asset belonging to a template.

-- Assets
CREATE POLICY "Admins can view/edit template assets" 
ON public.assets FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.assets.user_id 
    AND is_template = TRUE
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- Liabilities
CREATE POLICY "Admins can view/edit template liabilities" 
ON public.liabilities FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.liabilities.user_id 
    AND is_template = TRUE
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- Net Worth History
CREATE POLICY "Admins can view/edit template history" 
ON public.net_worth_history FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.net_worth_history.user_id 
    AND is_template = TRUE
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- Goals
-- (Assuming goals table exists or will be created, adding policy safe-guard)
-- CREATE POLICY "Admins can view/edit template goals" ... (Similar pattern)
