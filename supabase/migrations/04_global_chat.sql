-- ==========================================
-- XENON TEAM: GLOBAL CHAT MODULE
-- ==========================================

-- CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users full access" ON public.chat_messages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
