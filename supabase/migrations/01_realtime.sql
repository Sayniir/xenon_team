-- ==========================================
-- XENON TEAM: SUPABASE REALTIME V1
-- Execute this entirely in Supabase SQL Editor AFTER 00_initial_schema.sql
-- ==========================================

-- Activer le mode Replica Identity FULL (Optionnel ou requis selon le niveau d'events souhaités)
-- Cela permet de récupérer les "old_record" lors des UPDATE et DELETE
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.ideas REPLICA IDENTITY FULL;
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Ajouter les tables principales au canal de publication 'supabase_realtime'
-- Cela dit à PostgreSQL d'envoyer les modifications de ces tables vers les WebSockets WebSocket en direct
BEGIN;
  DO $$
  BEGIN
    -- Cette commande peut différer légèrement selon l'ancienneté du projet, le standard est:
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ideas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
  EXCEPTION WHEN duplicate_object THEN
    -- Ignore error if table is already in the publication
    RAISE NOTICE 'Some tables might already be in supabase_realtime publication';
  END;
  $$;
COMMIT;
