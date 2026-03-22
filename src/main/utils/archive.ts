import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

function get7zPath(): string {
  const bundled = join(__dirname, '../../resources/7z/7za.exe')
  if (existsSync(bundled)) return bundled
  return '7z'
}

export function extractArchive(archivePath: string, destDir: string): void {
  const sevenZip = get7zPath()
  execFileSync(sevenZip, ['x', archivePath, `-o${destDir}`, '-y'], {
    encoding: 'utf-8',
    windowsHide: true,
  })
}
