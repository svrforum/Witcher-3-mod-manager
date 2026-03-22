import { app } from 'electron'
import { join } from 'path'
import { appendFileSync, mkdirSync, existsSync } from 'fs'

class Logger {
  private logDir: string

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getLogPath(): string {
    const date = new Date().toISOString().split('T')[0]
    return join(this.logDir, `${date}.log`)
  }

  private write(level: string, module: string, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString()
    const line = JSON.stringify({ timestamp, level, module, message, ...meta })
    appendFileSync(this.getLogPath(), line + '\n')
  }

  info(module: string, message: string, meta?: Record<string, unknown>): void {
    this.write('INFO', module, message, meta)
  }

  error(module: string, message: string, meta?: Record<string, unknown>): void {
    this.write('ERROR', module, message, meta)
  }

  warn(module: string, message: string, meta?: Record<string, unknown>): void {
    this.write('WARN', module, message, meta)
  }
}

export const logger = new Logger()
