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
-- 1. Create Economic Benchmarks Table
-- This table holds the "Truth Data" from WID and OECD.
CREATE TABLE IF NOT EXISTS public.economic_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_country_code TEXT NOT NULL, -- 'US', 'GB', 'AU', 'GLOBAL'
  percentile_bracket TEXT NOT NULL, -- 'p10', 'p50', 'p90', 'top_1_percent'
  year INTEGER NOT NULL, -- The year of the wealth/income data source
  tax_year INTEGER, -- The tax year the bracket applies to (e.g., 2024 for '2024-25')
  currency TEXT NOT NULL, -- 'USD', 'AUD', 'GBP'
  
  -- Tax Details
  effective_tax_rate NUMERIC, -- e.g., 0.28 for 28%
  marginal_tax_rate NUMERIC, -- e.g., 0.45 for 45% bracket
  
  -- The Core Metrics (Synthesized)
  metrics JSONB NOT NULL, 
  -- Structure: 
  -- {
  --   "net_worth": 150000,
  --   "avg_income": 85000,
  --   "avg_expenses": 70000,
  --   "avg_savings": 15000, -- Derived from Savings Rate
  --   "avg_investments": 80000, -- Financial Assets portion of Total Assets
  --   "avg_liquid_net_worth": 95000, -- Investments + Savings
  --   "avg_assets": 200000,
  --   "avg_liabilities": 50000,
  --   "composition": { "real_estate": 0.6, "debt_ratio": 0.25, "financial_ratio": 0.4 }
  -- }

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(person_country_code, percentile_bracket, year)
);

-- 2. Update Profiles to support "Dynamic Benchmarking"
-- These columns allow a Template (e.g., "AU Starter") to point to a specific benchmark.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS benchmark_bracket TEXT, -- e.g. 'p50'
ADD COLUMN IF NOT EXISTS income_range_display TEXT; -- e.g. '$45k - $135k' (Visual only)

-- 3. RLS Policies for Benchmarks
ALTER TABLE public.economic_benchmarks ENABLE ROW LEVEL SECURITY;

-- Everyone can read benchmarks (needed for comparisons)
CREATE POLICY "Public can view benchmarks" ON public.economic_benchmarks
FOR SELECT USING (true);

-- Only admins can manage benchmarks
CREATE POLICY "Admins can manage benchmarks" ON public.economic_benchmarks
FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
-- Migration: Allow Profiles without Auth Users (For Templates)
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verify it's gone by checking constraints if you want, or just proceed.
-- This allows us to insert rows with random UUIDs that don't match an auth.uid()

-- Migration: Add interest_rate to assets table
-- Date: 2025-12-31

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN public.assets.interest_rate IS 'Annual interest rate or return rate percentage (e.g., 5.0 for 5%)';
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

-- Migration: Add US Economic Benchmarks
-- Source: User provided IRS 2025 Brackets + 2024 Income Distribution
-- Note: Wealth/Asset figures are estimates based on standard ratios for these income percentiles.

