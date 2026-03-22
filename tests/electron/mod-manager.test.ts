import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { ModDatabase, scanModScripts, applyLoadOrder } from '../../src/main/modules/mod-manager'

let tempDirs: string[] = []

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'w3mod-test-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore cleanup errors */
    }
  }
  tempDirs = []
})

describe('ModDatabase', () => {
  it('starts empty when no file exists', () => {
    const dir = makeTempDir()
    const db = new ModDatabase(join(dir, 'mods.json'))
    expect(db.getAll()).toEqual([])
  })

  it('adds a mod and persists to disk', () => {
    const dir = makeTempDir()
    const dbPath = join(dir, 'mods.json')
    const db = new ModDatabase(dbPath)

    db.add({
      id: 'test-mod-1',
      name: 'Test Mod',
      version: '1.0',
      enabled: true,
      loadOrder: 0,
      installedAt: new Date().toISOString(),
      modifiedScripts: [],
    })

    expect(db.getAll()).toHaveLength(1)
    expect(db.getById('test-mod-1')).toBeDefined()
    expect(db.getById('test-mod-1')!.name).toBe('Test Mod')

    // Verify persistence
    const raw = JSON.parse(readFileSync(dbPath, 'utf-8'))
    expect(raw).toHaveLength(1)
    expect(raw[0].id).toBe('test-mod-1')
  })

  it('removes a mod', () => {
    const dir = makeTempDir()
    const db = new ModDatabase(join(dir, 'mods.json'))

    db.add({
      id: 'mod-a',
      name: 'Mod A',
      version: '1.0',
      enabled: true,
      loadOrder: 0,
      installedAt: new Date().toISOString(),
      modifiedScripts: [],
    })

    db.add({
      id: 'mod-b',
      name: 'Mod B',
      version: '1.0',
      enabled: true,
      loadOrder: 1,
      installedAt: new Date().toISOString(),
      modifiedScripts: [],
    })

    db.remove('mod-a')
    expect(db.getAll()).toHaveLength(1)
    expect(db.getById('mod-a')).toBeUndefined()
    expect(db.getById('mod-b')).toBeDefined()
  })

  it('updates a mod', () => {
    const dir = makeTempDir()
    const db = new ModDatabase(join(dir, 'mods.json'))

    db.add({
      id: 'mod-1',
      name: 'Original',
      version: '1.0',
      enabled: true,
      loadOrder: 0,
      installedAt: new Date().toISOString(),
      modifiedScripts: [],
    })

    db.update('mod-1', { name: 'Updated', enabled: false })
    const mod = db.getById('mod-1')
    expect(mod!.name).toBe('Updated')
    expect(mod!.enabled).toBe(false)
  })

  it('loads from existing file on construction', () => {
    const dir = makeTempDir()
    const dbPath = join(dir, 'mods.json')

    const data = [
      {
        id: 'persisted-mod',
        name: 'Persisted',
        version: '2.0',
        enabled: true,
        loadOrder: 0,
        installedAt: '2025-01-01T00:00:00.000Z',
        modifiedScripts: ['script.ws'],
      },
    ]
    writeFileSync(dbPath, JSON.stringify(data))

    const db = new ModDatabase(dbPath)
    expect(db.getAll()).toHaveLength(1)
    expect(db.getById('persisted-mod')!.name).toBe('Persisted')
  })

  it('updateAll replaces all mods', () => {
    const dir = makeTempDir()
    const db = new ModDatabase(join(dir, 'mods.json'))

    db.add({
      id: 'old',
      name: 'Old',
      version: '1.0',
      enabled: true,
      loadOrder: 0,
      installedAt: new Date().toISOString(),
      modifiedScripts: [],
    })

    const newMods = [
      {
        id: 'new-1',
        name: 'New 1',
        version: '1.0',
        enabled: true,
        loadOrder: 0,
        installedAt: new Date().toISOString(),
        modifiedScripts: [],
      },
      {
        id: 'new-2',
        name: 'New 2',
        version: '1.0',
        enabled: true,
        loadOrder: 1,
        installedAt: new Date().toISOString(),
        modifiedScripts: [],
      },
    ]

    db.updateAll(newMods)
    expect(db.getAll()).toHaveLength(2)
    expect(db.getById('old')).toBeUndefined()
    expect(db.getById('new-1')).toBeDefined()
  })
})

