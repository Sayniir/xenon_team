import { supabase } from '../lib/supabase'
import type { Task, Comment, UserProfile } from '../types/models'

export async function fetchAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      '*, assignee:assigned_to(id, full_name, avatar_url), profiles:created_by(full_name), projects(id, name)'
    )
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Task[]
}

export async function fetchDashboardTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles:assigned_to(full_name, avatar_url), projects(name)')
    .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    .neq('status', 'done')
    .order('priority', { ascending: false })
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(5)
  if (error) throw error
  return (data || []) as Task[]
}

export async function createTask(payload: {
  title: string
  description?: string
  priority: string
  assignedTo?: string
  deadline?: string
  projectId?: string
  createdBy: string
}): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: payload.title,
      description: payload.description || null,
      priority: payload.priority,
      status: 'todo',
      assigned_to: payload.assignedTo || null,
      deadline: payload.deadline || null,
      project_id: payload.projectId || null,
      created_by: payload.createdBy,
      position: 0
    })
    .select()
    .single()
  if (error) throw error

  // Log activity with the REAL task id
  await supabase.from('activities').insert({
    user_id: payload.createdBy,
    action: 'created_task',
    entity_type: 'task',
    entity_id: data.id,
    metadata: { title: payload.title }
  })

  return data as Task
}

export async function updateTask(
  taskId: string,
  updates: Partial<{
    title: string
    description: string | null
    status: string
    priority: string
    assigned_to: string | null
    deadline: string | null
    project_id: string | null
  }>
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw error
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: string,
  userId: string
): Promise<void> {
  await updateTask(taskId, { status: newStatus })
  if (newStatus === 'done') {
    await supabase.from('activities').insert({
      user_id: userId,
      action: 'completed_task',
      entity_type: 'task',
      entity_id: taskId,
      metadata: {}
    })
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

export async function fetchTaskComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, profiles:author_id(full_name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Comment[]
}

export async function addTaskComment(
  taskId: string,
  authorId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, author_id: authorId, content })
  if (error) throw error
}

export async function fetchMembers(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) throw error
  return (data || []) as UserProfile[]
}

export async function fetchActiveProjectsList(): Promise<
  { id: string; name: string }[]
> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('status', 'active')
  if (error) throw error
  return data || []
}
