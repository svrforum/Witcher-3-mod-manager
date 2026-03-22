import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { logger } from './logger'

export interface AppConfig {
  gamePath: string
  gameVersion: 'nextgen' | 'classic'
  platform: 'steam' | 'gog' | 'epic' | 'manual'
  nexusApiKey?: string
  language: 'ko' | 'en'
}

const CONFIG_DIR = join(app.getPath('userData'))
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: AppConfig = {
  gamePath: '',
  gameVersion: 'nextgen',
  platform: 'manual',
  language: 'ko',
}

export function loadConfig(): AppConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch (e) {
    logger.error('config', 'Failed to load config', { error: String(e) })
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: AppConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}
