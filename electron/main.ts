import { app, BrowserWindow, shell, ipcMain, Notification, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#08080f',
      symbolColor: '#8888AA',
      height: 36
    },
    backgroundColor: '#08080f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev 
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com data: blob:;"
      : "default-src 'self' 'unsafe-inline' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com data: blob:;"
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWindow?.close())

ipcMain.handle('notification:show', (_event, title: string, body: string) => {
  new Notification({ title, body }).show()
})

app.whenReady().then(() => {
  createWindow()
  
  // Checking for updates only if running in production mode (packaged app)
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('update-available')
    })

    autoUpdater.on('download-progress', (progressObj) => {
      mainWindow?.webContents.send('download-progress', progressObj.percent)
    })

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update-downloaded')
    })
  }
})

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
