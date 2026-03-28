import { formatDistanceToNow, format, isToday, isYesterday, isTomorrow, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

export function formatDate(date: string): string {
  const d = new Date(date)
  if (isToday(d)) return "Aujourd'hui"
  if (isYesterday(d)) return 'Hier'
  if (isTomorrow(d)) return 'Demain'
  return format(d, 'dd MMM yyyy', { locale: fr })
}

export function formatDeadline(date: string): { text: string; urgent: boolean } {
  const d = new Date(date)
  const days = differenceInDays(d, new Date())
  if (days < 0) return { text: `En retard de ${Math.abs(days)}j`, urgent: true }
  if (days === 0) return { text: "Aujourd'hui", urgent: true }
  if (days === 1) return { text: 'Demain', urgent: true }
  if (days <= 3) return { text: `Dans ${days} jours`, urgent: true }
  return { text: formatDate(date), urgent: false }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' Go'
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute'
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé'
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  paused: 'En pause',
  completed: 'Terminé',
  archived: 'Archivé'
}

export const IDEA_CATEGORY_LABELS: Record<string, string> = {
  business: 'Business',
  content: 'Contenu',
  offers: 'Offres',
  features: 'Fonctionnalités',
  internal: 'Interne'
}

export const IDEA_STATUS_LABELS: Record<string, string> = {
  new: 'Nouvelle',
  discussing: 'En discussion',
  accepted: 'Acceptée',
  rejected: 'Rejetée'
}

export const POST_TYPE_LABELS: Record<string, string> = {
  update: 'Mise à jour',
  standup: 'Standup',
  note: 'Note',
  announcement: 'Annonce'
}

export const ACTION_LABELS: Record<string, string> = {
  created_task: 'a créé la tâche',
  completed_task: 'a terminé la tâche',
  updated_task: 'a mis à jour la tâche',
  created_post: 'a publié',
  created_project: 'a créé le projet',
  updated_project: 'a mis à jour le projet',
  created_idea: 'a proposé une idée',
  uploaded_file: 'a uploadé un fichier',
  commented: 'a commenté',
  logged_work: 'a enregistré du travail sur'
}
