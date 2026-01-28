-- =============================================================================
-- ClearWorth Complete Database Schema
-- =============================================================================
-- Version: Consolidated (2026-01-28)
-- 
-- USAGE: Run this file in the Supabase SQL Editor for a FRESH installation.
--        For existing databases, use individual migrations in supabase_migrations/
-- =============================================================================

-- ===========================
-- SECTION 1: CORE TABLES
-- ===========================

-- Users profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  privacy_mode BOOLEAN DEFAULT TRUE,
  
  -- Admin / Demo Features
  is_template BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  template_name TEXT,
  country_code TEXT,
  currency_code TEXT DEFAULT 'USD',
  
  -- Benchmark Features
  benchmark_bracket TEXT,
  income_range_display TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  is_liquid BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD',
  interest_rate NUMERIC DEFAULT 0,
  investment_details JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Liabilities
CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  minimum_payment NUMERIC DEFAULT 0,
  is_good_debt BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'USD',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Goals
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  start_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Recurring Transactions
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cash Flow History
CREATE TABLE IF NOT EXISTS public.cash_flow_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  income NUMERIC DEFAULT 0,
  expenses NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  UNIQUE(user_id, month)
);

-- Net Worth History
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

-- ===========================
-- SECTION 2: BANK INTEGRATION
-- ===========================

CREATE TABLE IF NOT EXISTS public.linked_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('plaid', 'basiq', 'brankas')),
  item_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, provider, item_id)
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  linked_item_id UUID REFERENCES public.linked_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mask TEXT,
  type TEXT NOT NULL,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT,
  normalized_category TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT DEFAULT 'posted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(account_id, external_id)
);

-- ===========================
-- SECTION 3: GAMIFICATION
-- ===========================

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB,
  PRIMARY KEY (user_id, badge_id)
);

-- ===========================
-- SECTION 4: BENCHMARKS
-- ===========================

CREATE TABLE IF NOT EXISTS public.economic_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_country_code TEXT NOT NULL,
  percentile_bracket TEXT NOT NULL,
  year INTEGER NOT NULL,
  tax_year INTEGER,
  currency TEXT NOT NULL,
  effective_tax_rate NUMERIC,
  marginal_tax_rate NUMERIC,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(person_country_code, percentile_bracket, year)
);

-- ===========================
-- SECTION 5: ROW LEVEL SECURITY
-- ===========================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_benchmarks ENABLE ROW LEVEL SECURITY;

-- ===========================
-- SECTION 6: RLS POLICIES
-- ===========================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Public can view templates" ON public.profiles FOR SELECT USING (is_template = TRUE);

-- ASSETS
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assets" ON public.assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template assets" ON public.assets FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = public.assets.user_id AND is_template = TRUE)
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- LIABILITIES
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own liabilities" ON public.liabilities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage template liabilities" ON public.liabilities FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = public.liabilities.user_id AND is_template = TRUE)
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- GOALS
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- RECURRING TRANSACTIONS
CREATE POLICY "Users can view own recurring" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recurring" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id);

-- CASH FLOW HISTORY
CREATE POLICY "Users can view own cashflow" ON public.cash_flow_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cashflow" ON public.cash_flow_history FOR ALL USING (auth.uid() = user_id);

-- NET WORTH HISTORY
CREATE POLICY "Users can view own history" ON public.net_worth_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own history" ON public.net_worth_history FOR ALL USING (auth.uid() = user_id);

-- MENTOR INTERACTIONS
CREATE POLICY "Users can manage own interactions" ON public.mentor_interactions FOR ALL USING (auth.uid() = user_id);

-- CUSTOM MENTORS
CREATE POLICY "Users can manage own custom mentors" ON public.custom_mentors FOR ALL USING (auth.uid() = user_id);

-- LINKED ITEMS
CREATE POLICY "Users can manage own linked items" ON public.linked_items FOR ALL USING (auth.uid() = user_id);

-- BANK ACCOUNTS
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);

-- BANK TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.bank_transactions FOR SELECT USING (auth.uid() = user_id);

-- USER BADGES
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

-- BENCHMARKS (public read)
CREATE POLICY "Public can view benchmarks" ON public.economic_benchmarks FOR SELECT USING (true);
CREATE POLICY "Admins can manage benchmarks" ON public.economic_benchmarks FOR ALL 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ===========================
-- SECTION 7: FUNCTIONS & TRIGGERS
-- ===========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.award_badge(target_user_id UUID, badge_slug TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (target_user_id, badge_slug) ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_asset_badges()
RETURNS TRIGGER AS $$
DECLARE asset_count INTEGER;
BEGIN
  SELECT count(*) INTO asset_count FROM public.assets WHERE user_id = NEW.user_id;
  IF asset_count >= 1 THEN PERFORM public.award_badge(NEW.user_id, 'first-steps'); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_net_worth_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.net_worth > 0 THEN PERFORM public.award_badge(NEW.user_id, 'wealth-tracker'); END IF;
  IF NEW.net_worth >= 1000000 THEN PERFORM public.award_badge(NEW.user_id, 'millionaire'); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_liability_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.balance = 0 AND OLD.balance > 0) OR (TG_OP = 'INSERT' AND NEW.balance = 0) THEN
    PERFORM public.award_badge(NEW.user_id, 'debt-slayer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_asset_change ON public.assets;
CREATE TRIGGER on_asset_change AFTER INSERT ON public.assets FOR EACH ROW EXECUTE PROCEDURE public.check_asset_badges();

DROP TRIGGER IF EXISTS on_net_worth_change ON public.net_worth_history;
CREATE TRIGGER on_net_worth_change AFTER INSERT OR UPDATE ON public.net_worth_history FOR EACH ROW EXECUTE PROCEDURE public.check_net_worth_badges();

DROP TRIGGER IF EXISTS on_liability_change ON public.liabilities;
CREATE TRIGGER on_liability_change AFTER INSERT OR UPDATE ON public.liabilities FOR EACH ROW EXECUTE PROCEDURE public.check_liability_badges();

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
