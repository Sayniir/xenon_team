import { supabase } from '../lib/supabase'
import type { ChatMessage } from '../types/models'

const PAGE_SIZE = 50

export async function fetchChatMessages(
  page: number = 0
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // We need total count for "hasMore"
  const { data, error, count } = await supabase
    .from('chat_messages')
    .select('*, profiles:author_id(full_name, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  // Reverse so oldest is first (for display purposes)
  const messages = ((data || []) as ChatMessage[]).reverse()
  const hasMore = count ? from + PAGE_SIZE < count : false

  return { messages, hasMore }
}

export async function sendChatMessage(content: string, authorId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ content: content.trim(), author_id: authorId })
  if (error) throw error
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('id', messageId)
  if (error) throw error
}
