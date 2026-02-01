
-- Migration: Add interest_rate to assets table
-- Date: 2025-12-31

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN public.assets.interest_rate IS 'Annual interest rate or return rate percentage (e.g., 5.0 for 5%)';
