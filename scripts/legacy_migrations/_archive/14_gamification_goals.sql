
-- 1. Trigger Function: Check Goals ('goal-setter')
CREATE OR REPLACE FUNCTION public.check_goal_badges()
RETURNS TRIGGER AS $$
DECLARE
  goal_count INTEGER;
BEGIN
  SELECT count(*) INTO goal_count FROM public.goals WHERE user_id = NEW.user_id;
  
  IF goal_count >= 1 THEN
    PERFORM public.award_badge(NEW.user_id, 'goal-setter');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach Trigger
DROP TRIGGER IF EXISTS on_goal_change ON public.goals;
CREATE TRIGGER on_goal_change
  AFTER INSERT ON public.goals
  FOR EACH ROW EXECUTE PROCEDURE public.check_goal_badges();

-- 3. Backfill for existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.goals LOOP
    PERFORM public.award_badge(r.user_id, 'goal-setter');
  END LOOP;
END $$;
