import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type UploadStatus = 'uploading' | 'success' | 'error'

export interface UploadTask {
  id: string
  fileName: string
  progress: number
  status: UploadStatus
  error?: string
}

interface UploadState {
  tasks: Record<string, UploadTask>
  startUpload: (
    file: File,
    bucket: string,
    path: string,
    onSuccess?: () => Promise<void> | void
  ) => void
  removeTask: (id: string) => void
}

export const useUploadStore = create<UploadState>((set, get) => ({
  tasks: {},

  startUpload: async (file, bucket, path, onSuccess) => {
    const taskId = crypto.randomUUID()
    
    // Initialiser la tâche
    set((state) => ({
      tasks: { ...state.tasks, [taskId]: { id: taskId, fileName: file.name, progress: 0, status: 'uploading' } }
    }))

    try {
      // 1. Obtenir les identifiants requis pour le POST direct
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Non connecté")
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      // Construire l'URL (Stockage API)
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`
      
      // 2. XMLHttpRequest pour le VRAI suivi de progression
      const xhr = new XMLHttpRequest()
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          set((state) => ({
            tasks: {
              ...state.tasks,
              [taskId]: { ...state.tasks[taskId], progress: percentComplete }
            }
          }))
        }
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Success
          set((state) => ({
            tasks: { ...state.tasks, [taskId]: { ...state.tasks[taskId], status: 'success', progress: 100 } }
          }))
          
          if (onSuccess) {
            await onSuccess()
          }
          
          // Auto-remove après quelques secondes
          setTimeout(() => {
            get().removeTask(taskId)
          }, 4000)
        } else {
          // Error server-side
          let errorMessage = 'Erreur serveur'
          try {
            const resp = JSON.parse(xhr.responseText)
            errorMessage = resp.message || resp.error || errorMessage
          } catch (e) {}
          
          set((state) => ({
            tasks: { ...state.tasks, [taskId]: { ...state.tasks[taskId], status: 'error', error: errorMessage } }
          }))
          
          // Auto-remove une erreur après 8 secondes pour ne pas polluer 
          setTimeout(() => {
            get().removeTask(taskId)
          }, 8000)
        }
      }

      xhr.onerror = () => {
        set((state) => ({
          tasks: { ...state.tasks, [taskId]: { ...state.tasks[taskId], status: 'error', error: 'Connexion interrompue' } }
        }))
        setTimeout(() => get().removeTask(taskId), 8000)
      }

      // 3. Envoyer la requête
      xhr.open('POST', uploadUrl, true)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('apikey', supabaseKey)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      
      xhr.send(file)

    } catch (err: any) {
      set((state) => ({
        tasks: { ...state.tasks, [taskId]: { ...state.tasks[taskId], status: 'error', error: err.message } }
      }))
      setTimeout(() => get().removeTask(taskId), 8000)
    }
  },

  removeTask: (id) => {
    set((state) => {
      const newTasks = { ...state.tasks }
      delete newTasks[id]
      return { tasks: newTasks }
    })
  }
}))
