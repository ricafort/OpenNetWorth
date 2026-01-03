# Proposal: Gamification Triggers (Persistence)

**Goal**: Move Badge logic from "Client-Side Derived" to "Server-Side Persisted" to ensure achievements are permanent and can be triggered by backend events.

**Context**:
Currently, `AchievementBadges.tsx` calculates badges on the fly (e.g., "Do I have assets > 0 right now?"). This is fragile; if a user deletes an asset, they lose the "First Steps" badge. Real achievements should be unlocked once and stored forever.

**Solution**:
1.  **Schema**: Add a `user_badges` table to Supabase.
2.  **Logic**: Create a server-side `BadgeService` (or database triggers) that listens for key events (Asset Created, Goal Reached) and inserts into `user_badges`.
3.  **UI**: Update `AchievementBadges.tsx` to read from this persisted table instead of calculating on the fly.
