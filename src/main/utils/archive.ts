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
    const { execFile } = require('child_process')
    // Get 7za binary path from 7zip-bin, fix asar path for packaged app
    let bin7z: string = require('7zip-bin').path7za
    bin7z = bin7z.replace('app.asar', 'app.asar.unpacked')
    await new Promise<void>((resolve, reject) => {
      execFile(bin7z, ['x', archivePath, `-o${destDir}`, '-y'], (err: Error | null) => {
        if (err) reject(new Error(`Failed to extract .7z: ${err.message}`))
        else resolve()
      })
    })
  } else {
    throw new Error(`Unsupported archive format: ${ext}. Supported: .zip, .rar, .7z`)
  }
}
