import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
// Logger is optional — avoid importing directly to keep module testable without Electron
let _logger: { info: (m: string, msg: string, meta?: Record<string, unknown>) => void } | null = null
function getLogger() {
  if (!_logger) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _logger = require('./logger').logger
    } catch {
      _logger = { info: () => {} }
    }
  }
  return _logger!
}

// GitHub raw URL for remote preset updates
const REMOTE_PRESETS_URL =
  'https://raw.githubusercontent.com/svrforum/Witcher-3-mod-manager/master/resources/presets/default-presets.json'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PresetMod {
  name: string
  nexusUrl?: string
  loadOrder: number
  notes?: string
  needsMerge?: boolean
}

export interface Preset {
  id: string
  name: string
  nameKo?: string
  description: string
  descriptionKo?: string
  mods: PresetMod[]
  createdAt: string
  isBuiltIn: boolean
}

// ─── PresetStore ────────────────────────────────────────────────────────────

export class PresetStore {
  private presetsDir: string
  private builtInPath: string
  private cachedRemotePath: string

  constructor(presetsDir: string, builtInPath: string) {
    this.presetsDir = presetsDir
    this.builtInPath = builtInPath
    this.cachedRemotePath = join(presetsDir, '_remote_presets.json')

    if (!existsSync(this.presetsDir)) {
      mkdirSync(this.presetsDir, { recursive: true })
    }

    // Fetch remote presets in background
    this.fetchRemotePresets()
  }

  /** Return all built-in and custom presets */
  getAll(): Preset[] {
    const builtIn = this.loadBuiltIn()
    const custom = this.loadCustom()
    return [...builtIn, ...custom]
  }

  /** Create a new custom preset and persist it to disk */
  create(data: { name: string; description: string; mods: PresetMod[] }): Preset {
    const id = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const preset: Preset = {
      id,
      name: data.name,
      description: data.description,
      mods: data.mods,
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    }

    const filePath = join(this.presetsDir, `${id}.json`)
    writeFileSync(filePath, JSON.stringify(preset, null, 2))
    return preset
  }

  /** Remove a custom preset by id */
  remove(id: string): void {
    const filePath = join(this.presetsDir, `${id}.json`)
    if (existsSync(filePath)) {
      rmSync(filePath)
    } else {
      throw new Error(`Preset not found: ${id}`)
    }
  }

  /** Export a preset as a JSON string */
  export(id: string): string {
    const all = this.getAll()
    const preset = all.find((p) => p.id === id)
    if (!preset) throw new Error(`Preset not found: ${id}`)

    const exportData = { ...preset, isBuiltIn: false }
    return JSON.stringify(exportData, null, 2)
  }

  /** Import a preset from a JSON string */
  import(jsonString: string): Preset {
    const parsed = JSON.parse(jsonString)

    if (!parsed.name || !Array.isArray(parsed.mods)) {
      throw new Error('Invalid preset format: must have name and mods array')
    }

    const preset = this.create({
      name: parsed.name,
      description: parsed.description ?? '',
      mods: parsed.mods,
    })

    return preset
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private loadBuiltIn(): Preset[] {
    // Prefer remote (cached) presets, fall back to bundled
    try {
      if (existsSync(this.cachedRemotePath)) {
        const raw = readFileSync(this.cachedRemotePath, 'utf-8')
        const data = JSON.parse(raw)
        if (Array.isArray(data) && data.length > 0) {
          return data.map((p: Preset) => ({ ...p, isBuiltIn: true }))
        }
      }
    } catch {
      // Fall through to bundled
    }

    try {
      if (!existsSync(this.builtInPath)) return []
      const raw = readFileSync(this.builtInPath, 'utf-8')
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) return []
      return data.map((p: Preset) => ({ ...p, isBuiltIn: true }))
    } catch {
      return []
    }
  }

  private loadCustom(): Preset[] {
    try {
      if (!existsSync(this.presetsDir)) return []
      const files = readdirSync(this.presetsDir).filter(
        (f) => f.endsWith('.json') && !f.startsWith('_')
      )
      const presets: Preset[] = []

      for (const file of files) {
        try {
          const raw = readFileSync(join(this.presetsDir, file), 'utf-8')
          const preset = JSON.parse(raw) as Preset
          preset.isBuiltIn = false
          presets.push(preset)
        } catch {
          // Skip invalid preset files
        }
      }

      return presets
    } catch {
      return []
    }
  }

  private async fetchRemotePresets(): Promise<void> {
    try {
      const response = await fetch(REMOTE_PRESETS_URL)
      if (!response.ok) return

      const data = await response.text()
      // Validate it's valid JSON array
      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) return

      writeFileSync(this.cachedRemotePath, data)
      getLogger().info('preset-manager', 'Updated presets from GitHub', { count: parsed.length })
    } catch {
      // Silently fail — will use cached or bundled presets
    }
  }
}
