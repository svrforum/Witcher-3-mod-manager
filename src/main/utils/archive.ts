import { existsSync, mkdirSync } from 'fs'
import { extname } from 'path'
import AdmZip from 'adm-zip'

export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const ext = extname(archivePath).toLowerCase()

  if (ext === '.zip') {
    const zip = new AdmZip(archivePath)
    zip.extractAllTo(destDir, true)
  } else if (ext === '.rar') {
    const { createExtractorFromFile } = require('node-unrar-js')
    const extractor = await createExtractorFromFile({
      filepath: archivePath,
      targetPath: destDir,
    })
    const extracted = extractor.extract()
    // Consume the generator to trigger extraction
    const files = [...extracted.files]
    if (files.length === 0) {
      throw new Error('Failed to extract RAR archive — no files found')
    }
  } else if (ext === '.7z') {
    const { execFileSync } = require('child_process')
    try {
      execFileSync('7z', ['x', archivePath, `-o${destDir}`, '-y'], {
        encoding: 'utf-8',
        windowsHide: true,
      })
    } catch {
      throw new Error('7z not found. Please install 7-Zip to extract .7z files, or use .zip/.rar format.')
    }
  } else {
    throw new Error(`Unsupported archive format: ${ext}. Supported: .zip, .rar, .7z`)
  }
}