INSERT INTO public.economic_benchmarks (person_country_code, percentile_bracket, year, tax_year, currency, effective_tax_rate, marginal_tax_rate, metrics)
VALUES
  -- 1. US Bottom 20% (Student / Low Income) -> ~$18.5k
  ('US', 'p20', 2024, 2025, 'USD', 0.107, 0.12, '{
    "net_worth": -15000, 
    "avg_income": 18460, 
    "avg_expenses": 19000, 
    "avg_savings": -540,
    "avg_investments": 1000,
    "avg_liquid_net_worth": 500,
    "avg_assets": 5000,
    "avg_liabilities": 20000,
    "composition": { "real_estate": 0.0, "debt_ratio": 4.0, "financial_ratio": 0.2 }
  }'),

  -- 2. US Middle Class (p50 Median) -> ~$84.4k
  ('US', 'p50', 2024, 2025, 'USD', 0.160, 0.22, '{
    "net_worth": 120000,
    "avg_income": 84390,
    "avg_expenses": 65000,
    "avg_savings": 6000,
    "avg_investments": 40000,
    "avg_liquid_net_worth": 20000,
    "avg_assets": 280000,
    "avg_liabilities": 160000,
    "composition": { "real_estate": 0.75, "debt_ratio": 0.57, "financial_ratio": 0.25 }
  }'),

  -- 3. US Upper Middle (p90 Top 10%) -> ~$173k
  ('US', 'p90', 2024, 2025, 'USD', 0.200, 0.24, '{
    "net_worth": 950000,
    "avg_income": 173176,
    "avg_expenses": 110000,
    "avg_savings": 28000,
    "avg_investments": 350000,
    "avg_liquid_net_worth": 150000,
    "avg_assets": 1400000,
    "avg_liabilities": 450000,
    "composition": { "real_estate": 0.65, "debt_ratio": 0.32, "financial_ratio": 0.35 }
  }'),

  -- 4. US Top 1% -> ~$824k
  ('US', 'top_1_percent', 2024, 2025, 'USD', 0.320, 0.37, '{
    "net_worth": 11000000,
    "avg_income": 823763,
    "avg_expenses": 350000,
    "avg_savings": 200000,
    "avg_investments": 8000000,
    "avg_liquid_net_worth": 4000000,
    "avg_assets": 12500000,
    "avg_liabilities": 1500000,
    "composition": { "real_estate": 0.30, "debt_ratio": 0.12, "financial_ratio": 0.70 }
  }')

ON CONFLICT (person_country_code, percentile_bracket, year) 
DO UPDATE SET 
    metrics = EXCLUDED.metrics,
    effective_tax_rate = EXCLUDED.effective_tax_rate,
    marginal_tax_rate = EXCLUDED.marginal_tax_rate;

-- Migration: Add UK Economic Benchmarks
-- Source: User provided UK 2025-26 Tax Brackets (England/Wales)
-- Estimates for Wealth/Assets based on UK cost of living and property values.

INSERT INTO public.economic_benchmarks (person_country_code, percentile_bracket, year, tax_year, currency, effective_tax_rate, marginal_tax_rate, metrics)
VALUES
  -- 1. UK Student / Low Income (p20) -> ~£14k
  ('GB', 'p20', 2024, 2025, 'GBP', 0.02, 0.20, '{
    "net_worth": -20000, 
    "avg_income": 14000, 
    "avg_expenses": 13500, 
    "avg_savings": 500,
    "avg_investments": 200,
    "avg_liquid_net_worth": 500,
    "avg_assets": 2000,
    "avg_liabilities": 22000,
    "composition": { "real_estate": 0.0, "debt_ratio": 1.5, "financial_ratio": 0.1 }
  }'),

  -- 2. UK Median (p50 Median) -> ~£35k
  ('GB', 'p50', 2024, 2025, 'GBP', 0.13, 0.20, '{
    "net_worth": 110000,
    "avg_income": 35000,
    "avg_expenses": 28000,
    "avg_savings": 3000,
    "avg_investments": 15000,
    "avg_liquid_net_worth": 8000,
    "avg_assets": 220000,
    "avg_liabilities": 110000,
    "composition": { "real_estate": 0.80, "debt_ratio": 0.50, "financial_ratio": 0.20 }
  }'),

  -- 3. UK Professional (p90 Top 10%) -> ~£85k
  ('GB', 'p90', 2024, 2025, 'GBP', 0.24, 0.40, '{
    "net_worth": 650000,
    "avg_income": 85000,
    "avg_expenses": 55000,
    "avg_savings": 15000,
    "avg_investments": 250000,
    "avg_liquid_net_worth": 50000,
    "avg_assets": 950000,
    "avg_liabilities": 300000,
    "composition": { "real_estate": 0.65, "debt_ratio": 0.32, "financial_ratio": 0.35 }
  }'),

  -- 4. UK Top 1% -> ~£200k+
  ('GB', 'top_1_percent', 2024, 2025, 'GBP', 0.38, 0.45, '{
    "net_worth": 3500000,
    "avg_income": 220000,
    "avg_expenses": 90000,
    "avg_savings": 80000,
    "avg_investments": 2000000,
    "avg_liquid_net_worth": 800000,
    "avg_assets": 4000000,
    "avg_liabilities": 500000,
    "composition": { "real_estate": 0.40, "debt_ratio": 0.12, "financial_ratio": 0.60 }
  }')

