import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
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
  const tempMap: Array<{ tempName: string; baseName: string }> = []

  for (const folderName of order) {
    const src = join(modsDir, folderName)
    if (!existsSync(src)) continue
    const baseName = stripPrefix(folderName)
    const tempName = `__temp_reorder_${baseName}`
    renameSync(src, join(modsDir, tempName))
    tempMap.push({ tempName, baseName })
  }

  // Pass 2: rename from temp to final with numeric prefix
  for (let i = 0; i < tempMap.length; i++) {
    const { tempName, baseName } = tempMap[i]
    const prefix = String(i).padStart(4, '0')
    const finalName = `mod${prefix}_${baseName}`
    renameSync(join(modsDir, tempName), join(modsDir, finalName))
  }
}

// ─── installMod ─────────────────────────────────────────────────────────────

/**
 * Find the actual mod folder inside extracted content.
 * Looks for a folder starting with "mod" at the root or one level deep.
 */
function findModFolder(extractedDir: string): string | null {
  const entries = readdirSync(extractedDir, { withFileTypes: true })

  // Check top-level entries for a mod folder
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.toLowerCase().startsWith('mod')) {
      return join(extractedDir, entry.name)
    }
  }

  // Check one level deep (in case archive has a wrapper folder)
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPath = join(extractedDir, entry.name)
      const subEntries = readdirSync(subPath, { withFileTypes: true })
      for (const sub of subEntries) {
        if (sub.isDirectory() && sub.name.toLowerCase().startsWith('mod')) {
          return join(subPath, sub.name)
        }
      }
    }
  }

  return null
}

export interface InstallResult {
  folderName: string
  scripts: string[]
}

export function installMod(archivePath: string, modsDir: string): InstallResult {
  // Create a temp directory inside modsDir for extraction
  const tempDir = join(modsDir, `__temp_install_${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    extractArchive(archivePath, tempDir)

    const modFolder = findModFolder(tempDir)
    if (!modFolder) {
      throw new Error('No mod folder found in archive. Expected a folder starting with "mod".')
    }

    const folderName = basename(modFolder)
    const destPath = join(modsDir, folderName)

    if (existsSync(destPath)) {
      rmSync(destPath, { recursive: true, force: true })
    }

    renameSync(modFolder, destPath)

    const scripts = scanModScripts(destPath)

    return { folderName, scripts }
  } catch (err) {
    throw err
  } finally {
    // Clean up temp dir
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
