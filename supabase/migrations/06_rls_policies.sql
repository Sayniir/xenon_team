-- ==========================================
-- XENON TEAM: SECURE ROW LEVEL SECURITY (RLS) POLICIES
-- Execute in Supabase SQL Editor
-- This ensures that your private team data cannot be accessed by public APIs.
-- ==========================================

-- 1. Enable RLS on all primary tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create foundational policies for a Private Workspace (Associates Only)
-- This simply prevents unauthenticated access or unauthorized reads from the outside.

-- Profiles
CREATE POLICY "Team can view profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "Team can view projects" ON public.projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage projects" ON public.projects FOR ALL USING (auth.role() = 'authenticated');

-- Tasks
CREATE POLICY "Team can view tasks" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage tasks" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');

-- Activity
CREATE POLICY "Team can view activity" ON public.activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can create activity" ON public.activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Posts & Comments
CREATE POLICY "Team can view posts" ON public.posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage posts" ON public.posts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Team can view post comments" ON public.post_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage post comments" ON public.post_comments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Team can view task comments" ON public.task_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage task comments" ON public.task_comments FOR ALL USING (auth.role() = 'authenticated');

-- Ideas & Votes
CREATE POLICY "Team can view ideas" ON public.ideas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage ideas" ON public.ideas FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Team can view votes" ON public.idea_votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can manage votes" ON public.idea_votes FOR ALL USING (auth.role() = 'authenticated');

-- Chat
CREATE POLICY "Team can view chat" ON public.chat_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Team can create chat" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "User can delete own message" ON public.chat_messages FOR DELETE USING (auth.uid() = author_id);

-- Files
CREATE POLICY "Team can view files" ON public.files FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "User can upload files" ON public.files FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "User can delete own files" ON public.files FOR DELETE USING (auth.uid() = uploaded_by);

-- Notifications
CREATE POLICY "User can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage notifications" ON public.notifications FOR ALL USING (auth.role() = 'authenticated');

-- Work Sessions
CREATE POLICY "Team can view work sessions" ON public.work_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "User can manage own work sessions" ON public.work_sessions FOR ALL USING (auth.uid() = user_id);

-- 3. Storage Policies (Documents & Avatars)
-- Needs to be run if you haven't secured storage buckets yet.
-- (Assumes 'documents' and 'avatars' buckets exist)

-- Documents bucket (Private to authenticated)
-- CREATE POLICY "Team can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
-- CREATE POLICY "Team can insert documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
-- CREATE POLICY "User can delete own document" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid() = owner);

-- Avatars bucket (Publicly readable for UI, but only owner can update)
-- CREATE POLICY "Avatars are public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
-- CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);
-- CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = owner);
