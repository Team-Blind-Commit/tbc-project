-- Speech eval feedback columns (legacy DBs may only have user_id + scores).
-- Grants for session_messages and coach memory upsert — safe to re-run.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS counter_feedback text,
  ADD COLUMN IF NOT EXISTS grammarian_feedback text,
  ADD COLUMN IF NOT EXISTS evaluator_feedback text,
  ADD COLUMN IF NOT EXISTS evaluator_score integer,
  ADD COLUMN IF NOT EXISTS filler_word_count integer;

CREATE UNIQUE INDEX IF NOT EXISTS user_coach_memory_user_id_key
  ON user_coach_memory (user_id)
  WHERE user_id IS NOT NULL;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON session_messages TO authenticated;
GRANT SELECT ON session_messages TO anon;

NOTIFY pgrst, 'reload schema';