ON CONFLICT (person_country_code, percentile_bracket, year) 
DO UPDATE SET 
    metrics = EXCLUDED.metrics,
    effective_tax_rate = EXCLUDED.effective_tax_rate,
    marginal_tax_rate = EXCLUDED.marginal_tax_rate;

-- Migration: Add Philippines (PH) Economic Benchmarks
-- Source: User provided PIDS 2021 Income Brackets + BIR Tax Tables
-- Estimates for Wealth/Assets based on typical PH demographics.

INSERT INTO public.economic_benchmarks (person_country_code, percentile_bracket, year, tax_year, currency, effective_tax_rate, marginal_tax_rate, metrics)
VALUES
  -- 1. PH Low Income / Poor (p20) -> ~15k/mo -> 180k/yr
  ('PH', 'p20', 2024, 2024, 'PHP', 0.0, 0.0, '{
    "net_worth": -5000, 
    "avg_income": 180000, 
    "avg_expenses": 180000, 
    "avg_savings": 0,
    "avg_investments": 0,
    "avg_liquid_net_worth": 0,
    "avg_assets": 10000,
    "avg_liabilities": 15000,
    "composition": { "real_estate": 0.0, "debt_ratio": 1.5, "financial_ratio": 0.0 }
  }'),

  -- 2. PH Middle Class (p50) -> ~60k/mo -> 720k/yr
  -- Tax: 0-250k (0%), 250-400 (15%), 400-800 (20%)
  -- Approx Eff: ~45k tax on 720k => ~6%
  ('PH', 'p50', 2024, 2024, 'PHP', 0.06, 0.20, '{
    "net_worth": 500000,
    "avg_income": 720000,
    "avg_expenses": 600000,
    "avg_savings": 120000,
    "avg_investments": 100000,
    "avg_liquid_net_worth": 50000,
    "avg_assets": 1000000, -- Family Car + Lot/Small House
    "avg_liabilities": 500000,
    "composition": { "real_estate": 0.50, "debt_ratio": 0.50, "financial_ratio": 0.10 }
  }'),

  -- 3. PH High Income (p90) -> ~175k/mo -> 2.1M/yr
  -- Tax: 800-2M (25%), 2M-8M (30%).
  -- Approx Eff: 402.5k base + 30% on excess -> ~432k tax on 2.1M => ~20%
  ('PH', 'p90', 2024, 2024, 'PHP', 0.20, 0.30, '{
    "net_worth": 8000000,
    "avg_income": 2100000,
    "avg_expenses": 1200000,
    "avg_savings": 900000,
    "avg_investments": 3000000,
    "avg_liquid_net_worth": 1000000,
    "avg_assets": 12000000, -- Condo/House + Car
    "avg_liabilities": 4000000,
    "composition": { "real_estate": 0.60, "debt_ratio": 0.33, "financial_ratio": 0.25 }
  }'),

  -- 3b. PH Executive / Upper High (p98) -> ~400k/mo -> 4.8M/yr
  -- Tax: 2M - 8M bracket (30%).
  -- Approx Eff: ~26%
  ('PH', 'p98', 2024, 2024, 'PHP', 0.26, 0.30, '{
    "net_worth": 28000000,
    "avg_income": 4800000,
    "avg_expenses": 2500000,
    "avg_savings": 1000000,
    "avg_investments": 12000000,
    "avg_liquid_net_worth": 4000000,
    "avg_assets": 32000000, -- Nice Subdivision House + SUVs
    "avg_liabilities": 4000000,
    "composition": { "real_estate": 0.55, "debt_ratio": 0.15, "financial_ratio": 0.30 }
  }'),

  -- 4. PH Rich (Top 1%) -> ~800k+/mo -> 10M/yr
  -- Tax: 8M+ (35%).
  -- Approx Eff: 2.2M + 35% of 2M = 2.9M on 10M => ~29%
  ('PH', 'top_1_percent', 2024, 2024, 'PHP', 0.29, 0.35, '{
    "net_worth": 80000000,
    "avg_income": 10000000,
    "avg_expenses": 4000000,
    "avg_savings": 6000000,
    "avg_investments": 50000000,
    "avg_liquid_net_worth": 20000000,
    "avg_assets": 85000000,
    "avg_liabilities": 5000000,
    "composition": { "real_estate": 0.40, "debt_ratio": 0.05, "financial_ratio": 0.60 }
  }')

