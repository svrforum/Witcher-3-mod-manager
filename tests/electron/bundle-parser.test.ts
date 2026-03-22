import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import {
  parseBundleHeader,
  parseBundleEntries,
  findScriptEntries,
  findLooseVanillaScripts,
  readVanillaScript,
} from '../../src/main/modules/bundle-parser'

let tempDirs: string[] = []

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'w3bundle-test-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
  tempDirs = []
})

/**
 * Build a mock W3 bundle in memory with the given file entries.
 * Each entry: { path, content }
 */
function buildMockBundle(files: Array<{ path: string; content: string }>): Buffer {
  // Build entries and data sections
  const entryBuffers: Buffer[] = []
  const dataBuffers: Buffer[] = []
  let currentDataOffset = 0 // we'll fix this after computing header + entries size

  const entryMetas: Array<{ pathBuf: Buffer; dataSize: number; dataOffset: number }> = []

  for (const file of files) {
    const contentBuf = Buffer.from(file.content, 'utf-8')
    const pathBuf = Buffer.from(file.path, 'utf-8')

    entryMetas.push({
      pathBuf,
      dataSize: contentBuf.length,
      dataOffset: currentDataOffset, // relative, will be adjusted
    })
    dataBuffers.push(contentBuf)
    currentDataOffset += contentBuf.length
  }

  // Calculate entries section size
  let entriesSize = 0
  for (const meta of entryMetas) {
    // path (null-terminated) + hash(16) + empty(4) + dataSize(4) + compressedSize(4) + dataOffset(8)
    entriesSize += meta.pathBuf.length + 1 + 16 + 4 + 4 + 4 + 8
  }

  const headerSize = 20 // 8 magic + 4 bundleSize + 4 dummy + 4 fileCount
  const dataStart = headerSize + entriesSize

  // Build header
  const header = Buffer.alloc(headerSize)
  header.write('POTATO70', 0, 8, 'ascii')
  header.writeUInt32LE(dataStart + currentDataOffset, 8) // bundle size
  header.writeUInt32LE(0, 12) // dummy
  header.writeUInt32LE(files.length, 16) // file count

  // Build entry section
  const entries = Buffer.alloc(entriesSize)
  let offset = 0
  for (const meta of entryMetas) {
    // path (null-terminated)
    meta.pathBuf.copy(entries, offset)
    offset += meta.pathBuf.length
    entries[offset] = 0 // null terminator
    offset += 1

    // hash (16 bytes of zeros)
    offset += 16

    // empty (4 bytes)
    offset += 4

    // data size
    entries.writeUInt32LE(meta.dataSize, offset)
    offset += 4

    // compressed size (same as data size = uncompressed)
    entries.writeUInt32LE(meta.dataSize, offset)
    offset += 4

    // data offset (64-bit LE)
    const absOffset = dataStart + meta.dataOffset
    entries.writeUInt32LE(absOffset & 0xffffffff, offset)
    entries.writeUInt32LE(Math.floor(absOffset / 0x100000000), offset + 4)
    offset += 8
  }

  return Buffer.concat([header, entries, ...dataBuffers])
}

describe('Bundle Parser', () => {
  describe('parseBundleHeader', () => {
    it('parses valid POTATO70 header', () => {
      const bundle = buildMockBundle([{ path: 'test.ws', content: 'hello' }])
      const header = parseBundleHeader(bundle)
      expect(header).not.toBeNull()
      expect(header!.magic).toBe('POTATO70')
      expect(header!.fileCount).toBe(1)
    })

    it('returns null for invalid magic', () => {
      const buf = Buffer.alloc(20)
      buf.write('INVALID!', 0, 8, 'ascii')
      expect(parseBundleHeader(buf)).toBeNull()
    })

    it('returns null for too-short buffer', () => {
      const buf = Buffer.alloc(10)
      buf.write('POTATO70', 0, 8, 'ascii')
      expect(parseBundleHeader(buf)).toBeNull()
    })
  })

  describe('parseBundleEntries', () => {
    it('parses entries from a mock bundle', () => {
      const bundle = buildMockBundle([
        { path: 'scripts/game/player.ws', content: 'class CPlayer {}' },
        { path: 'scripts/game/npc.ws', content: 'class CNPC {}' },
        { path: 'data/texture.dds', content: 'binary_data' },
      ])

      const header = parseBundleHeader(bundle)!
      const entries = parseBundleEntries(bundle, header.fileCount)

      expect(entries).toHaveLength(3)
      expect(entries[0].path).toBe('scripts/game/player.ws')
      expect(entries[1].path).toBe('scripts/game/npc.ws')
      expect(entries[2].path).toBe('data/texture.dds')
      expect(entries[0].dataSize).toBe(Buffer.from('class CPlayer {}').length)
    })
  })

  describe('findScriptEntries', () => {
    it('filters only .ws files', () => {
      const bundle = buildMockBundle([
        { path: 'scripts/game/player.ws', content: 'class CPlayer {}' },
        { path: 'data/texture.dds', content: 'binary' },
        { path: 'scripts/engine/base.ws', content: 'class CBase {}' },
      ])

      const header = parseBundleHeader(bundle)!
      const entries = parseBundleEntries(bundle, header.fileCount)
      const scripts = findScriptEntries({ header, entries })

      expect(scripts).toHaveLength(2)
      expect(scripts[0].path).toBe('scripts/game/player.ws')
      expect(scripts[1].path).toBe('scripts/engine/base.ws')
    })
  })

  describe('findLooseVanillaScripts', () => {
    it('finds .ws files in content/content0/scripts/', () => {
      const dir = makeTempDir()
      const scriptsDir = join(dir, 'content', 'content0', 'scripts', 'game')
      mkdirSync(scriptsDir, { recursive: true })
      writeFileSync(join(scriptsDir, 'player.ws'), 'class CPlayer {}')
      writeFileSync(join(scriptsDir, 'npc.ws'), 'class CNPC {}')

      const scripts = findLooseVanillaScripts(dir)
      expect(scripts.size).toBe(2)
      expect(scripts.has(join('game', 'player.ws'))).toBe(true)
      expect(scripts.has(join('game', 'npc.ws'))).toBe(true)
    })

    it('returns empty map when no scripts exist', () => {
      const dir = makeTempDir()
      const scripts = findLooseVanillaScripts(dir)
      expect(scripts.size).toBe(0)
    })
  })

  describe('readVanillaScript', () => {
    it('reads a loose vanilla script by relative path', () => {
      const dir = makeTempDir()
      const scriptsDir = join(dir, 'content', 'content0', 'scripts', 'game')
      mkdirSync(scriptsDir, { recursive: true })
      writeFileSync(join(scriptsDir, 'player.ws'), 'class CPlayer {}')

      const content = readVanillaScript(dir, join('game', 'player.ws'))
      expect(content).toBe('class CPlayer {}')
    })

    it('returns null for non-existent script', () => {
      const dir = makeTempDir()
      const content = readVanillaScript(dir, 'nonexistent.ws')
      expect(content).toBeNull()
    })
  })
})
