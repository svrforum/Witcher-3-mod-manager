import { ipcMain, BrowserWindow, dialog, shell, app } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
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
import { detectConflicts, mergeScripts } from './modules/script-merger'
import type { ScriptConflict, MergeResult } from './modules/script-merger'
import { readVanillaScript } from './modules/bundle-parser'
import { searchMods, getModInfo, buildModPageUrl } from './modules/nexus-client'
import type { NexusSearchResult, NexusModInfo } from './modules/nexus-client'
import { PresetStore } from './modules/preset-manager'
import type { Preset } from './modules/preset-manager'

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

  ipcMain.handle('game:detect', async (): Promise<{ success: boolean; data?: GameInfo; error?: string }> => {
    try {
      const info = detectGame()
      return { success: true, data: info ?? undefined }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('game:select-manual', async (event): Promise<{ success: boolean; data?: GameInfo; error?: string }> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'No window' }

      const result = await dialog.showOpenDialog(win, {
        title: 'Select Witcher 3 Installation Folder',
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'canceled' }

      const gamePath = result.filePaths[0]
      const hasExe =
        existsSync(join(gamePath, 'bin', 'x64', 'witcher3.exe')) ||
        existsSync(join(gamePath, 'bin', 'x64_dx12', 'witcher3.exe'))

      if (!hasExe) return { success: false, error: 'witcher3.exe not found in selected folder' }

      return {
        success: true,
        data: { gamePath, gameVersion: detectGameVersion(gamePath), platform: 'manual' }
      }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('config:load', async (): Promise<{ success: boolean; data?: AppConfig; error?: string }> => {
    try {
      return { success: true, data: loadConfig() }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('config:save', async (_event, config: AppConfig): Promise<{ success: boolean; error?: string }> => {
    try {
      const oldConfig = loadConfig()
      saveConfig(config)
      if (oldConfig.gamePath !== config.gamePath) {
        modDb = null
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
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

          const stripped = mod.id.startsWith('~') ? mod.id.slice(1) : mod.id
          const baseName = stripped.replace(/^mod\d{4}_/, '').replace(/^mod/, '')
          const prefix = String(orderIdx).padStart(4, '0')
          const newId = `${mod.id.startsWith('~') ? '~' : ''}mod${prefix}_${baseName}`

          return { ...mod, id: newId, name: newId, loadOrder: orderIdx }
        })

        db.updateAll(updatedMods)
        return { success: true, data: db.getAll() }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  // ─── Merger Handlers ────────────────────────────────────────────────────────

  ipcMain.handle(
    'merger:detect-conflicts',
    async (): Promise<{ success: boolean; data?: ScriptConflict[]; error?: string }> => {
      try {
        const config = loadConfig()
        if (!config.gamePath) return { success: true, data: [] }

        const db = getModDatabase(config.gamePath)
        const mods = db.getAll().filter((m) => m.enabled)
        const conflicts = detectConflicts(mods)
        return { success: true, data: conflicts }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'merger:merge-scripts',
    async (
      _event,
      vanilla: string,
      modA: string,
      modB: string
    ): Promise<{ success: boolean; data?: MergeResult; error?: string }> => {
      try {
        const result = mergeScripts(vanilla, modA, modB)
        return { success: true, data: result }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'merger:merge-all',
    async (): Promise<{ success: boolean; data?: ScriptConflict[]; error?: string }> => {
      try {
        const config = loadConfig()
        if (!config.gamePath) return { success: false, error: 'Game path not configured' }

        const db = getModDatabase(config.gamePath)
        const mods = db.getAll().filter((m) => m.enabled)
        const conflicts = detectConflicts(mods)
        const modsDir = getModsDir(config.gamePath)
        const results: ScriptConflict[] = []

        for (const conflict of conflicts) {
          if (conflict.involvedMods.length < 2) continue

          // Read vanilla script
          const vanillaContent = readVanillaScript(config.gamePath, conflict.scriptPath)
          if (!vanillaContent) {
            results.push({ ...conflict, status: 'unresolved' })
            continue
          }

          // Read mod scripts - try to find the script in each mod's folder
          const modContents: string[] = []
          for (const modId of conflict.involvedMods) {
            const modScriptPath = join(modsDir, modId, 'content', 'scripts', conflict.scriptPath)
            try {
              const { readFileSync } = await import('fs')
              const content = readFileSync(modScriptPath, 'utf-8')
              modContents.push(content)
            } catch {
              modContents.push(vanillaContent) // fallback to vanilla if can't read
            }
          }

          // Merge pairwise
          let currentMerged = modContents[0]
          let allSuccess = true
          for (let i = 1; i < modContents.length; i++) {
            const mergeResult = mergeScripts(vanillaContent, currentMerged, modContents[i])
            if (mergeResult.merged) {
              currentMerged = mergeResult.merged
            }
            if (!mergeResult.success) {
              allSuccess = false
            }
          }

          // Write merged content to disk
          if (allSuccess && currentMerged) {
            const mergedDir = join(
              config.gamePath,
              'Mods',
              'mod0000_MergedFiles',
              'content',
              'scripts'
            )
            const outputPath = join(mergedDir, conflict.scriptPath)
            const outputDir = join(outputPath, '..')
            if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })
            writeFileSync(outputPath, currentMerged, 'utf-8')
          }

          results.push({
            ...conflict,
            status: allSuccess ? 'auto_merged' : 'unresolved',
          })
        }

        return { success: true, data: results }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  // ─── Nexus Handlers ──────────────────────────────────────────────────────

  ipcMain.handle(
    'nexus:search',
    async (_event, query: string): Promise<{ success: boolean; data?: NexusSearchResult[]; error?: string }> => {
      try {
        const config = loadConfig()
        if (!config.nexusApiKey) return { success: false, error: 'No API key configured' }
        const results = await searchMods(query, config.nexusApiKey)
        return { success: true, data: results }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'nexus:mod-info',
    async (_event, modId: number): Promise<{ success: boolean; data?: NexusModInfo; error?: string }> => {
      try {
        const config = loadConfig()
        if (!config.nexusApiKey) return { success: false, error: 'No API key configured' }
        const info = await getModInfo(modId, config.nexusApiKey)
        return { success: true, data: info }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'nexus:open-page',
    async (_event, modId: number): Promise<{ success: boolean; error?: string }> => {
      try {
        const url = buildModPageUrl(modId)
        await shell.openExternal(url)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  // ─── Shell Handlers ──────────────────────────────────────────────────────

  ipcMain.handle('shell:open-path', async (_event, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('shell:open-logs', async () => {
    const logsDir = join(app.getPath('userData'), 'logs')
    shell.openPath(logsDir)
    return { success: true }
  })

  // ─── Preset Handlers ─────────────────────────────────────────────────────

  const presetStore = new PresetStore(
    join(app.getPath('userData'), 'presets'),
    join(__dirname, '../../resources/presets/default-presets.json')
  )

  ipcMain.handle(
    'presets:list',
    async (): Promise<{ success: boolean; data?: Preset[]; error?: string }> => {
      try {
        const presets = presetStore.getAll()
        return { success: true, data: presets }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'presets:create',
    async (
      _event,
      data: { name: string; description: string; mods: Preset['mods'] }
    ): Promise<{ success: boolean; data?: Preset; error?: string }> => {
      try {
        const preset = presetStore.create(data)
        return { success: true, data: preset }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'presets:remove',
    async (_event, id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        presetStore.remove(id)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'presets:export',
    async (_event, id: string): Promise<{ success: boolean; data?: string; error?: string }> => {
      try {
        const json = presetStore.export(id)
        return { success: true, data: json }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )

  ipcMain.handle(
    'presets:import',
    async (_event, jsonString: string): Promise<{ success: boolean; data?: Preset; error?: string }> => {
      try {
        const preset = presetStore.import(jsonString)
        return { success: true, data: preset }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  )
}
