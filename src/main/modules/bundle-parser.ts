import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, relative } from 'path'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BundleEntry {
  path: string
  dataOffset: number
  dataSize: number
  compressedSize: number
}

export interface BundleHeader {
  magic: string
  bundleSize: number
  fileCount: number
}

export interface ParsedBundle {
  header: BundleHeader
  entries: BundleEntry[]
}

// ─── W3 Bundle Constants ─────────────────────────────────────────────────────

const BUNDLE_MAGIC = 'POTATO70'
const HEADER_SIZE = 20 // 8 magic + 4 bundleSize + 4 dummy + 4 fileCount

// ─── Bundle Parser ───────────────────────────────────────────────────────────

/**
 * Parse the header of a W3 .bundle file.
 * Layout: magic (8 bytes) | bundle size (uint32 LE) | dummy (uint32 LE) | file count (uint32 LE)
 */
export function parseBundleHeader(buffer: Buffer): BundleHeader | null {
  if (buffer.length < HEADER_SIZE) return null

  const magic = buffer.subarray(0, 8).toString('ascii')
  if (magic !== BUNDLE_MAGIC) return null

  const bundleSize = buffer.readUInt32LE(8)
  // bytes 12-15 are dummy/padding
  const fileCount = buffer.readUInt32LE(16)

  return { magic, bundleSize, fileCount }
}

/**
 * Parse file entries from a W3 bundle buffer.
 * Each entry: null-terminated path string | hash (16 bytes) | empty (4 bytes) |
 *             data size (uint32 LE) | compressed size (uint32 LE) | data offset (uint64 LE)
 */
export function parseBundleEntries(buffer: Buffer, fileCount: number): BundleEntry[] {
  const entries: BundleEntry[] = []
  let offset = HEADER_SIZE

  for (let i = 0; i < fileCount; i++) {
    if (offset >= buffer.length) break

    // Read null-terminated string for path
    const nullIdx = buffer.indexOf(0, offset)
    if (nullIdx === -1 || nullIdx >= buffer.length) break

    const path = buffer.subarray(offset, nullIdx).toString('utf-8')
    offset = nullIdx + 1

    // hash (16 bytes) + empty (4 bytes) + dataSize (4) + compressedSize (4) + dataOffset (8)
    const entryMetaSize = 16 + 4 + 4 + 4 + 8
    if (offset + entryMetaSize > buffer.length) break

    offset += 16 // skip hash
    offset += 4  // skip empty

    const dataSize = buffer.readUInt32LE(offset)
    offset += 4

    const compressedSize = buffer.readUInt32LE(offset)
    offset += 4

    // Read 64-bit offset as two 32-bit parts (low + high)
    const dataOffsetLow = buffer.readUInt32LE(offset)
    const dataOffsetHigh = buffer.readUInt32LE(offset + 4)
    const dataOffset = dataOffsetLow + dataOffsetHigh * 0x100000000
    offset += 8

    entries.push({ path, dataOffset, dataSize, compressedSize })
  }

  return entries
}

/**
 * Parse a .bundle file and return header + entries.
 */
export function parseBundle(filePath: string): ParsedBundle | null {
  try {
    const buffer = readFileSync(filePath)
    const header = parseBundleHeader(buffer)
    if (!header) return null

    const entries = parseBundleEntries(buffer, header.fileCount)
    return { header, entries }
  } catch {
    return null
  }
}

/**
 * Extract a specific entry's raw data from a bundle file.
 * Note: W3 bundles may use compression (LZ4, zlib, etc).
 * When compressedSize === dataSize, data is stored uncompressed.
 * For compressed data, this returns the raw compressed bytes.
 */
export function extractEntryData(filePath: string, entry: BundleEntry): Buffer | null {
  try {
    const fd = readFileSync(filePath)
    const readSize = entry.compressedSize > 0 ? entry.compressedSize : entry.dataSize
    if (entry.dataOffset + readSize > fd.length) return null
    return fd.subarray(entry.dataOffset, entry.dataOffset + readSize)
  } catch {
    return null
  }
}