ON CONFLICT (person_country_code, percentile_bracket, year) 
DO UPDATE SET 
    metrics = EXCLUDED.metrics,
    effective_tax_rate = EXCLUDED.effective_tax_rate,
    marginal_tax_rate = EXCLUDED.marginal_tax_rate;

-- Metric: Economic Benchmarks for South Korea (KR)
-- Currency: KRW
-- Year: 2024 Estimates (Q4)

-- 1. Low Income / Student (p20)
-- Monthly ~2.4M KRW (~29M Annual). 
-- Net Worth: Minimal, likely just savings/deposit.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'KR', 
    'p20', 
    2024, 
    2024, 
    'KRW', 
    0.10, -- Effective ~10% (Low brackets + deductions)
    0.15, -- Marginal (15% bracket starts >14M)
    '{
        "avg_income": 29000000, 
        "avg_expenses": 26000000, 
        "avg_savings": 3000000,
        "avg_assets": 15000000, 
        "avg_liabilities": 5000000, 
        "net_worth": 10000000,
        "avg_investments": 1000000,
        "avg_liquid_net_worth": 5000000,
        "composition": { "real_estate_ratio": 0.0, "debt_ratio": 0.5, "financial_ratio": 0.5 }
    }'::jsonb
);

-- 2. Middle Class (p50)
-- Monthly ~4.4M KRW (~52.8M Annual).
-- Tax: 14M@6%, 36M@15%. ~6.2M tax. ~12% effective.
-- Net Worth: ~300M KRW (Often apartment Jeonse deposit or small equity).
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'KR', 
    'p50', 
    2024, 
    2024, 
    'KRW', 
    0.12, 
    0.24, -- Hits 24% bracket >50M
    '{
        "avg_income": 53000000, 
        "avg_expenses": 40000000, 
        "avg_savings": 13000000,
        "avg_assets": 450000000, -- Real Estate prominent
        "avg_liabilities": 150000000, -- Mortgage/Jeonse Loan
        "net_worth": 300000000,
        "avg_investments": 50000000,
        "avg_liquid_net_worth": 80000000,
        "composition": { "real_estate_ratio": 0.7, "debt_ratio": 0.5, "financial_ratio": 0.3 }
    }'::jsonb
);

-- 3. High Income / Professional (p90)
-- Monthly ~11.2M KRW (~134M Annual).
-- Tax: Progressive up to 35%. Eff ~20%.
-- Net Worth: ~1.2B KRW (Owns apartment in Seoul).
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'KR', 
    'p90', 
    2024, 
    2024, 
    'KRW', 
    0.20, 
    0.35, -- Hits 35% bracket >88M
    '{
        "avg_income": 135000000, 
        "avg_expenses": 80000000, 
        "avg_savings": 55000000,
        "avg_assets": 1800000000, 
        "avg_liabilities": 600000000, 
        "net_worth": 1200000000,
        "avg_investments": 400000000,
        "avg_liquid_net_worth": 300000000,
        "composition": { "real_estate_ratio": 0.6, "debt_ratio": 0.5, "financial_ratio": 0.4 }
    }'::jsonb
);

