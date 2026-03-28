-- Rend le bucket des avatars publiquement lisible
-- A EXECUTER DANS LE SQL EDITOR SUPABASE
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';
