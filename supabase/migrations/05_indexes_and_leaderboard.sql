-- ==========================================
-- XENON TEAM: PERFORMANCE INDEXES & DATABASE OPTIMIZATION
-- Execute in Supabase SQL Editor
-- ==========================================

-- Core Indexes for frequently queried fields

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type ON public.activities(entity_type);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Work Sessions
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON public.work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_created_at ON public.work_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_project_id ON public.work_sessions(project_id);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Ideas
CREATE INDEX IF NOT EXISTS idx_ideas_category ON public.ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON public.ideas(status);

-- Idea Votes
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON public.idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user_id ON public.idea_votes(user_id);

-- Files
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);


-- ==========================================
-- LEADERBOARD RPC FUNCTION
-- Moves leaderboard aggregation to the server
-- ==========================================

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_minutes BIGINT
) AS $$
  SELECT 
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(ws.duration_minutes), 0) as total_minutes
  FROM profiles p
  LEFT JOIN work_sessions ws ON ws.user_id = p.id
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY total_minutes DESC;
$$ LANGUAGE sql SECURITY DEFINER;
