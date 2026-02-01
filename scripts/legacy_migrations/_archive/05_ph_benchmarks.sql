
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
