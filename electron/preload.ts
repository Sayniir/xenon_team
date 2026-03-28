import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  notification: {
    show: (title: string, body: string) => ipcRenderer.invoke('notification:show', title, body)
  },
  updater: {
    onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update-available', () => callback()),
    onDownloadProgress: (callback: (progress: number) => void) => ipcRenderer.on('download-progress', (_e, progress) => callback(progress)),
    onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update-downloaded', () => callback()),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install')
  }
})
