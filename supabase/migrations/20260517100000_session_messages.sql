-- Voice Coach: structured chat history (one row per turn)
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

-- Coach memory upsert uses user_id; legacy migration only had UNIQUE (user_name)
CREATE UNIQUE INDEX IF NOT EXISTS user_coach_memory_user_id_key
  ON user_coach_memory (user_id)
  WHERE user_id IS NOT NULL;
