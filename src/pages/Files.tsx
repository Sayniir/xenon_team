import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { useUploadStore } from '../stores/uploadStore'
import { supabase } from '../lib/supabase'
import {
  Paperclip, Upload, FileText, Image, Film, Archive, File as FileIcon, Download, Trash2
} from 'lucide-react'
import { formatFileSize, timeAgo, getInitials } from '../lib/helpers'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import type { FileRecord } from '../types/models'

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
  if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
  return FileIcon
}

export default function Files() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const uploadStore = useUploadStore()
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null)

  const { data: files = [] } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*, profiles:uploaded_by(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as FileRecord[]
    }
  })

  const handleUpload = (file: File) => {
    const path = `${Date.now()}_${file.name}`
    uploadStore.startUpload(file, 'documents', path, async () => {
      const { error } = await supabase.from('files').insert({
        name: file.name,
        storage_path: path,
        size: file.size,
        mime_type: file.type,
        uploaded_by: user!.id
      })
      if (error) {
        toast.error('Erreur', 'Impossible d\'enregistrer le fichier.')
        return
      }

      await supabase.from('activities').insert({
        user_id: user!.id,
        action: 'uploaded_file',
        entity_type: 'file',
        entity_id: '00000000-0000-0000-0000-000000000000', // No ID available at this point
        metadata: { name: file.name }
      })

      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Fichier uploadé', `"${file.name}" a été ajouté.`)
    })
  }

  const deleteFileMut = useMutation({
    mutationFn: async (file: FileRecord) => {
      // Delete from storage first
      const { error: storageError } = await supabase.storage.from('documents').remove([file.storage_path])
      if (storageError) console.error('Storage delete error:', storageError)
      // Then delete the record
      const { error } = await supabase.from('files').delete().eq('id', file.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Fichier supprimé')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const handleDownload = async (file: FileRecord) => {
    const { data, error } = await supabase.storage.from('documents').download(file.storage_path)
    if (error || !data) {
      toast.error('Erreur', 'Impossible de télécharger le fichier.')
      return
    }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Paperclip size={28} style={{ color: 'var(--info)', verticalAlign: 'middle', marginRight: 8 }} />
            Fichiers
          </h1>
          <p className="page-subtitle">{files.length} fichiers stockés</p>
        </div>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          <Upload size={16} /> Uploader
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
            }}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <Paperclip size={48} />
          <h3>Aucun fichier</h3>
          <p className="text-sm text-secondary">Uploadez votre premier fichier</p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Uploader un fichier
            <input type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
          </label>
        </div>
      ) : (
        <div className="files-grid">
          {files.map((file) => {
            const Icon = getFileIcon(file.mime_type)
            const isOwner = file.uploaded_by === user?.id
            return (
              <div key={file.id} className="file-card">
                <div className="file-card-icon">
                  <Icon size={24} />
                </div>
                <div className="file-card-name" title={file.name}>{file.name}</div>
                <div className="file-card-meta">{formatFileSize(file.size)}</div>
                <div className="file-card-meta">{timeAgo(file.created_at)}</div>
                <div className="flex gap-2 justify-center mt-2">
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDownload(file)} title="Télécharger">
                    <Download size={14} />
                  </button>
                  {isOwner && (
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDeleteTarget(file)}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le fichier"
          message={`Le fichier "${deleteTarget.name}" sera supprimé définitivement du stockage.`}
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={() => deleteFileMut.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
