import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  cpSync,
} from 'fs'
import { join, relative, basename } from 'path'
import { extractArchive } from '../utils/archive'

export interface ModEntry {
  id: string
  name: string
  version: string
  nexusModId?: number
  nexusUrl?: string
  enabled: boolean
  loadOrder: number
  installedAt: string
  modifiedScripts: string[]
}

// ─── ModDatabase ────────────────────────────────────────────────────────────

export class ModDatabase {
  private mods: ModEntry[] = []
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.dbPath)) {
        const raw = readFileSync(this.dbPath, 'utf-8')
        this.mods = JSON.parse(raw)
      }
    } catch {
      this.mods = []
    }
  }

  private save(): void {
    const dir = join(this.dbPath, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(this.dbPath, JSON.stringify(this.mods, null, 2))
  }

  getAll(): ModEntry[] {
    return [...this.mods]
  }

  getById(id: string): ModEntry | undefined {
    return this.mods.find((m) => m.id === id)
  }

  add(mod: ModEntry): void {
    this.mods.push(mod)
    this.save()
  }

  remove(id: string): void {
    this.mods = this.mods.filter((m) => m.id !== id)
    this.save()
  }

  update(id: string, partial: Partial<ModEntry>): void {
    const idx = this.mods.findIndex((m) => m.id === id)
    if (idx !== -1) {
      this.mods[idx] = { ...this.mods[idx], ...partial }
      this.save()
    }
  }

  updateAll(mods: ModEntry[]): void {
    this.mods = [...mods]
    this.save()
  }
}

// ─── scanModScripts ─────────────────────────────────────────────────────────

export function scanModScripts(modFolder: string): string[] {
  const results: string[] = []

  function walk(dir: string): void {
    if (!existsSync(dir)) return
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith('.ws')) {
        results.push(relative(modFolder, fullPath))
      }
    }
  }

  walk(modFolder)
  return results
}

// ─── applyLoadOrder ─────────────────────────────────────────────────────────

/** Strip existing mod####_ prefix or plain mod prefix to get the base name */
function stripPrefix(folderName: string): string {
  // First try numbered prefix: mod0001_Name -> Name
  if (/^mod\d{4}_/.test(folderName)) {
    return folderName.replace(/^mod\d{4}_/, '')
  }
  // Then try plain mod prefix: modName -> Name
  if (/^mod[A-Z]/.test(folderName)) {
    return folderName.slice(3)
  }
  return folderName
}

export function applyLoadOrder(modsDir: string, order: string[]): void {
  // Pass 1: rename all to temp names to avoid collisions
  const tempMap: Array<{ tempName: string; baseName: string; disabledPrefix: string }> = []

  for (const folderName of order) {
    const src = join(modsDir, folderName)
    if (!existsSync(src)) continue
    const disabledPrefix = folderName.startsWith('~') ? '~' : ''
    const stripped = disabledPrefix ? folderName.slice(1) : folderName
    const baseName = stripPrefix(stripped)
    const tempName = `__temp_reorder_${baseName}`
    renameSync(src, join(modsDir, tempName))
    tempMap.push({ tempName, baseName, disabledPrefix })
  }

  // Pass 2: rename from temp to final with numeric prefix
  for (let i = 0; i < tempMap.length; i++) {
    const { tempName, baseName, disabledPrefix } = tempMap[i]
    const prefix = String(i).padStart(4, '0')
    const finalName = `${disabledPrefix}mod${prefix}_${baseName}`
    renameSync(join(modsDir, tempName), join(modsDir, finalName))
  }
}

// ─── installMod ─────────────────────────────────────────────────────────────

/**
 * Find the actual mod folder inside extracted content.
 * Looks for a folder starting with "mod" at the root or one level deep.
 */
/**
 * Find mod folders in extracted archive. Handles common structures:
 * 1. Archive contains modXYZ/ directly
 * 2. Archive contains mods/modXYZ/ (Nexus standard)
 * 3. Archive contains a wrapper folder with mods/modXYZ/ inside
 * Returns array of mod folder paths found.
 */
