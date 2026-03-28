-- ==========================================
-- XENON TEAM: WORK SESSIONS & LEADERBOARD
-- Execute this entirely in Supabase SQL Editor
-- ==========================================

-- WORK SESSIONS
CREATE TABLE public.work_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sécurité RLS
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users full access" ON public.work_sessions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Temps Réel (Realtime sync)
ALTER TABLE public.work_sessions REPLICA IDENTITY FULL;

BEGIN;
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_sessions;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table already in supabase_realtime publication';
  END;
  $$;
COMMIT;
