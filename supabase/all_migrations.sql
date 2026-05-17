-- =============================================================================
-- Podium AI — combined Supabase schema (run once in Supabase SQL Editor)
-- =============================================================================
-- Order: base tables → voice coach extensions → unified auth/RLS → grants →
--        session_messages (chat history)
--
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS where possible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Base tables (legacy speech-eval schema; skip if you already have these)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text,
  topic text,
  duration_seconds integer,
  transcript text,
  counter_feedback text,
  grammarian_feedback text,
  evaluator_feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text,
  points text[],
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 1. 20260516000000_voice_coach_memory.sql
-- -----------------------------------------------------------------------------

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS strengths text[],
  ADD COLUMN IF NOT EXISTS weaknesses text[],
  ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id text;

ALTER TABLE action_points
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS task text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS user_coach_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL UNIQUE,
  memory_blob text,
  current_goal text,
  difficulty text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_points_user_completed
  ON action_points (user_name, completed);

CREATE INDEX IF NOT EXISTS idx_sessions_user_feature
  ON sessions (user_name, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_elevenlabs_conversation_id
  ON sessions (elevenlabs_conversation_id);

-- -----------------------------------------------------------------------------
-- 2. 20260517000000_unified_schema.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 3. 20260517100000_public_schema_grants.sql
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. 20260517100000_session_messages.sql
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'agent')),
  content text NOT NULL,
  sequence_index integer NOT NULL CHECK (sequence_index >= 0),
  spoke_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_messages_session_sequence_unique
    UNIQUE (session_id, sequence_index)
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_order
  ON session_messages (session_id, sequence_index);

CREATE INDEX IF NOT EXISTS idx_session_messages_user_spoke_at
  ON session_messages (user_id, spoke_at DESC);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_messages_select_own" ON session_messages;
CREATE POLICY "session_messages_select_own"
  ON session_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_messages_insert_own" ON session_messages;
CREATE POLICY "session_messages_insert_own"
  ON session_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_coach_memory_user_id_key
  ON user_coach_memory (user_id)
  WHERE user_id IS NOT NULL;

-- Grant on session_messages (created after ALL TABLES grant above)
GRANT SELECT, INSERT, UPDATE, DELETE ON session_messages TO authenticated;
GRANT SELECT ON session_messages TO anon;

-- Refresh PostgREST schema cache (fixes "relationship ... session_messages" errors)
NOTIFY pgrst, 'reload schema';
