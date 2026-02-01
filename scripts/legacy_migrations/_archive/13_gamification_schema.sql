-- Gamification: Persistent Badges & Triggers

-- 1. Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB, -- Context, e.g. "Earned from Asset: MSFT"
  PRIMARY KEY (user_id, badge_id)
);

-- 2. RLS Policies
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Generic Function to Award Badges
CREATE OR REPLACE FUNCTION public.award_badge(target_user_id UUID, badge_slug TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (target_user_id, badge_slug)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger Function: Check Assets (First Steps)
CREATE OR REPLACE FUNCTION public.check_asset_badges()
RETURNS TRIGGER AS $$
DECLARE
  asset_count INTEGER;
BEGIN
  -- Count assets for the user
  SELECT count(*) INTO asset_count FROM public.assets WHERE user_id = NEW.user_id;
  
  -- Logic: First Asset ('first-steps')
  IF asset_count >= 1 THEN
    PERFORM public.award_badge(NEW.user_id, 'first-steps');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function: Check Net Worth ('wealth-tracker', 'millionaire')
CREATE OR REPLACE FUNCTION public.check_net_worth_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic: Positive Net Worth ('wealth-tracker')
  IF NEW.net_worth > 0 THEN
    PERFORM public.award_badge(NEW.user_id, 'wealth-tracker');
  END IF;

  -- Logic: Millionaire ('millionaire')
  -- Assuming stored in USD or base currency. Rough check > 1,000,000
  IF NEW.net_worth >= 1000000 THEN
    PERFORM public.award_badge(NEW.user_id, 'millionaire');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Trigger Function: Check Liabilities ('debt-slayer')
-- Triggered on UPDATE/DELETE? Or just check on every change?
-- 'debt-slayer': Pay off a liability completely. (balance = 0)
CREATE OR REPLACE FUNCTION public.check_liability_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- If a liability is updated to have 0 balance
  IF (TG_OP = 'UPDATE' AND NEW.balance = 0 AND OLD.balance > 0) OR (TG_OP = 'INSERT' AND NEW.balance = 0) THEN
     PERFORM public.award_badge(NEW.user_id, 'debt-slayer');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Attach Triggers

-- Assets Trigger
DROP TRIGGER IF EXISTS on_asset_change ON public.assets;
CREATE TRIGGER on_asset_change
  AFTER INSERT ON public.assets
  FOR EACH ROW EXECUTE PROCEDURE public.check_asset_badges();

-- Net Worth Trigger
DROP TRIGGER IF EXISTS on_net_worth_change ON public.net_worth_history;
CREATE TRIGGER on_net_worth_change
  AFTER INSERT OR UPDATE ON public.net_worth_history
  FOR EACH ROW EXECUTE PROCEDURE public.check_net_worth_badges();

-- Liabilities Trigger
DROP TRIGGER IF EXISTS on_liability_change ON public.liabilities;
CREATE TRIGGER on_liability_change
  AFTER INSERT OR UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE PROCEDURE public.check_liability_badges();


-- 8. Backfill / Seed (Run once for existing users)
-- This is a bit tricky in pure SQL migrations without guaranteed order, but we can try simple updates.
-- Re-evaluate assets for everyone
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Backfill 'first-steps'
  FOR r IN SELECT DISTINCT user_id FROM public.assets LOOP
    PERFORM public.award_badge(r.user_id, 'first-steps');
  END LOOP;
  
  -- Backfill 'wealth-tracker' and 'millionaire' from latest history
  -- (Simplification: just checking their *latest* snapshot)
  -- Realistically relying on the next update is safer, but this helps immediate viz.
END $$;
