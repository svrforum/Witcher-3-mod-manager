# Witcher 3 Mod Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows Electron app that lets users install, manage, and merge Witcher 3 mods with a Witcher-themed dark UI.

**Architecture:** Electron main process handles all file I/O (mod install, script merge, game detection) via IPC. React renderer shows the UI. Zustand for state. Local JSON files for persistence.

**Tech Stack:** Electron + electron-vite + React + TypeScript + Tailwind CSS + shadcn/ui + Zustand + react-i18next + node-diff3 + node-7z + electron-builder

---

## File Map

### Electron Main Process

| File | Responsibility |
|------|---------------|
| `electron/main.ts` | Electron entry point, window creation, IPC handler registration |
| `electron/preload.ts` | Context bridge exposing IPC API to renderer |
| `electron/modules/game-detector.ts` | Steam/GOG/Epic path detection, version detection |
| `electron/modules/mod-manager.ts` | Install, remove, enable/disable, load order |
| `electron/modules/script-merger.ts` | Conflict detection, 3-way merge, vanilla script cache |
| `electron/modules/bundle-parser.ts` | W3 .bundle file parser for vanilla script extraction |
| `electron/modules/nexus-client.ts` | Nexus Mods API v2 client |
| `electron/modules/preset-manager.ts` | Preset CRUD, import/export |
| `electron/modules/operation-queue.ts` | Serial operation queue for file operations |
| `electron/modules/logger.ts` | Structured logging with daily rotation |
| `electron/modules/config-manager.ts` | App config load/save |
| `electron/utils/registry.ts` | Windows registry reader (uses execFile, not exec) |
| `electron/utils/archive.ts` | Archive extraction (zip/rar/7z via execFile) |
| `electron/utils/process-check.ts` | Check if witcher3.exe is running (uses execFile) |
| `electron/ipc-handlers.ts` | All IPC handler registrations in one place |

### Renderer (React)

| File | Responsibility |
|------|---------------|
| `src/App.tsx` | Root component, router, layout |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/components/layout/MainContent.tsx` | Content area wrapper |
| `src/components/layout/TitleBar.tsx` | Custom frameless title bar |
| `src/components/layout/Toast.tsx` | Toast notification system |
| `src/components/mods/ModList.tsx` | Installed mods list with drag-and-drop |
| `src/components/mods/ModCard.tsx` | Single mod row (name, version, status, toggle) |
| `src/components/mods/ModInstallDialog.tsx` | File picker + install progress |
| `src/components/mods/ModContextMenu.tsx` | Right-click menu |
| `src/components/merger/ConflictList.tsx` | Script conflict overview |
| `src/components/merger/DiffView.tsx` | Side-by-side diff + manual merge editor |
| `src/components/nexus/SearchBar.tsx` | Nexus search input + category filter |
| `src/components/nexus/ModSearchResults.tsx` | Search result cards |
| `src/components/nexus/ModDetailPanel.tsx` | Mod detail view |
| `src/components/presets/PresetList.tsx` | Preset cards (built-in + custom) |
| `src/components/presets/PresetEditor.tsx` | Create/edit preset |
| `src/components/settings/SettingsPage.tsx` | All settings in one page |
| `src/components/setup/SetupWizard.tsx` | First-launch setup wizard |
| `src/stores/app-store.ts` | Global app state (config, language) |
| `src/stores/mod-store.ts` | Mod list state |
| `src/stores/merge-store.ts` | Merge/conflict state |
| `src/hooks/use-ipc.ts` | IPC call wrapper hook |
| `src/i18n/index.ts` | i18n setup |
| `src/i18n/ko.json` | Korean translations |
| `src/i18n/en.json` | English translations |
| `src/styles/globals.css` | Tailwind config + Witcher theme CSS variables |
| `src/types/global.d.ts` | Window API type declarations |

### Config & Build

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies, scripts |
| `electron-builder.yml` | NSIS installer + portable config |
| `vite.config.ts` | Vite config |
| `tailwind.config.ts` | Tailwind theme (Witcher colors) |
| `tsconfig.json` | TypeScript config |
| `tsconfig.node.json` | TypeScript config for electron main |
| `resources/icons/icon.ico` | App icon |
| `resources/presets/default-presets.json` | Built-in preset definitions |

### Tests

| File | Tests |
|------|-------|
| `tests/electron/game-detector.test.ts` | Path detection, version detection |
| `tests/electron/mod-manager.test.ts` | Install, remove, enable/disable, load order |
| `tests/electron/script-merger.test.ts` | Conflict detection, 3-way merge |
| `tests/electron/bundle-parser.test.ts` | Bundle file parsing |
| `tests/electron/nexus-client.test.ts` | API calls |
| `tests/electron/preset-manager.test.ts` | Preset CRUD, import/export |
| `tests/electron/operation-queue.test.ts` | Queue serialization |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `electron-builder.yml`, `electron/main.ts`, `electron/preload.ts`, `src/App.tsx`, `src/styles/globals.css`, `src/main.tsx`, `index.html`

- [ ] **Step 1: Initialize project with electron-vite**

```bash
npm create @quick-start/electron witcher3-mod-manager -- --template react-ts
```

Move generated files into our repo root if needed. This scaffolds the basic Electron + React + TypeScript + Vite setup.

- [ ] **Step 2: Install core dependencies**

```bash
npm install zustand react-i18next i18next @dnd-kit/core @dnd-kit/sortable electron-updater
npm install -D tailwindcss @tailwindcss/vite autoprefixer vitest
npx shadcn-ui@latest init
```

Verify `.gitignore` includes `node_modules/`, `dist/`, `.env*`.

- [ ] **Step 3: Configure Tailwind v4 with Witcher theme**

Use Tailwind v4 CSS-first config (no `tailwind.config.ts` needed).

In `src/styles/globals.css`:
```css
@import 'tailwindcss';

