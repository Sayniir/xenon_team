export type UserProfile = {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: string
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'archived'
  color: string
  created_by: string
  created_at: string
  updated_at: string
  profiles?: UserProfile
  task_count?: number
  done_count?: number
}

export type Task = {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  deadline: string | null
  project_id: string | null
  assigned_to: string | null
  created_by: string
  position: number
  created_at: string
  updated_at: string
  profiles?: UserProfile
  assignee?: UserProfile
  projects?: Project
}

export type Post = {
  id: string
  title: string
  content: string
  type: 'update' | 'standup' | 'note' | 'announcement'
  project_id: string | null
  author_id: string
  pinned: boolean
  created_at: string
  updated_at: string
  profiles?: UserProfile
  projects?: Project
  comment_count?: number
}

export type Comment = {
  id: string
  content: string
  author_id: string
  created_at: string
  profiles?: UserProfile
  task_id?: string
  post_id?: string
}

export type Idea = {
  id: string
  title: string
  description: string | null
  category: 'business' | 'content' | 'offers' | 'features' | 'internal'
  status: 'new' | 'discussing' | 'accepted' | 'rejected'
  author_id: string
  created_at: string
  updated_at: string
  profiles?: UserProfile
  vote_count?: number
  user_vote?: number
  idea_votes?: any[]
}

export type FileRecord = {
  id: string
  name: string
  storage_path: string
  size: number
  mime_type: string
  folder: string
  project_id: string | null
  task_id: string | null
  post_id: string | null
  uploaded_by: string
  created_at: string
  profiles?: UserProfile
}

export type Activity = {
  id: string
  user_id: string
  action: string
  entity_type: 'task' | 'post' | 'project' | 'idea' | 'file'
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
  profiles?: UserProfile
}

export type Notification = {
  id: string
  user_id: string
  type: 'task_assigned' | 'comment' | 'new_post' | 'task_completed'
  title: string
  message: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

export type ChatMessage = {
  id: string
  content: string
  author_id: string
  created_at: string
  profiles?: UserProfile
}
