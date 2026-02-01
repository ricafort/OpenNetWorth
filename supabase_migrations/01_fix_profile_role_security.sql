-- =============================================================================
-- Security Fix: Prevent Privilege Escalation via Role Updates
-- =============================================================================
-- Description:
-- Inherently blocks any update to the 'role' column on the 'profiles' table
-- unless the executing user is a superuser or service_role.
-- This prevents IDOR where a user sends { role: 'admin' } to the update endpoint.

CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if 'role' is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if current user is service_role (e.g. Admin API) or postgres/superuser
    IF auth.role() NOT IN ('service_role', 'postgres') THEN
      RAISE EXCEPTION 'Privilege Violation: You cannot update your own role.';
    END IF;
  END IF;
  
  -- Return the NEW record effectively allowing other changes (like full_name)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow idempotent runs
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;

-- Attach Trigger to Updates
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_profile_updates();
