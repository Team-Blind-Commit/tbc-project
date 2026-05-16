-- Voice Coach: extend sessions, action_points, add user_coach_memory
-- Apply in Supabase SQL editor or via CLI after team review.

-- sessions extensions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS strengths text[],
  ADD COLUMN IF NOT EXISTS weaknesses text[],
  ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id text;

-- action_points extensions
ALTER TABLE action_points
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS task text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- user_coach_memory (one row per user_name until auth)
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
