
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
