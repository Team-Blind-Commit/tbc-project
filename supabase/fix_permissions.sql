-- Run this ONCE in Supabase Dashboard → SQL Editor if you see:
--   "permission denied for schema public"
--   "Session finished, but saving to history failed"
--
-- Safe to re-run.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Tables created after the grants above (e.g. session_messages)
GRANT SELECT, INSERT, UPDATE, DELETE ON session_messages TO authenticated;
GRANT SELECT ON session_messages TO anon;

-- Refresh PostgREST schema cache (fixes session_messages relationship errors)
NOTIFY pgrst, 'reload schema';