-- 4. Top 1% (top_1_percent)
-- Annual > 350M KRW+ (Often >500M).
-- Tax: Hits 40%+. Eff ~30-35%.
-- Net Worth: ~5B KRW+.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'KR', 
    'top_1_percent', 
    2024, 
    2024, 
    'KRW', 
    0.35, 
    0.42, -- Hits 40-42% range
    '{
        "avg_income": 450000000, 
        "avg_expenses": 150000000, 
        "avg_savings": 300000000,
        "avg_assets": 6000000000, 
        "avg_liabilities": 1000000000, -- Leverage
        "net_worth": 5000000000,
        "avg_investments": 3000000000,
        "avg_liquid_net_worth": 1000000000,
        "composition": { "real_estate_ratio": 0.5, "debt_ratio": 0.2, "financial_ratio": 0.5 }
    }'::jsonb
);

-- Metric: Economic Benchmarks for Japan (JP)
-- Currency: JPY
-- Year: 2024 Estimates

-- 1. Japan Entry / Part-time (p20)
-- Annual ~2.5M - 3M JPY.
-- Tax: 5% income + 10% resident. ~15%.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'JP', 
    'p20', 
    2024, 
    2024, 
    'JPY', 
    0.15, 
    0.15, 
    '{
        "avg_income": 2800000, 
        "avg_expenses": 2600000, 
        "avg_savings": 200000,
        "avg_assets": 1000000, 
        "avg_liabilities": 500000, 
        "net_worth": 500000,
        "avg_investments": 100000,
        "avg_liquid_net_worth": 300000,
        "composition": { "real_estate_ratio": 0.0, "debt_ratio": 0.5, "financial_ratio": 0.2 }
    }'::jsonb
);

-- 2. Japan Median (p50)
-- Annual ~4.5M - 5M JPY.
-- Tax: 20% income + 10% resident. ~20% effective (deductions).
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'JP', 
    'p50', 
    2024, 
    2024, 
    'JPY', 
    0.20, 
    0.30, -- 10% + 10% + surtax
    '{
        "avg_income": 5000000, 
        "avg_expenses": 4000000, 
        "avg_savings": 1000000,
        "avg_assets": 20000000, -- Small condo or savings
        "avg_liabilities": 12000000, 
        "net_worth": 8000000,
        "avg_investments": 3000000,
        "avg_liquid_net_worth": 5000000, -- High cash savings
        "composition": { "real_estate_ratio": 0.5, "debt_ratio": 0.6, "financial_ratio": 0.4 }
    }'::jsonb
);

-- 3. Japan High Income (p90)
-- Annual ~11M - 12M JPY.
-- Tax: 33% bracket. ~30% effective.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'JP', 
    'p90', 
    2024, 
    2024, 
    'JPY', 
    0.30, 
    0.43, -- 33% + 10%
    '{
        "avg_income": 12000000, 
        "avg_expenses": 7000000, 
        "avg_savings": 5000000,
        "avg_assets": 80000000, -- Tokyo Apartment
        "avg_liabilities": 40000000, 
        "net_worth": 40000000,
        "avg_investments": 15000000,
        "avg_liquid_net_worth": 10000000, 
        "composition": { "real_estate_ratio": 0.6, "debt_ratio": 0.5, "financial_ratio": 0.4 }
    }'::jsonb
);

-- 4. Japan Top 1%
-- Annual ~30M+ JPY.
-- Tax: 40-45% bracket. ~40% effective.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'JP', 
    'top_1_percent', 
    2024, 
    2024, 
    'JPY', 
    0.40, 
    0.55, -- 45% + 10%
    '{
        "avg_income": 35000000, 
        "avg_expenses": 12000000, 
        "avg_savings": 23000000,
        "avg_assets": 300000000, 
        "avg_liabilities": 50000000, 
        "net_worth": 250000000,
        "avg_investments": 100000000,
        "avg_liquid_net_worth": 50000000, 
        "composition": { "real_estate_ratio": 0.5, "debt_ratio": 0.1, "financial_ratio": 0.5 }
    }'::jsonb
);

