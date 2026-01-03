
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
