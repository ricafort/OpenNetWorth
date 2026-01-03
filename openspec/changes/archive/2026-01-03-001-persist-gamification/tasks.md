# Tasks: Gamification Persistence

- [x] Create migration file `supabase_migrations/13_gamification_schema.sql` defining `user_badges` table.
- [x] Add RLS policies to `user_badges` (Select Own).
- [x] Create generic `check_and_award_badge` PostgreSQL function.
- [x] Create `trigger_check_assets` on `public.assets` table (After Insert/Delete).
- [x] Create `trigger_check_net_worth` on `public.net_worth_history` table (After Insert/Update).
- [x] Seed `user_badges` with existing eligible badges (Migration script data backfill).
- [x] Update `AchievementBadges.tsx` to query `supabase.from('user_badges')`.
