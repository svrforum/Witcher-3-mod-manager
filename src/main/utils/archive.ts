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
    const files = [...extracted.files]
    if (files.length === 0) {
      throw new Error('Failed to extract RAR archive — no files found')
    }
  } else if (ext === '.7z') {
    const sevenZip = require('7zip-min')
    await new Promise<void>((resolve, reject) => {
      sevenZip.unpack(archivePath, destDir, (err: Error | null) => {
        if (err) reject(new Error(`Failed to extract .7z: ${err.message}`))
        else resolve()
      })
    })
  } else {
    throw new Error(`Unsupported archive format: ${ext}. Supported: .zip, .rar, .7z`)
  }
}
