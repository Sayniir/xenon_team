import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Paperclip, Upload, Trash2, Download, File, Image, FileText, Film } from 'lucide-react'
import { formatFileSize, timeAgo, getInitials } from '../lib/helpers'
import { useUploadStore } from '../stores/uploadStore'
import type { FileRecord } from '../types/models'

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={24} />
  if (mimeType.startsWith('video/')) return <Film size={24} />
  if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText size={24} />
  return <File size={24} />
}

export default function Files() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const { data: files = [] } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const { data } = await supabase
        .from('files')
        .select('*, profiles:uploaded_by(full_name)')
        .order('created_at', { ascending: false })
      return (data || []) as FileRecord[]
    }
  })

  const { startUpload } = useUploadStore()
  
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !user) return
    Array.from(fileList).forEach((f) => {
      const path = `${user.id}/${Date.now()}_${f.name}`
      startUpload(f, 'documents', path, async () => {
        // Enregistre en base APRÈS l'upload réussi
        await supabase.from('files').insert({
          name: f.name,
          storage_path: path,
          size: f.size,
          mime_type: f.type,
          folder: '/',
          uploaded_by: user.id
        })

        await supabase.from('activities').insert({
          user_id: user.id, 
          action: 'uploaded_file',
          entity_type: 'file', 
          entity_id: '00000000-0000-0000-0000-000000000000',
          metadata: { name: f.name }
        })
        
        // Rafraîchir les listes automatiquement
        queryClient.invalidateQueries({ queryKey: ['files'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] })
      })
    })
  }

  const deleteFile = useMutation({
    mutationFn: async (file: FileRecord) => {
      await supabase.storage.from('documents').remove([file.storage_path])
      await supabase.from('files').delete().eq('id', file.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] })
  })



  const downloadFile = async (file: FileRecord) => {
    const { data } = await supabase.storage.from('documents').download(file.storage_path)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Paperclip size={28} style={{ color: 'var(--primary-400)', verticalAlign: 'middle', marginRight: 8 }} />
            Fichiers
          </h1>
          <p className="page-subtitle">{files.length} fichier{files.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Uploader
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        className="card"
        style={{
          marginBottom: 24, textAlign: 'center', padding: 40,
          border: dragging ? '2px dashed var(--primary-500)' : '2px dashed var(--border-default)',
          background: dragging ? 'rgba(123, 47, 242, 0.05)' : 'transparent',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        <Upload size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
        <p className="text-sm text-secondary">
          Glissez vos fichiers ici ou <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>cliquez pour parcourir</span>
        </p>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <Paperclip size={48} />
          <h3>Aucun fichier</h3>
          <p className="text-sm text-secondary">Uploadez vos premiers fichiers</p>
        </div>
      ) : (
        <div className="files-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card">
              <div className="file-card-icon">
                {getFileIcon(file.mime_type)}
              </div>
              <div className="file-card-name">{file.name}</div>
              <div className="file-card-meta">
                {formatFileSize(file.size)} • {timeAgo(file.created_at)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(file)}>
                  <Download size={14} />
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteFile.mutate(file)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
