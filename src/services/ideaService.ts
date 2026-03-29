import { supabase } from '../lib/supabase'
import type { Idea } from '../types/models'

export async function fetchIdeas(filter: string): Promise<Idea[]> {
  let q = supabase
    .from('ideas')
    .select('*, profiles:author_id(full_name, avatar_url), idea_votes(vote, user_id)')
    .order('created_at', { ascending: false })
  if (filter !== 'all') q = q.eq('category', filter)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as Idea[]
}

export async function createIdea(payload: {
  title: string
  description?: string
  category: string
  authorId: string
}): Promise<void> {
  const { data, error } = await supabase
    .from('ideas')
    .insert({
      title: payload.title,
      description: payload.description || null,
      category: payload.category,
      author_id: payload.authorId
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('activities').insert({
    user_id: payload.authorId,
    action: 'created_idea',
    entity_type: 'idea',
    entity_id: data.id,
    metadata: { title: payload.title }
  })
}

export async function updateIdeaStatus(ideaId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('ideas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ideaId)
  if (error) throw error
}

export async function voteOnIdea(ideaId: string, userId: string, voteVal: number): Promise<void> {
  const { error } = await supabase
    .from('idea_votes')
    .upsert({ idea_id: ideaId, user_id: userId, vote: voteVal }, { onConflict: 'idea_id,user_id' })
  if (error) throw error
}

export async function deleteIdea(ideaId: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', ideaId)
  if (error) throw error
}
