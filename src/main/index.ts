import { app, BrowserWindow, shell, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { registerIpcHandlers } from './ipc-handlers'
import { logger } from './modules/logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerIpcHandlers(mainWindow)
}

function setupAutoUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    logger.info('updater', 'Update available', { version: info.version })

    const isPortable = !app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR != null ||
      app.getPath('exe').includes('app.asar.unpacked')

    if (isPortable) {
      // Portable: can't auto-install, offer to open download page
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `New version ${info.version} is available.`,
        detail: 'Portable version cannot auto-update. Would you like to download the new version?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then((result) => {
        if (result.response === 0) {
          shell.openExternal('https://github.com/svrforum/Witcher-3-mod-manager/releases/latest')
        }
      })
    } else {
      // Installer: can auto-download and install
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `New version ${info.version} is available.`,
        detail: 'Would you like to download and install the update? The app will restart after installation.',
        buttons: ['Update Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then((result) => {
        if (result.response === 0) {
          // Notify renderer to show progress
          mainWindow?.webContents.send('update:downloading', info.version)
          autoUpdater.downloadUpdate()
        }
      })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', () => {
    logger.info('updater', 'Update downloaded, prompting restart')
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded. The app will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  autoUpdater.on('error', (err) => {
    logger.error('updater', 'Auto-update error', { error: err.message })
  })

  autoUpdater.checkForUpdates()
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()
})

app.on('window-all-closed', () => {
  app.quit()
})