function findModFolders(extractedDir: string): string[] {
  const results: string[] = []

  function scanDir(dir: string, depth: number): void {
    if (depth > 3) return
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const fullPath = join(dir, entry.name)
      const name = entry.name.toLowerCase()

      // "mods" folder — look inside for actual mod folders
      if (name === 'mods') {
        const inner = readdirSync(fullPath, { withFileTypes: true })
        for (const sub of inner) {
          if (sub.isDirectory() && sub.name.toLowerCase().startsWith('mod')) {
            results.push(join(fullPath, sub.name))
          }
        }
      }
      // Direct mod folder (starts with "mod" but isn't "mods")
      else if (name.startsWith('mod') && name !== 'mods') {
        results.push(fullPath)
      }
      // Could be a wrapper folder — check one level deeper
      else if (depth === 0) {
        scanDir(fullPath, depth + 1)
      }
    }
  }

  scanDir(extractedDir, 0)
  return results
}

/**
 * Find extra folders that should go to game root (e.g., bin/, dlc/).
 */
function findGameRootFolders(extractedDir: string): string[] {
  const gameRootNames = ['bin', 'dlc']
  const results: string[] = []

  function scanDir(dir: string, depth: number): void {
    if (depth > 1) return
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (gameRootNames.includes(entry.name.toLowerCase())) {
        results.push(join(dir, entry.name))
      } else if (depth === 0 && entry.name.toLowerCase() !== 'mods') {
        scanDir(join(dir, entry.name), depth + 1)
      }
    }
  }

  scanDir(extractedDir, 0)
  return results
}

export interface InstallResult {
  folderName: string
  scripts: string[]
}

export async function installMod(archivePath: string, modsDir: string, gamePath?: string): Promise<InstallResult> {
  const tempDir = join(modsDir, `__temp_install_${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    await extractArchive(archivePath, tempDir)

    // Find mod folders
    const modFolders = findModFolders(tempDir)
    if (modFolders.length === 0) {
      throw new Error('No mod folder found in archive. Expected a folder starting with "mod".')
    }

    // Install each mod folder
    let primaryFolder = ''
    const allScripts: string[] = []

    for (const modFolder of modFolders) {
      const folderName = basename(modFolder)
      const destPath = join(modsDir, folderName)

      if (existsSync(destPath)) {
        rmSync(destPath, { recursive: true, force: true })
      }

      cpSync(modFolder, destPath, { recursive: true })

      if (!primaryFolder) primaryFolder = folderName
      allScripts.push(...scanModScripts(destPath))
    }

    // Copy game-root folders (bin/, dlc/) to game directory
    if (gamePath) {
      const gameRootFolders = findGameRootFolders(tempDir)
      for (const folder of gameRootFolders) {
        const folderName = basename(folder)
        const destPath = join(gamePath, folderName)
        cpSync(folder, destPath, { recursive: true })
      }
    }

    return { folderName: primaryFolder, scripts: allScripts }
  } catch (err) {
    throw err
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }
}

// ─── removeMod ──────────────────────────────────────────────────────────────

export function removeMod(modsDir: string, folderName: string): void {
  const modPath = join(modsDir, folderName)
  if (existsSync(modPath)) {
    rmSync(modPath, { recursive: true, force: true })
  }
}

// ─── toggleMod ──────────────────────────────────────────────────────────────

export function toggleMod(
  modsDir: string,
  folderName: string,
  enable: boolean
): string {
  const currentPath = join(modsDir, folderName)
  const isDisabled = folderName.startsWith('~')

  let newName: string
  if (enable && isDisabled) {
    newName = folderName.slice(1)
  } else if (!enable && !isDisabled) {
    newName = `~${folderName}`
  } else {
    return folderName // already in desired state
  }

  const newPath = join(modsDir, newName)
  renameSync(currentPath, newPath)
  return newName
}
