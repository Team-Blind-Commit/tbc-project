-- Unified auth schema for dashboard, voice coach, and speech evaluator.
-- Safe to run after 20260516000000_voice_coach_memory.sql.

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluator_score integer,
  ADD COLUMN IF NOT EXISTS filler_word_count integer;

ALTER TABLE action_points
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_coach_memory
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE sessions ALTER COLUMN user_name DROP NOT NULL;
ALTER TABLE action_points ALTER COLUMN user_name DROP NOT NULL;
ALTER TABLE user_coach_memory ALTER COLUMN user_name DROP NOT NULL;

UPDATE sessions SET user_id = NULL WHERE user_id IS NULL;
UPDATE action_points SET user_id = NULL WHERE user_id IS NULL;
UPDATE user_coach_memory SET user_id = NULL WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_created_desc
  ON sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_feature_created_desc
  ON sessions (user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_points_user_completed
  ON action_points (user_id, completed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_coach_memory_user
  ON user_coach_memory (user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coach_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "sessions_select_own" ON sessions;
CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
CREATE POLICY "sessions_update_own"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_points_select_own" ON action_points;
CREATE POLICY "action_points_select_own"
  ON action_points FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_points_insert_own" ON action_points;
CREATE POLICY "action_points_insert_own"
  ON action_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_points_update_own" ON action_points;
CREATE POLICY "action_points_update_own"
  ON action_points FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_coach_memory_select_own" ON user_coach_memory;
CREATE POLICY "user_coach_memory_select_own"
  ON user_coach_memory FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_coach_memory_insert_own" ON user_coach_memory;
CREATE POLICY "user_coach_memory_insert_own"
  ON user_coach_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_coach_memory_update_own" ON user_coach_memory;
CREATE POLICY "user_coach_memory_update_own"
  ON user_coach_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
