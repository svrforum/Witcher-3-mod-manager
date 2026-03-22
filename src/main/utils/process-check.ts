import { execFileSync } from 'child_process'

export function isWitcherRunning(): boolean {
  try {
    const result = execFileSync('tasklist', ['/FI', 'IMAGENAME eq witcher3.exe', '/NH'], { encoding: 'utf-8' })
    return result.includes('witcher3.exe')
  } catch {
    return false
  }
}
