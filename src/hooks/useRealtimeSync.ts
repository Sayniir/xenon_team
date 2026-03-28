import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) return

    // Create a single Realtime channel for global application sync
    const channel = supabase
      .channel('global-app-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })
          queryClient.invalidateQueries({ queryKey: ['project-tasks'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['posts'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-posts'] })
          queryClient.invalidateQueries({ queryKey: ['project-posts'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['projects'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ideas' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['ideas'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'idea_votes' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['ideas'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['task-comments'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['post-comments'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] })
          queryClient.invalidateQueries({ queryKey: ['all-activities'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_sessions' },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['work-sessions'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-leaderboard'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])
}