-- Metric: Economic Benchmarks for China (CN)
-- Currency: CNY
-- Year: 2024 Estimates

-- 1. China Low Income / Student (p20)
-- Annual ~10k - 20k RMB.
-- Tax: Effectively 0% (Below 60k threshold).
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'CN', 
    'p20', 
    2024, 
    2024, 
    'CNY', 
    0.00, 
    0.00, 
    '{
        "avg_income": 18000, 
        "avg_expenses": 16000, 
        "avg_savings": 2000,
        "avg_assets": 5000, 
        "avg_liabilities": 2000, 
        "net_worth": 3000,
        "avg_investments": 0,
        "avg_liquid_net_worth": 3000,
        "composition": { "real_estate_ratio": 0.0, "debt_ratio": 0.1, "financial_ratio": 0.1 }
    }'::jsonb
);

-- 2. China Urban Middle Class (p50)
-- Annual ~100k - 150k RMB (Urban White Collar).
-- Tax: Gross 120k -> Net taxable 60k. 3% on 36k, 10% on 24k. (1080 + 2400 = 3480). eff ~3%.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'CN', 
    'p50', 
    2024, 
    2024, 
    'CNY', 
    0.03, 
    0.10, 
    '{
        "avg_income": 120000, 
        "avg_expenses": 80000, 
        "avg_savings": 40000, -- High savings rate
        "avg_assets": 800000, -- Small Apartment (often with family help)
        "avg_liabilities": 400000, 
        "net_worth": 400000,
        "avg_investments": 100000,
        "avg_liquid_net_worth": 100000, 
        "composition": { "real_estate_ratio": 0.7, "debt_ratio": 0.5, "financial_ratio": 0.2 }
    }'::jsonb
);

-- 3. China Urban High Income (p90)
-- Annual ~400k - 500k RMB (Director/Tech).
-- Tax: ~25% marginal.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'CN', 
    'p90', 
    2024, 
    2024, 
    'CNY', 
    0.15, 
    0.25, 
    '{
        "avg_income": 450000, 
        "avg_expenses": 250000, 
        "avg_savings": 200000,
        "avg_assets": 4000000, -- Tier 1 City Apartment
        "avg_liabilities": 1500000, 
        "net_worth": 2500000,
        "avg_investments": 800000,
        "avg_liquid_net_worth": 500000, 
        "composition": { "real_estate_ratio": 0.65, "debt_ratio": 0.4, "financial_ratio": 0.3 }
    }'::jsonb
);

-- 4. China Top 1% (Rich)
-- Annual ~2M RMB+.
-- Tax: 45%.
INSERT INTO "public"."economic_benchmarks" ("country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'CN', 
    'top_1_percent', 
    2024, 
    2024, 
    'CNY', 
    0.35, 
    0.45, 
    '{
        "avg_income": 2500000, 
        "avg_expenses": 800000, 
        "avg_savings": 1700000,
        "avg_assets": 20000000, 
        "avg_liabilities": 3000000, 
        "net_worth": 17000000,
        "avg_investments": 8000000,
        "avg_liquid_net_worth": 2000000, 
        "composition": { "real_estate_ratio": 0.5, "debt_ratio": 0.15, "financial_ratio": 0.5 }
    }'::jsonb
);

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
-- 10_data_integrity.sql
-- Enforces data sanity checks to prevent negative currency values and realistic interest rates.

-- 1. ASSETS
-- Remediation: Set any negative values to 0 before applying constraint
UPDATE public.assets SET value = 0 WHERE value < 0;

ALTER TABLE public.assets
ADD CONSTRAINT assets_value_check CHECK (value >= 0);

-- 2. LIABILITIES
-- Remediation
UPDATE public.liabilities SET balance = 0 WHERE balance < 0;
UPDATE public.liabilities SET minimum_payment = 0 WHERE minimum_payment < 0;

