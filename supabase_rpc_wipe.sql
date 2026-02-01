
-- =============================================================================
-- Wipe User Data RPC
-- Run this in your Supabase SQL Editor to enable the "Erase All Data" button to work fully.
-- =============================================================================

CREATE OR REPLACE FUNCTION wipe_user_data()
RETURNS VOID AS $$
BEGIN
  -- Delete all user data strictly scoped to the calling user
  -- The auth.uid() ensures safety (can only delete your own data)
  
  -- Core Financials
  DELETE FROM public.assets WHERE user_id = auth.uid();
  DELETE FROM public.liabilities WHERE user_id = auth.uid();
  DELETE FROM public.goals WHERE user_id = auth.uid();
  DELETE FROM public.recurring_transactions WHERE user_id = auth.uid();
  
  -- History & Analytics
  DELETE FROM public.cash_flow_history WHERE user_id = auth.uid();
  DELETE FROM public.net_worth_history WHERE user_id = auth.uid();
  
  -- Gamification
  DELETE FROM public.user_badges WHERE user_id = auth.uid();
  
  -- Mentorship
  DELETE FROM public.mentor_interactions WHERE user_id = auth.uid();
  DELETE FROM public.custom_mentors WHERE user_id = auth.uid();
  
  -- Banking (Cascades should handle accounts/transactions, but explicit is safer)
  DELETE FROM public.linked_items WHERE user_id = auth.uid();
  DELETE FROM public.bank_accounts WHERE user_id = auth.uid();
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION wipe_user_data TO authenticated;
