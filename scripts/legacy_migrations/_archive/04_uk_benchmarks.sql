
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
