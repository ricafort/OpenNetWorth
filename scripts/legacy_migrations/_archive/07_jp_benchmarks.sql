
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
