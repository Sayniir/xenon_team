import { supabase } from '../lib/supabase'
import type { Post, Comment } from '../types/models'

export async function fetchPosts(filter: string): Promise<Post[]> {
  let q = supabase
    .from('posts')
    .select('*, profiles:author_id(id, full_name, avatar_url)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (filter !== 'all') q = q.eq('type', filter)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as Post[]
}

export async function fetchDashboardPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:author_id(full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(3)
  if (error) throw error
  return (data || []) as Post[]
}

export async function createPost(payload: {
  title: string
  content: string
  type: string
  authorId: string
}): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: payload.title,
      content: payload.content,
      type: payload.type,
      author_id: payload.authorId
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('activities').insert({
    user_id: payload.authorId,
    action: 'created_post',
    entity_type: 'post',
    entity_id: data.id,
    metadata: { title: payload.title }
  })

  return data as Post
}

export async function updatePost(
  postId: string,
  updates: Partial<{ title: string; content: string; type: string; pinned: boolean }>
): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', postId)
  if (error) throw error
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

export async function fetchPostComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, profiles:author_id(id, full_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Comment[]
}

export async function addPostComment(
  postId: string,
  authorId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, content })
  if (error) throw error
}