/**
 * Find all .ws script entries in a bundle.
 */
export function findScriptEntries(bundle: ParsedBundle): BundleEntry[] {
  return bundle.entries.filter((e) => e.path.endsWith('.ws'))
}

// ─── Fallback: Loose Script Scanner ──────────────────────────────────────────

/**
 * Many Witcher 3 installations (especially modded ones) have vanilla scripts
 * extracted as loose files under content0/scripts/ or content/scripts/.
 * This fallback scans for those when bundle parsing is not feasible.
 */
export function findLooseVanillaScripts(gamePath: string): Map<string, string> {
  const scripts = new Map<string, string>()

  // Common locations for loose vanilla scripts
  const searchDirs = [
    join(gamePath, 'content', 'content0', 'scripts'),
    join(gamePath, 'content', 'scripts'),
    join(gamePath, 'content0', 'scripts'),
  ]

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue
    walkForScripts(dir, dir, scripts)
    if (scripts.size > 0) break // use the first directory that has scripts
  }

  return scripts
}

function walkForScripts(baseDir: string, dir: string, results: Map<string, string>): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        walkForScripts(baseDir, fullPath, results)
      } else if (entry.name.endsWith('.ws')) {
        const relPath = relative(baseDir, fullPath)
        results.set(relPath, fullPath)
      }
    }
  } catch {
    // ignore permission errors, etc.
  }
}

/**
 * Read a vanilla script by relative path, trying bundles first then loose files.
 * Returns the script content as a string, or null if not found.
 */
export function readVanillaScript(
  gamePath: string,
  scriptRelPath: string
): string | null {
  // Try loose files first (more reliable)
  const looseDirs = [
    join(gamePath, 'content', 'content0', 'scripts'),
    join(gamePath, 'content', 'scripts'),
    join(gamePath, 'content0', 'scripts'),
  ]

  for (const dir of looseDirs) {
    const fullPath = join(dir, scriptRelPath)
    if (existsSync(fullPath)) {
      try {
        return readFileSync(fullPath, 'utf-8')
      } catch {
        continue
      }
    }
  }

  // Try bundle parsing as fallback
  const bundleDirs = [
    join(gamePath, 'content', 'content0', 'bundles'),
    join(gamePath, 'content', 'content0'),
  ]

  for (const bundleDir of bundleDirs) {
    if (!existsSync(bundleDir)) continue
    try {
      const files = readdirSync(bundleDir).filter((f) => f.endsWith('.bundle'))
      for (const file of files) {
        const bundlePath = join(bundleDir, file)
        const parsed = parseBundle(bundlePath)
        if (!parsed) continue

        const entry = parsed.entries.find(
          (e) => e.path.replace(/\\/g, '/').endsWith(scriptRelPath.replace(/\\/g, '/'))
        )
        if (!entry) continue

        // Only try uncompressed entries
        if (entry.compressedSize === entry.dataSize || entry.compressedSize === 0) {
          const data = extractEntryData(bundlePath, entry)
          if (data) return data.toString('utf-8')
        }
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Scan all bundles in the game's content directory and list .ws script paths.
 */
export function listBundleScripts(gamePath: string): string[] {
  const scriptPaths = new Set<string>()

  const bundleDirs = [
    join(gamePath, 'content', 'content0', 'bundles'),
    join(gamePath, 'content', 'content0'),
  ]

  for (const bundleDir of bundleDirs) {
    if (!existsSync(bundleDir)) continue
    try {
      const files = readdirSync(bundleDir).filter((f) => f.endsWith('.bundle'))
      for (const file of files) {
        const parsed = parseBundle(join(bundleDir, file))
        if (!parsed) continue
        for (const entry of findScriptEntries(parsed)) {
          scriptPaths.add(entry.path.replace(/\\/g, '/'))
        }
      }
    } catch {
      continue
    }
  }

  return Array.from(scriptPaths)
}
