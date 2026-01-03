
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
