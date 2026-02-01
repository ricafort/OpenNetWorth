-- ClearWorth Complete Database Setup v3
-- Run this in the Supabase SQL Editor to set up the entire database from scratch.

-- 1. Create tables

-- Users profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  privacy_mode BOOLEAN DEFAULT TRUE,
  
  -- Admin / Demo Features
  is_template BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user', -- 'admin' | 'user'
  template_name TEXT,       -- e.g., "UK Starter"
  country_code TEXT,        -- e.g., 'GB'
  currency_code TEXT DEFAULT 'USD',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cash', 'investment', 'real_estate', 'retirement', 'other'
  value NUMERIC NOT NULL DEFAULT 0,
  is_liquid BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD',
  investment_details JSONB, -- Stores ticker, shares, costBasis, etc.
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Liabilities
CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'mortgage', 'student_loan', 'auto_loan', 'credit_card', 'other'
  balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  minimum_payment NUMERIC DEFAULT 0,
  is_good_debt BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'USD',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Goals (New)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  start_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL, -- 'net_worth', 'savings', 'debt_payoff', 'custom'
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Recurring Transactions (New)
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'income', 'expense'
  frequency TEXT NOT NULL, -- 'weekly', 'monthly', etc.
  category TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cash Flow History / Snapshots (New)
CREATE TABLE IF NOT EXISTS public.cash_flow_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- Stored as first day of month usually
  income NUMERIC DEFAULT 0,
  expenses NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  UNIQUE(user_id, month)
);

-- Net Worth History (Snapshots)
CREATE TABLE IF NOT EXISTS public.net_worth_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  total_assets NUMERIC NOT NULL,
  total_liabilities NUMERIC NOT NULL,
  net_worth NUMERIC NOT NULL,
  UNIQUE(user_id, date)
);

-- Mentor Interactions
CREATE TABLE IF NOT EXISTS public.mentor_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mentor_id TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL, 
  mode TEXT NOT NULL, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom Mentors
CREATE TABLE IF NOT EXISTS public.custom_mentors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  description TEXT NOT NULL,
  personality_prompt TEXT NOT NULL,
  icon_name TEXT DEFAULT 'User',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_mentors ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- --- PROFILES ---
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin Access
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Public can view templates" ON public.profiles FOR SELECT USING (is_template = TRUE);

-- Helper for Admin Impersonation logic
-- (Repeated for each table for maximum security)
-- Check if user is owner OR user is admin and target is a template

-- --- ASSETS ---
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assets" ON public.assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template assets" ON public.assets FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.assets.user_id AND is_template = TRUE)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- --- LIABILITIES ---
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own liabilities" ON public.liabilities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template liabilities" ON public.liabilities FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.liabilities.user_id AND is_template = TRUE)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- --- GOALS ---
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template goals" ON public.goals FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.goals.user_id AND is_template = TRUE)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- --- RECURRING TRANSACTIONS ---
CREATE POLICY "Users can view own recurring" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recurring" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template recurring" ON public.recurring_transactions FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.recurring_transactions.user_id AND is_template = TRUE)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- --- CASH FLOW HISTORY ---
CREATE POLICY "Users can view own cashflow" ON public.cash_flow_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cashflow" ON public.cash_flow_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template cashflow" ON public.cash_flow_history FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.cash_flow_history.user_id AND is_template = TRUE)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- --- NET WORTH HISTORY ---
CREATE POLICY "Users can view own history" ON public.net_worth_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own history" ON public.net_worth_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template history" ON public.net_worth_history FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.net_worth_history.user_id AND is_template = TRUE)
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- --- MENTOR INTERACTIONS ---
CREATE POLICY "Users can manage own interactions" ON public.mentor_interactions FOR ALL USING (auth.uid() = user_id);

-- --- CUSTOM MENTORS ---
CREATE POLICY "Users can manage own custom mentors" ON public.custom_mentors FOR ALL USING (auth.uid() = user_id);

-- 4. Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
