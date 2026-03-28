import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Activity as ActivityIcon, CheckSquare, FileText, FolderKanban, Lightbulb, Paperclip, MessageCircle } from 'lucide-react'
import { timeAgo, getInitials, ACTION_LABELS } from '../lib/helpers'
import type { Activity as ActivityType } from '../types/models'

const ACTION_ICONS: Record<string, any> = {
  created_task: CheckSquare,
  completed_task: CheckSquare,
  updated_task: CheckSquare,
  created_post: FileText,
  created_project: FolderKanban,
  updated_project: FolderKanban,
  created_idea: Lightbulb,
  uploaded_file: Paperclip,
  commented: MessageCircle
}

export default function ActivityPage() {
  const { data: activities = [] } = useQuery({
    queryKey: ['all-activities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100)
      return (data || []) as ActivityType[]
    }
  })

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ActivityIcon size={28} style={{ color: 'var(--warning)', verticalAlign: 'middle', marginRight: 8 }} />
            Activité
          </h1>
          <p className="page-subtitle">Historique de toutes les actions de l'équipe</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="empty-state">
          <ActivityIcon size={48} />
          <h3>Aucune activité</h3>
          <p className="text-sm text-secondary">L'historique apparaîtra ici</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {activities.map((act) => {
            const IconComp = ACTION_ICONS[act.action] || ActivityIcon
            return (
              <div key={act.id} className="activity-item">
                <div className="activity-item-icon">
                  <IconComp size={16} style={{ color: 'var(--primary-400)' }} />
                </div>
                <div className="activity-item-content">
                  <div className="activity-item-text">
                    <strong>{act.profiles?.full_name}</strong>{' '}
                    {ACTION_LABELS[act.action] || act.action}
                    {act.metadata && (act.metadata as any).title && (
                      <> — <em style={{ color: 'var(--text-secondary)' }}>{(act.metadata as any).title || (act.metadata as any).name}</em></>
                    )}
                  </div>
                  <div className="activity-item-time">{timeAgo(act.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
