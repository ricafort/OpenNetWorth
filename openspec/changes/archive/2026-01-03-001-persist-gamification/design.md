# Design: Gamification Persistence Layers

### Schema Changes
```sql
CREATE TABLE user_badges (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL, -- e.g. 'first-steps', 'debt-slayer'
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB, -- Optional: store context like "Earned on MSFT asset"
  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
```

### Trigger Logic (Database Functions)
A consolidated PL/pgSQL function `check_gamification_triggers()` will be attached to relevant tables (`assets`, `net_worth_history`).

**Example Logic**:
```sql
-- Trigger on ASSETS insert
IF (SELECT count(*) FROM assets WHERE user_id = NEW.user_id) >= 1 THEN
  INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, 'first-steps')
  ON CONFLICT DO NOTHING;
END IF;
```

### UI Refactor
-   Refactor `AchievementBadges.tsx` to **fetch** `user_badges` initially (server component or client effect).
-   Remove the `isUnlocked()` derived logic function and replace with `badges.has('id')`.
