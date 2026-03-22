import { ipcMain, BrowserWindow, dialog } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { detectGame, detectGameVersion } from './modules/game-detector'
import type { GameInfo } from './modules/game-detector'
import { loadConfig, saveConfig } from './modules/config-manager'
import type { AppConfig } from './modules/config-manager'
import {
  ModDatabase,
  installMod,
  removeMod,
  toggleMod,
  applyLoadOrder,
} from './modules/mod-manager'
import type { ModEntry } from './modules/mod-manager'
import { OperationQueue } from './modules/operation-queue'
import { isWitcherRunning } from './utils/process-check'

let modDb: ModDatabase | null = null
const modQueue = new OperationQueue()

function getModsDir(gamePath: string): string {
  const modsDir = join(gamePath, 'Mods')
  if (!existsSync(modsDir)) mkdirSync(modsDir, { recursive: true })
  return modsDir
}

function getModDatabase(gamePath: string): ModDatabase {
  if (!modDb) {
    modDb = new ModDatabase(join(gamePath, 'Mods', 'mods.json'))
  }
  return modDb
}

export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('game:detect', async (): Promise<GameInfo | null> => {
    return detectGame()
  })

  ipcMain.handle('game:select-manual', async (event): Promise<GameInfo | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Select Witcher 3 Installation Folder',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const gamePath = result.filePaths[0]
    const hasExe =
      existsSync(join(gamePath, 'bin', 'x64', 'witcher3.exe')) ||
      existsSync(join(gamePath, 'bin', 'x64_dx12', 'witcher3.exe'))

    if (!hasExe) return null

    return {
      gamePath,
      gameVersion: detectGameVersion(gamePath),
      platform: 'manual'
    }
  })

  ipcMain.handle('config:load', async (): Promise<AppConfig> => {
    return loadConfig()
  })

  ipcMain.handle('config:save', async (_event, config: AppConfig): Promise<void> => {
    saveConfig(config)
  })

  // ─── Mod Handlers ───────────────────────────────────────────────────────

  ipcMain.handle('mods:list', async (): Promise<{ success: boolean; data?: ModEntry[]; error?: string }> => {
    try {
      const config = loadConfig()
      if (!config.gamePath) return { success: true, data: [] }
      const db = getModDatabase(config.gamePath)
      return { success: true, data: db.getAll() }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('mods:install', async (event): Promise<{ success: boolean; data?: ModEntry; error?: string }> => {
    try {
      if (isWitcherRunning()) {
        return { success: false, error: 'Game is running. Please close the game and try again.' }
      }

      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'No window' }

      const result = await dialog.showOpenDialog(win, {
        title: 'Select Mod Archive',
        filters: [
          { name: 'Archives', extensions: ['zip', 'rar', '7z'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'canceled' }
      }

      const archivePath = result.filePaths[0]
      const config = loadConfig()
      if (!config.gamePath) return { success: false, error: 'Game path not configured' }

      const modsDir = getModsDir(config.gamePath)
      const db = getModDatabase(config.gamePath)

      const installResult = await modQueue.enqueue(async () => {
        return installMod(archivePath, modsDir)
      })

      const modEntry: ModEntry = {
        id: installResult.folderName,
        name: installResult.folderName,
        version: '1.0',
        enabled: true,
        loadOrder: db.getAll().length,
        installedAt: new Date().toISOString(),
        modifiedScripts: installResult.scripts,
      }

      db.add(modEntry)
      return { success: true, data: modEntry }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('mods:remove', async (_event, modId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const config = loadConfig()
      if (!config.gamePath) return { success: false, error: 'Game path not configured' }

      const modsDir = getModsDir(config.gamePath)
      const db = getModDatabase(config.gamePath)
      const mod = db.getById(modId)
      if (!mod) return { success: false, error: 'Mod not found' }

      removeMod(modsDir, mod.id)
      db.remove(modId)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle(
    'mods:toggle',
    async (_event, modId: string, enable: boolean): Promise<{ success: boolean; data?: ModEntry; error?: string }> => {
      try {
        const config = loadConfig()
        if (!config.gamePath) return { success: false, error: 'Game path not configured' }

        const modsDir = getModsDir(config.gamePath)
        const db = getModDatabase(config.gamePath)
        const mod = db.getById(modId)
        if (!mod) return { success: false, error: 'Mod not found' }

        const newFolderName = toggleMod(modsDir, mod.id, enable)
        db.update(modId, { id: newFolderName, enabled: enable })

        return { success: true, data: db.getById(newFolderName) }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'mods:reorder',
    async (_event, orderedIds: string[]): Promise<{ success: boolean; data?: ModEntry[]; error?: string }> => {
      try {
        const config = loadConfig()
        if (!config.gamePath) return { success: false, error: 'Game path not configured' }

        const modsDir = getModsDir(config.gamePath)
        const db = getModDatabase(config.gamePath)

        applyLoadOrder(modsDir, orderedIds)

        // Update the database with new folder names and load orders
        const updatedMods = db.getAll().map((mod) => {
          const orderIdx = orderedIds.indexOf(mod.id)
          if (orderIdx === -1) return mod

          const baseName = mod.id.replace(/^mod\d{4}_/, '').replace(/^mod/, '')
          const prefix = String(orderIdx).padStart(4, '0')
          const newId = `mod${prefix}_${baseName}`

          return { ...mod, id: newId, name: newId, loadOrder: orderIdx }
        })

        db.updateAll(updatedMods)
        return { success: true, data: db.getAll() }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )
}
