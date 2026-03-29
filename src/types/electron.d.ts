export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
  notification: {
    show: (title: string, body: string) => Promise<void>
  }
  updater: {
    onUpdateAvailable: (callback: () => void) => void
    onDownloadProgress: (callback: (progress: number) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    quitAndInstall: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
