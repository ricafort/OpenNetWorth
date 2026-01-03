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
