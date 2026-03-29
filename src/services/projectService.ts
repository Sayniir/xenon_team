import { supabase } from '../lib/supabase'
import type { Project, Task, Post } from '../types/models'

export async function fetchAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, profiles:created_by(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Project[]
}

export async function fetchDashboardProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(4)
  if (error) throw error
  return (data || []) as Project[]
}

export async function createProject(payload: {
  name: string
  description?: string
  color: string
  createdBy: string
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: payload.name,
      description: payload.description || null,
      color: payload.color,
      created_by: payload.createdBy,
      status: 'active'
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('activities').insert({
    user_id: payload.createdBy,
    action: 'created_project',
    entity_type: 'project',
    entity_id: data.id,
    metadata: { name: payload.name }
  })

  return data as Project
}

export async function updateProjectStatus(projectId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId)
  if (error) throw error
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:assigned_to(full_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Task[]
}

export async function fetchProjectPosts(projectId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:author_id(full_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Post[]
}