ALTER TABLE public.liabilities
ADD CONSTRAINT liabilities_balance_check CHECK (balance >= 0),
ADD CONSTRAINT liabilities_min_payment_check CHECK (minimum_payment >= 0),
ADD CONSTRAINT liabilities_interest_rate_check CHECK (interest_rate BETWEEN -10 AND 100); -- Checks for realistic rates

-- 3. GOALS
-- Remediation
UPDATE public.goals SET target_amount = 0 WHERE target_amount < 0;
UPDATE public.goals SET current_amount = 0 WHERE current_amount < 0;

ALTER TABLE public.goals
ADD CONSTRAINT goals_target_check CHECK (target_amount >= 0),
ADD CONSTRAINT goals_current_check CHECK (current_amount >= 0);

-- 4. RECURRING TRANSACTIONS
-- Remediation
UPDATE public.recurring_transactions SET amount = 0 WHERE amount < 0;

ALTER TABLE public.recurring_transactions
ADD CONSTRAINT recurring_amount_check CHECK (amount >= 0);
-- 11_bank_integration_schema.sql

-- 1. Create 'linked_items' table
-- Stores the high-level connection to a bank (e.g. "Chase Login via Plaid")
CREATE TABLE IF NOT EXISTS public.linked_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('plaid', 'basiq', 'brankas')),
    item_id TEXT NOT NULL, -- Provider's ID for this connection
    access_token TEXT NOT NULL, -- CAUTION: Application must encrypt this before insertion if not using Vault
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'error_relogin_required'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider, item_id)
);

-- 2. Create 'bank_accounts' table
-- Individual accounts within a connection (e.g. "Checking", "Savings")
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    linked_item_id UUID REFERENCES public.linked_items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Denormalized for easier RLS
    name TEXT NOT NULL,
    mask TEXT, -- e.g. "4921"
    type TEXT NOT NULL, -- 'checking', 'savings', 'credit', 'loan', 'investment'
    current_balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create 'bank_transactions' table
-- Raw transactions synced from the provider
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Denormalized for easier RLS
    external_id TEXT NOT NULL, -- Provider's transaction ID
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    merchant_name TEXT,
    category TEXT, -- Raw category from provider
    normalized_category TEXT, -- Our internal category map
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT DEFAULT 'posted', -- 'pending', 'posted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(account_id, external_id)
);

-- 4. Enable RLS
ALTER TABLE public.linked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- LINKED ITEMS
CREATE POLICY "Users can manage own linked items" ON public.linked_items
    FOR ALL USING (auth.uid() = user_id);

-- BANK ACCOUNTS
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- BANK TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.bank_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- NOTE: The Sync Engine (Edge Function) will use the SERVICE_ROLE key, bypassing RLS.
-- This ensures the backend can always write, but users can only read/delete their own data.
-- 12_bank_constraints.sql
-- Adds UNIQUE constraints to allow UPSERT operations during Bank Sync.

-- 1. Bank Accounts: Prevent duplicate accounts
-- We assume (linked_item_id, name, mask) is unique enough for MVP.
-- If Plaid sends a stable 'account_id', we should store that instead, but our schema uses internal UUIDs.
-- Ideally in Phase 2 we would have added 'external_id' to bank_accounts.
-- Let's stick to Name+Mask for now as per `syncEngine.ts` logic.

ALTER TABLE public.bank_accounts
ADD CONSTRAINT bank_accounts_item_id_name_mask_key UNIQUE (linked_item_id, name, mask);
-- Gamification: Persistent Badges & Triggers

-- 1. Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB, -- Context, e.g. "Earned from Asset: MSFT"
  PRIMARY KEY (user_id, badge_id)
);

