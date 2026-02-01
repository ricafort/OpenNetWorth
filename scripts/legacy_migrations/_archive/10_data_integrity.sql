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