@theme {
  --color-witcher-bg: #0f0f0f;
  --color-witcher-surface: #1a1a1a;
  --color-witcher-card: #242424;
  --color-witcher-gold: #c4a135;
  --color-witcher-gold-light: #d4b545;
  --color-witcher-gold-dark: #a38225;
  --color-witcher-red: #8b2020;
  --color-witcher-red-light: #a83030;
  --color-witcher-text: #e8e8e8;
  --color-witcher-text-muted: #888888;
  --color-witcher-border: #333333;
  --font-sans: 'Pretendard', 'Inter', sans-serif;
}

body {
  @apply bg-witcher-bg text-witcher-text font-sans m-0 overflow-hidden select-none;
}
```

- [ ] **Step 3b: Create global type declarations**

Create `src/types/global.d.ts`:
```typescript
interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface ElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<IpcResult<T>>
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
```

- [ ] **Step 4: Set up basic Electron main with window**

In `electron/main.ts`:
```typescript
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
```

- [ ] **Step 5: Set up preload bridge**

In `electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<{ success: boolean; data?: T; error?: string }> =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener(channel, callback)
  },
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
}

contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 6: Set up basic App.tsx with placeholder layout**

```tsx
function App(): JSX.Element {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-witcher-surface border-r border-witcher-border flex flex-col">
        <div className="p-4 text-witcher-gold font-bold text-lg">W3 Mod Manager</div>
      </aside>
      <main className="flex-1 bg-witcher-bg p-6">
        <h1 className="text-2xl text-witcher-text">Welcome</h1>
      </main>
    </div>
  )
}
export default App
```

- [ ] **Step 7: Verify the app launches**

```bash
npm run dev
```

Expected: Electron window opens with dark background, gold title text, sidebar + main area visible.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Initialize Electron + React + Tailwind project with Witcher theme"
```

---

## Task 2: IPC Infrastructure & Operation Queue

**Files:**
- Create: `electron/modules/operation-queue.ts`, `electron/modules/logger.ts`, `electron/ipc-handlers.ts`, `electron/utils/process-check.ts`, `src/hooks/use-ipc.ts`
- Test: `tests/electron/operation-queue.test.ts`

- [ ] **Step 1: Write failing test for operation queue**

Create `tests/electron/operation-queue.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { OperationQueue } from '../../electron/modules/operation-queue'

