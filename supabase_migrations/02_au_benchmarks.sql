-- Metric: Economic Benchmarks for Australia (AU)
-- Currency: AUD
-- Year: 2024 Estimates (FY 2024-25)
-- Source: Synthesized from ATO Taxation Statistics & ABS Household Wealth

-- 1. AU Low Income / Student (p20)
-- Annual ~30k - 35k AUD.
INSERT INTO "public"."economic_benchmarks" ("person_country_code", "percentile_bracket", "year", "tax_year", "currency", "effective_tax_rate", "marginal_tax_rate", "metrics")
VALUES
(
    'AU', 
    'p20', 
    2024, 
    2025, 
    'AUD', 
    0.06, 
    0.16, 
    '{
        "avg_income": 32000, 
        "avg_expenses": 30000, 
        "avg_savings": 2000,
        "avg_assets": 15000, 
        "avg_liabilities": 5000, 
        "net_worth": 10000,
        "avg_investments": 5000, 
        "avg_liquid_net_worth": 2000,
        "composition": { "real_estate": 0.0, "debt_ratio": 0.5, "financial_ratio": 0.3 }
    }'::jsonb
),

-- 2. AU Middle Class (p50 - Median)
-- Annual ~92k AUD. Net Worth ~550k AUD (High due to Super + Property).
(
    'AU', 
    'p50', 
    2024, 
    2025, 
    'AUD', 
    0.24, 
    0.30, 
    '{
        "avg_income": 92000, 
        "avg_expenses": 70000, 
        "avg_savings": 10000,
        "avg_assets": 950000, 
        "avg_liabilities": 400000, 
        "net_worth": 550000,
        "avg_investments": 160000, 
        "avg_liquid_net_worth": 40000, 
        "composition": { "real_estate": 0.75, "debt_ratio": 0.42, "financial_ratio": 0.20 }
    }'::jsonb
),

-- 3. AU High Income (p90 - Top 10%)
-- Annual ~190k AUD. Net Worth ~1.8M AUD.
(
    'AU', 
    'p90', 
    2024, 
    2025, 
    'AUD', 
    0.30, 
    0.37, 
    '{
        "avg_income": 190000, 
        "avg_expenses": 100000, 
        "avg_savings": 40000,
        "avg_assets": 2500000, 
        "avg_liabilities": 700000, 
        "net_worth": 1800000,
        "avg_investments": 600000,
        "avg_liquid_net_worth": 150000, 
        "composition": { "real_estate": 0.70, "debt_ratio": 0.28, "financial_ratio": 0.25 }
    }'::jsonb
),

-- 4. AU Top 1% (Rich)
-- Annual ~550k+ AUD. Net Worth ~6M AUD.
(
    'AU', 
    'top_1_percent', 
    2024, 
    2025, 
    'AUD', 
    0.38, 
    0.47, 
    '{
        "avg_income": 550000, 
        "avg_expenses": 200000, 
        "avg_savings": 200000,
        "avg_assets": 8000000, 
        "avg_liabilities": 2000000, 
        "net_worth": 6000000,
        "avg_investments": 4000000, 
        "avg_liquid_net_worth": 1000000, 
        "composition": { "real_estate": 0.45, "debt_ratio": 0.20, "financial_ratio": 0.50 }
    }'::jsonb
)

ON CONFLICT (person_country_code, percentile_bracket, year) 
DO UPDATE SET 
    metrics = EXCLUDED.metrics,
    effective_tax_rate = EXCLUDED.effective_tax_rate,
    marginal_tax_rate = EXCLUDED.marginal_tax_rate;