describe('scanModScripts', () => {
  it('finds .ws files recursively', () => {
    const dir = makeTempDir()
    const modFolder = join(dir, 'modTest')
    mkdirSync(join(modFolder, 'content', 'scripts', 'game'), { recursive: true })
    writeFileSync(join(modFolder, 'content', 'scripts', 'game', 'player.ws'), '// ws')
    writeFileSync(join(modFolder, 'content', 'scripts', 'npc.ws'), '// ws')
    writeFileSync(join(modFolder, 'content', 'readme.txt'), 'readme')

    const scripts = scanModScripts(modFolder)
    expect(scripts).toHaveLength(2)
    expect(scripts).toContain(join('content', 'scripts', 'game', 'player.ws'))
    expect(scripts).toContain(join('content', 'scripts', 'npc.ws'))
  })

  it('returns empty array for folder with no .ws files', () => {
    const dir = makeTempDir()
    const modFolder = join(dir, 'modEmpty')
    mkdirSync(modFolder, { recursive: true })
    writeFileSync(join(modFolder, 'readme.txt'), 'readme')

    const scripts = scanModScripts(modFolder)
    expect(scripts).toEqual([])
  })
})

describe('applyLoadOrder', () => {
  it('renames mod folders with numeric prefixes', () => {
    const dir = makeTempDir()
    const modsDir = join(dir, 'Mods')
    mkdirSync(modsDir)

    // Create some mod folders
    mkdirSync(join(modsDir, 'modCombatOverhaul'))
    writeFileSync(join(modsDir, 'modCombatOverhaul', 'marker.txt'), 'combat')
    mkdirSync(join(modsDir, 'modBetterUI'))
    writeFileSync(join(modsDir, 'modBetterUI', 'marker.txt'), 'ui')
    mkdirSync(join(modsDir, 'modGraphics'))
    writeFileSync(join(modsDir, 'modGraphics', 'marker.txt'), 'graphics')

    // Order: Graphics first, then Combat, then BetterUI
    const order = ['modGraphics', 'modCombatOverhaul', 'modBetterUI']
    applyLoadOrder(modsDir, order)

    const entries = readdirSync(modsDir).sort()
    expect(entries).toEqual([
      'mod0000_Graphics',
      'mod0001_CombatOverhaul',
      'mod0002_BetterUI',
    ])

    // Verify contents were preserved
    expect(readFileSync(join(modsDir, 'mod0000_Graphics', 'marker.txt'), 'utf-8')).toBe('graphics')
    expect(readFileSync(join(modsDir, 'mod0001_CombatOverhaul', 'marker.txt'), 'utf-8')).toBe('combat')
    expect(readFileSync(join(modsDir, 'mod0002_BetterUI', 'marker.txt'), 'utf-8')).toBe('ui')
  })

  it('handles already-prefixed mod names', () => {
    const dir = makeTempDir()
    const modsDir = join(dir, 'Mods')
    mkdirSync(modsDir)

    mkdirSync(join(modsDir, 'mod0001_Alpha'))
    writeFileSync(join(modsDir, 'mod0001_Alpha', 'a.txt'), 'a')
    mkdirSync(join(modsDir, 'mod0000_Beta'))
    writeFileSync(join(modsDir, 'mod0000_Beta', 'b.txt'), 'b')

    // Reverse order
    const order = ['mod0000_Beta', 'mod0001_Alpha']
    applyLoadOrder(modsDir, order)

    const entries = readdirSync(modsDir).sort()
    expect(entries).toEqual(['mod0000_Beta', 'mod0001_Alpha'])
  })
})