describe('OperationQueue', () => {
  it('executes operations serially', async () => {
    const queue = new OperationQueue()
    const order: number[] = []

    const op1 = queue.enqueue(async () => {
      await new Promise(r => setTimeout(r, 50))
      order.push(1)
      return 'a'
    })
    const op2 = queue.enqueue(async () => {
      order.push(2)
      return 'b'
    })

    const [r1, r2] = await Promise.all([op1, op2])
    expect(order).toEqual([1, 2])
    expect(r1).toBe('a')
    expect(r2).toBe('b')
  })

  it('continues after a failed operation', async () => {
    const queue = new OperationQueue()
    const op1 = queue.enqueue(async () => { throw new Error('fail') })
    const op2 = queue.enqueue(async () => 'ok')

    await expect(op1).rejects.toThrow('fail')
    expect(await op2).toBe('ok')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/electron/operation-queue.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement operation queue**

Create `electron/modules/operation-queue.ts`:
```typescript
export class OperationQueue {
  private queue: Promise<unknown> = Promise.resolve()

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(
      () => operation(),
      () => operation()
    )
    this.queue = result.then(() => {}, () => {})
    return result
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/electron/operation-queue.test.ts
```
Expected: PASS

- [ ] **Step 5: Implement logger**

Create `electron/modules/logger.ts`:
```typescript
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
```

- [ ] **Step 6: Implement process check utility**

Create `electron/utils/process-check.ts`:
```typescript
import { execFileSync } from 'child_process'

export function isWitcherRunning(): boolean {
  try {
    const result = execFileSync('tasklist', ['/FI', 'IMAGENAME eq witcher3.exe', '/NH'], { encoding: 'utf-8' })
    return result.includes('witcher3.exe')
  } catch {
    return false
  }
}
```

- [ ] **Step 7: Create IPC handler registration**

Create `electron/ipc-handlers.ts`:
```typescript
import { ipcMain, BrowserWindow } from 'electron'

export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}
```

- [ ] **Step 8: Create useIpc hook for renderer**

Create `src/hooks/use-ipc.ts`:
```typescript
import { useCallback } from 'react'

export function useIpc() {
  const invoke = useCallback(async <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    const result = await window.api.invoke<T>(channel, ...args)
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
    return result.data as T
  }, [])

  return { invoke }
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add IPC infrastructure, operation queue, logger, and process check"
```

---

## Task 3: Game Detector

**Files:**
- Create: `electron/modules/game-detector.ts`, `electron/utils/registry.ts`
- Test: `tests/electron/game-detector.test.ts`

- [ ] **Step 1: Write failing test for game detector**

Create `tests/electron/game-detector.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { parseLibraryFolders, findWitcherInLibrary, detectGameVersion } from '../../electron/modules/game-detector'

describe('parseLibraryFolders', () => {
  it('parses Steam libraryfolders.vdf format', () => {
    const vdf = `
"libraryfolders"
{
  "0"
  {
    "path"    "C:\\\\Program Files (x86)\\\\Steam"
    "apps"
    {
      "292030"    "0"
    }
  }
  "1"
  {
    "path"    "D:\\\\SteamLibrary"
    "apps"
    {
      "292030"    "0"
    }
  }
}`
    const folders = parseLibraryFolders(vdf)
    expect(folders).toEqual([
      'C:\\Program Files (x86)\\Steam',
      'D:\\SteamLibrary',
    ])
  })
})

describe('findWitcherInLibrary', () => {
  it('returns path when witcher3.exe exists', () => {
    const mockExistsSync = vi.fn((p: string) =>
      p.includes('The Witcher 3') && p.includes('witcher3.exe')
    )
    const result = findWitcherInLibrary('D:\\SteamLibrary', mockExistsSync)
    expect(result).toBe('D:\\SteamLibrary\\steamapps\\common\\The Witcher 3')
  })

  it('returns null when game not found', () => {
    const mockExistsSync = vi.fn(() => false)
    const result = findWitcherInLibrary('D:\\SteamLibrary', mockExistsSync)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/electron/game-detector.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement registry utility**

Create `electron/utils/registry.ts`:
```typescript
import { execFileSync } from 'child_process'

export function readRegistryValue(keyPath: string, valueName: string): string | null {
  try {
    const result = execFileSync('reg', ['query', keyPath, '/v', valueName], { encoding: 'utf-8' })
    const match = result.match(/REG_SZ\s+(.+)/)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Implement game detector**

Create `electron/modules/game-detector.ts`:
```typescript
import { join } from 'path'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { readRegistryValue } from '../utils/registry'
import { logger } from './logger'

export interface GameInfo {
  gamePath: string
  gameVersion: 'nextgen' | 'classic'
  platform: 'steam' | 'gog' | 'epic' | 'manual'
}

export function parseLibraryFolders(vdfContent: string): string[] {
  const paths: string[] = []
  const pathRegex = /"path"\s+"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = pathRegex.exec(vdfContent)) !== null) {
    paths.push(match[1].replace(/\\\\/g, '\\'))
  }
  return paths
}

export function findWitcherInLibrary(
  libraryPath: string,
  existsCheck: (p: string) => boolean = existsSync
): string | null {
  const gamePath = join(libraryPath, 'steamapps', 'common', 'The Witcher 3')
  if (existsCheck(join(gamePath, 'bin', 'x64', 'witcher3.exe')) ||
      existsCheck(join(gamePath, 'bin', 'x64_dx12', 'witcher3.exe'))) {
    return gamePath
  }
  return null
}

export function detectGameVersion(gamePath: string): 'nextgen' | 'classic' {
  if (existsSync(join(gamePath, 'bin', 'x64_dx12'))) return 'nextgen'
  return 'classic'
}

function detectSteam(): GameInfo | null {
  logger.info('game-detector', 'Checking Steam...')
  const steamPath = readRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath')
  if (!steamPath) return null

  const vdfPath = join(steamPath, 'steamapps', 'libraryfolders.vdf')
  if (!existsSync(vdfPath)) return null

  const vdfContent = readFileSync(vdfPath, 'utf-8')
  const libraries = parseLibraryFolders(vdfContent)

  for (const lib of libraries) {
    const gamePath = findWitcherInLibrary(lib)
    if (gamePath) {
      return { gamePath, gameVersion: detectGameVersion(gamePath), platform: 'steam' }
    }
  }
  return null
}

function detectGOG(): GameInfo | null {
  logger.info('game-detector', 'Checking GOG...')
  const gogPath = readRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1495134320', 'path')
  if (!gogPath || !existsSync(gogPath)) return null
  return { gamePath: gogPath, gameVersion: detectGameVersion(gogPath), platform: 'gog' }
}

function detectEpic(): GameInfo | null {
  logger.info('game-detector', 'Checking Epic...')
  const manifestDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests'
  if (!existsSync(manifestDir)) return null

  try {
    const files = readdirSync(manifestDir).filter(f => f.endsWith('.item'))
    for (const file of files) {
      const content = readFileSync(join(manifestDir, file), 'utf-8')
      const manifest = JSON.parse(content)
      if (manifest.DisplayName?.includes('Witcher 3') && existsSync(manifest.InstallLocation)) {
        return { gamePath: manifest.InstallLocation, gameVersion: detectGameVersion(manifest.InstallLocation), platform: 'epic' }
      }
    }
  } catch { /* ignore */ }
  return null
}

export function detectGame(): GameInfo | null {
  return detectSteam() || detectGOG() || detectEpic()
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/electron/game-detector.test.ts
```
Expected: PASS

- [ ] **Step 6: Register game detector IPC handlers**

Add game:detect and game:select-manual handlers in `electron/ipc-handlers.ts`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add game detector with Steam/GOG/Epic auto-detection"
```

---

## Task 4: i18n Setup

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/ko.json`, `src/i18n/en.json`

- [ ] **Step 1: Create Korean translations**

Create `src/i18n/ko.json` with all UI string translations (sidebar, mods, merger, search, presets, settings, common).

- [ ] **Step 2: Create English translations**

Create `src/i18n/en.json` with matching keys.

- [ ] **Step 3: Set up i18n initialization**

Create `src/i18n/index.ts`:
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './ko.json'
import en from './en.json'

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: 'ko',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
```

- [ ] **Step 4: Import i18n in main.tsx**

Add `import './i18n'` at the top of `src/main.tsx`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add i18n with Korean and English translations"
```

---

## Task 5: Zustand Stores & App Config Persistence

**Files:**
- Create: `src/stores/app-store.ts`, `src/stores/mod-store.ts`, `src/stores/merge-store.ts`, `electron/modules/config-manager.ts`

- [ ] **Step 1: Implement config manager in main process**

Create `electron/modules/config-manager.ts` — loads/saves AppConfig JSON to `%APPDATA%/witcher3-mod-manager/config.json`.

- [ ] **Step 2: Create app store (Zustand)**

Create `src/stores/app-store.ts` — global state: config, currentPage, isLoading.

- [ ] **Step 3: Create mod store**

Create `src/stores/mod-store.ts` — state: mods array, isOperating flag.

- [ ] **Step 4: Create merge store**

Create `src/stores/merge-store.ts` — state: conflicts array, isMerging flag.

- [ ] **Step 5: Register config IPC handlers**

Add config:load and config:save handlers in `electron/ipc-handlers.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Zustand stores and config persistence"
```

---

## Task 6: UI Shell — Sidebar, Layout, Window Controls

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/MainContent.tsx`, `src/components/layout/TitleBar.tsx`, `src/components/layout/Toast.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create custom title bar (frameless window)**

TitleBar with app title, minimize/maximize/close buttons. Uses `window.api.windowMinimize()` etc.

- [ ] **Step 2: Create Sidebar**

Navigation with items: mods, merger, search, presets, settings. Active item highlighted with gold accent.

- [ ] **Step 3: Create MainContent router**

Renders page component based on `currentPage` from app store.

- [ ] **Step 4: Create Toast component**

Toast notification system with Zustand store. Auto-dismiss after 4s. Error/success/info variants.

- [ ] **Step 5: Wire everything together in App.tsx**

TitleBar + Sidebar + MainContent + ToastContainer.

- [ ] **Step 6: Verify the app launches with full shell**

```bash
npm run dev
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add UI shell with sidebar navigation, title bar, and toast notifications"
```

---

## Task 7: Settings Page & Initial Setup Flow

**Files:**
- Create: `src/components/settings/SettingsPage.tsx`, `src/components/setup/SetupWizard.tsx`
- Modify: `src/components/layout/MainContent.tsx`, `src/App.tsx`

- [ ] **Step 1: Create Settings page**

Settings for game path, game version, Nexus API key, language selector, open logs button.

- [ ] **Step 2: Create setup wizard for first launch**

Language selection → auto-detect game path → manual fallback. Saves config on completion.

- [ ] **Step 3: Update App.tsx to show wizard on first launch**

Load config via IPC on mount. Show SetupWizard if no gamePath. Show main app otherwise.

- [ ] **Step 4: Update MainContent to include SettingsPage**

- [ ] **Step 5: Verify setup flow works**

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add settings page and first-launch setup wizard"
```

---

## Task 8: Mod Manager Backend

**Files:**
- Create: `electron/modules/mod-manager.ts`, `electron/utils/archive.ts`
- Test: `tests/electron/mod-manager.test.ts`

- [ ] **Step 1: Write failing test for mod manager**

Test ModDatabase (add, remove, persist), scanModScripts (.ws file discovery), applyLoadOrder (numeric prefix renaming).

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/electron/mod-manager.test.ts
```

- [ ] **Step 3: Implement archive utility**

Create `electron/utils/archive.ts` — uses `execFileSync` to call 7z for extraction (not exec, to prevent injection). Bundle `7za.exe` (standalone 7-Zip console version, public domain) in `resources/7z/7za.exe`.

```typescript
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

function get7zPath(): string {
  // Bundled 7za.exe in resources (distributed with the app)
  const bundled = join(__dirname, '../../resources/7z/7za.exe')
  if (existsSync(bundled)) return bundled
  // Fallback: assume 7z is on PATH
  return '7z'
}

export function extractArchive(archivePath: string, destDir: string): void {
  const sevenZip = get7zPath()
  execFileSync(sevenZip, ['x', archivePath, `-o${destDir}`, '-y'], {
    encoding: 'utf-8',
    windowsHide: true,
  })
}
```

- [ ] **Step 4: Implement mod manager**

ModDatabase class (JSON persistence), scanModScripts, applyLoadOrder (two-pass rename), installMod (extract + rollback on failure), removeMod, toggleMod.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/electron/mod-manager.test.ts
```

- [ ] **Step 6: Register mod manager IPC handlers**

Add mods:list, mods:install, mods:remove, mods:toggle, mods:reorder. All file ops go through OperationQueue. Check isWitcherRunning() before writes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add mod manager with install, remove, enable/disable, and load ordering"
```

---

## Task 9: Mod Management UI

**Files:**
- Create: `src/components/mods/ModList.tsx`, `src/components/mods/ModCard.tsx`, `src/components/mods/ModInstallDialog.tsx`, `src/components/mods/ModContextMenu.tsx`
- Modify: `src/components/layout/MainContent.tsx`

- [ ] **Step 1: Create ModCard component**

Single mod row: drag handle, enable/disable toggle, name, version, conflict warning icon.

- [ ] **Step 2: Create ModContextMenu**

Right-click menu: delete, open folder, open Nexus page.

- [ ] **Step 3: Create ModList with drag-and-drop**

Uses @dnd-kit/sortable. Shows empty state. "Add Mod" button opens file dialog via IPC.

- [ ] **Step 4: Create ModInstallDialog**

File picker + install progress indicator.

- [ ] **Step 5: Wire ModList into MainContent**

- [ ] **Step 6: Verify mod management works end-to-end**

```bash
npm run dev
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add mod management UI with drag-and-drop and context menu"
```

---

## Task 10: Bundle Parser for Vanilla Scripts

**Files:**
- Create: `electron/modules/bundle-parser.ts`
- Test: `tests/electron/bundle-parser.test.ts`

- [ ] **Step 1: Write failing test for bundle parser**

Test parsing of W3 bundle header format with mock data.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement bundle parser**

Parse W3 `.bundle` format: read header (magic + entry count), iterate entries (path, offset, size), extract `.ws` files.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Integrate with config — extract vanilla scripts on first setup**

On first use or game update, extract vanilla scripts from `content/content0/bundles/scripts.bundle` and cache to `%APPDATA%/witcher3-mod-manager/vanilla-scripts/{nextgen,classic}/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add W3 bundle parser for vanilla script extraction"
```

---

## Task 11: Script Merger Backend

**Files:**
- Create: `electron/modules/script-merger.ts`
- Test: `tests/electron/script-merger.test.ts`

- [ ] **Step 1: Install node-diff3**

```bash
npm install node-diff3
```

- [ ] **Step 2: Write failing test for script merger**

Test detectConflicts (two mods same script → conflict, no overlap → no conflict). Test mergeScripts (auto-merge non-conflicting changes, report conflict when both change same line).

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/electron/script-merger.test.ts
```

- [ ] **Step 4: Implement script merger**

detectConflicts: map scripts to mods, find overlaps. mergeScripts: use node-diff3's diff3Merge for 3-way merge. Return success + merged content, or failure + conflict details with markers.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/electron/script-merger.test.ts
```

- [ ] **Step 6: Register merger IPC handlers**

Add merger:detect-conflicts, merger:merge-all, merger:merge-single. Backup mod0000_MergedFiles before merge.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add script merger with 3-way diff and conflict detection"
```

---

## Task 12: Script Merger UI

**Files:**
- Create: `src/components/merger/ConflictList.tsx`, `src/components/merger/DiffView.tsx`
- Modify: `src/components/layout/MainContent.tsx`

- [ ] **Step 1: Create ConflictList component**

List of conflicts with status badges. "Merge All" button.

- [ ] **Step 2: Create DiffView component**

Side-by-side diff viewer for manual merge resolution.

- [ ] **Step 3: Wire into MainContent**

- [ ] **Step 4: Verify merger UI works**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add script merger UI with conflict list and diff viewer"
```

---

## Task 13: Nexus Mods API Client

**Files:**
- Create: `electron/modules/nexus-client.ts`
- Test: `tests/electron/nexus-client.test.ts`

- [ ] **Step 1: Write failing test for Nexus client**

Test URL building and response parsing (pure functions, no network).

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement Nexus client**

API v2 client: search, mod info, update check. Uses fetch with API key header. Download opens browser.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Register IPC handlers for Nexus**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Nexus Mods API client with search and update check"
```

---

## Task 14: Nexus Search UI

**Files:**
- Create: `src/components/nexus/SearchBar.tsx`, `src/components/nexus/ModSearchResults.tsx`, `src/components/nexus/ModDetailPanel.tsx`
- Modify: `src/components/layout/MainContent.tsx`

- [ ] **Step 1: Create SearchBar with category filter**

- [ ] **Step 2: Create ModSearchResults with cards**

- [ ] **Step 3: Create ModDetailPanel**

- [ ] **Step 4: Wire into MainContent**

- [ ] **Step 5: Verify search works**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Nexus mod search UI with result cards and detail panel"
```

---

## Task 15: Preset Manager Backend

**Files:**
- Create: `electron/modules/preset-manager.ts`, `resources/presets/default-presets.json`
- Test: `tests/electron/preset-manager.test.ts`

- [ ] **Step 1: Write failing test for preset manager**

Test create, getAll, export, import.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement preset manager**

PresetStore class: CRUD, export as JSON string, import from JSON string. Load built-in presets from resources.

- [ ] **Step 4: Create default presets JSON**

Curated mod collections with mod names and Nexus URLs.

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Register IPC handlers**

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add preset manager with create, export, import, and built-in presets"
```

---

## Task 16: Preset UI

**Files:**
- Create: `src/components/presets/PresetList.tsx`, `src/components/presets/PresetEditor.tsx`
- Modify: `src/components/layout/MainContent.tsx`

- [ ] **Step 1: Create PresetList with tabs (built-in / custom)**

- [ ] **Step 2: Create PresetEditor for creating/editing presets**

- [ ] **Step 3: Wire into MainContent**

- [ ] **Step 4: Verify preset flow works**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add preset UI with list, editor, and import/export"
```

---

## Task 17: UI Polish & Log Rotation

**Files:**
- Modify: `electron/modules/logger.ts`, `electron/ipc-handlers.ts`, various UI files

- [ ] **Step 1: Add log rotation (delete logs older than 30 days)**

Add cleanup method to logger that runs on app start.

- [ ] **Step 2: Add shell:open-logs IPC handler**

- [ ] **Step 3: Add "update available" badge on Nexus search results for installed mods**

- [ ] **Step 4: Load saved language from config on i18n init**

Read config before i18n init, set `lng` from `config.language`.

- [ ] **Step 5: Final UI polish pass**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add log rotation, UI polish, and i18n config sync"
```

---

## Task 18: Build & Distribution Setup

**Files:**
- Modify: `electron-builder.yml`, `package.json`
- Create: `resources/icons/icon.ico`

- [ ] **Step 1: Configure electron-builder**

```yaml
appId: com.w3modmanager.app
productName: W3 Mod Manager
directories:
  buildResources: resources
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
win:
  target:
    - target: nsis
    - target: zip
  icon: resources/icons/icon.ico
```

- [ ] **Step 2: Add build scripts to package.json**

```json
{
  "scripts": {
    "build": "electron-vite build",
    "dist": "electron-vite build && electron-builder --win",
    "dist:portable": "electron-vite build && electron-builder --win zip"
  }
}
```

- [ ] **Step 3: Test build**

```bash
npm run dist
```

Expected: Creates installer .exe and portable .zip in `dist/`.

- [ ] **Step 4: Set up auto-update**

Add `publish` config to `electron-builder.yml`:
```yaml
publish:
  provider: github
  owner: svrforum
  repo: SF-Witcher-3-mod-tool
```

Add auto-updater in `electron/main.ts`:
```typescript
import { autoUpdater } from 'electron-updater'

app.whenReady().then(() => {
  createWindow()
  autoUpdater.checkForUpdatesAndNotify()
})
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Configure electron-builder with installer, portable zip, and auto-update"
```

---

## Task 19: Final Integration Test

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Manual smoke test**

Launch the app and verify:
1. First-launch wizard works (language -> game detect -> main app)
2. Can install a mod from a .zip file
3. Mod appears in list, can enable/disable/reorder
4. Script merger detects conflicts
5. Settings persist across restart
6. Language switch works
7. Presets can be created and applied

- [ ] **Step 3: Commit any fixes**

- [ ] **Step 4: Push to GitHub**

```bash
git push -u origin master
```