-- 2. RLS Policies
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Generic Function to Award Badges
CREATE OR REPLACE FUNCTION public.award_badge(target_user_id UUID, badge_slug TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (target_user_id, badge_slug)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger Function: Check Assets (First Steps)
CREATE OR REPLACE FUNCTION public.check_asset_badges()
RETURNS TRIGGER AS $$
DECLARE
  asset_count INTEGER;
BEGIN
  -- Count assets for the user
  SELECT count(*) INTO asset_count FROM public.assets WHERE user_id = NEW.user_id;
  
  -- Logic: First Asset ('first-steps')
  IF asset_count >= 1 THEN
    PERFORM public.award_badge(NEW.user_id, 'first-steps');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function: Check Net Worth ('wealth-tracker', 'millionaire')
CREATE OR REPLACE FUNCTION public.check_net_worth_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic: Positive Net Worth ('wealth-tracker')
  IF NEW.net_worth > 0 THEN
    PERFORM public.award_badge(NEW.user_id, 'wealth-tracker');
  END IF;

  -- Logic: Millionaire ('millionaire')
  -- Assuming stored in USD or base currency. Rough check > 1,000,000
  IF NEW.net_worth >= 1000000 THEN
    PERFORM public.award_badge(NEW.user_id, 'millionaire');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Trigger Function: Check Liabilities ('debt-slayer')
-- Triggered on UPDATE/DELETE? Or just check on every change?
-- 'debt-slayer': Pay off a liability completely. (balance = 0)
CREATE OR REPLACE FUNCTION public.check_liability_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- If a liability is updated to have 0 balance
  IF (TG_OP = 'UPDATE' AND NEW.balance = 0 AND OLD.balance > 0) OR (TG_OP = 'INSERT' AND NEW.balance = 0) THEN
     PERFORM public.award_badge(NEW.user_id, 'debt-slayer');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Attach Triggers

-- Assets Trigger
DROP TRIGGER IF EXISTS on_asset_change ON public.assets;
CREATE TRIGGER on_asset_change
  AFTER INSERT ON public.assets
  FOR EACH ROW EXECUTE PROCEDURE public.check_asset_badges();

-- Net Worth Trigger
DROP TRIGGER IF EXISTS on_net_worth_change ON public.net_worth_history;
CREATE TRIGGER on_net_worth_change
  AFTER INSERT OR UPDATE ON public.net_worth_history
  FOR EACH ROW EXECUTE PROCEDURE public.check_net_worth_badges();

-- Liabilities Trigger
DROP TRIGGER IF EXISTS on_liability_change ON public.liabilities;
CREATE TRIGGER on_liability_change
  AFTER INSERT OR UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE PROCEDURE public.check_liability_badges();


-- 8. Backfill / Seed (Run once for existing users)
-- This is a bit tricky in pure SQL migrations without guaranteed order, but we can try simple updates.
-- Re-evaluate assets for everyone
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Backfill 'first-steps'
  FOR r IN SELECT DISTINCT user_id FROM public.assets LOOP
    PERFORM public.award_badge(r.user_id, 'first-steps');
  END LOOP;
  
  -- Backfill 'wealth-tracker' and 'millionaire' from latest history
  -- (Simplification: just checking their *latest* snapshot)
  -- Realistically relying on the next update is safer, but this helps immediate viz.
END $$;

-- 1. Trigger Function: Check Goals ('goal-setter')
CREATE OR REPLACE FUNCTION public.check_goal_badges()
RETURNS TRIGGER AS $$
DECLARE
  goal_count INTEGER;
BEGIN
  SELECT count(*) INTO goal_count FROM public.goals WHERE user_id = NEW.user_id;
  
  IF goal_count >= 1 THEN
    PERFORM public.award_badge(NEW.user_id, 'goal-setter');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach Trigger
DROP TRIGGER IF EXISTS on_goal_change ON public.goals;
CREATE TRIGGER on_goal_change
  AFTER INSERT ON public.goals
  FOR EACH ROW EXECUTE PROCEDURE public.check_goal_badges();

-- 3. Backfill for existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.goals LOOP
    PERFORM public.award_badge(r.user_id, 'goal-setter');
  END LOOP;
END $$;

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
