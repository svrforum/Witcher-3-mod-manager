# Witcher 3 Mod Manager - Design Spec

## Overview

A Windows desktop application for installing, managing, and organizing Witcher 3 mods with a clean, Witcher-themed dark UI. Built with Electron + React for broad compatibility and rich UI capabilities.

**Target audience:** Korean modding community + global distribution (Nexus Mods, etc.)

## Tech Stack

- **Framework:** Electron + React + TypeScript
- **Build:** Vite + electron-vite
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **i18n:** react-i18next (Korean / English)
- **Distribution:** electron-builder (NSIS installer + portable zip)
- **Auto-update:** electron-updater via GitHub Releases

## Architecture

```
┌─────────────────────────────────────────┐
│           Electron Main Process          │
│  ┌───────────┐ ┌──────────┐ ┌─────────┐│
│  │Game       │ │Mod       │ │Script   ││
│  │Detector   │ │Manager   │ │Merger   ││
│  └───────────┘ └──────────┘ └─────────┘│
│  ┌───────────┐ ┌──────────┐ ┌─────────┐│
│  │Preset     │ │Nexus API │ │i18n     ││
│  │Manager    │ │Client    │ │         ││
│  └───────────┘ └──────────┘ └─────────┘│
│                   IPC                    │
├─────────────────────────────────────────┤
│           Electron Renderer              │
│         React + Tailwind + shadcn        │
│  ┌─────────┬───────────────────────────┐│
│  │Sidebar  │      Main Content         ││
│  │         │                           ││
│  └─────────┴───────────────────────────┘│
└─────────────────────────────────────────┘
```

- **Main Process:** File system access, game path detection, mod file management, script merge logic
- **Renderer Process:** React UI, user interaction
- **IPC:** Main ↔ Renderer communication via ipcMain/ipcRenderer
- **Data storage:** Local JSON files

## Core Modules

### 1. Game Detector

Automatically detects Witcher 3 installation path and game version.

**Path detection:**
- **Steam:** Registry `HKLM\SOFTWARE\WOW6432Node\Valve\Steam` → parse `libraryfolders.vdf`
- **GOG:** Registry `HKLM\SOFTWARE\WOW6432Node\GOG.com\Games`
- **Epic:** Scan `%ProgramData%\Epic\EpicGamesLauncher\Data\Manifests`
- **Fallback:** Manual path selection dialog

**Version detection:**
- Determine Next-Gen vs Classic from `content\patch0\metadata.store` or executable version info

### 2. Mod Manager

Handles mod installation, removal, activation, and load ordering.

- **Install:** Extract mod archive (zip/rar/7z) to `<gamePath>/Mods/`
- **Remove:** Delete mod folder + clean up related merge results
- **Enable/Disable:** Toggle `~` prefix on folder name (Witcher 3 native disable convention)
- **Load Order:** Drag-and-drop reordering, persisted in mods.json. Enforced by renaming mod folders with numeric prefixes (e.g., `mod0001_ModName`, `mod0002_ModName`) since Witcher 3 loads mods alphabetically from the `Mods/` folder.
- **Metadata:** Track name, version, description, Nexus URL per mod in local DB. `modifiedScripts` is populated during install by scanning the mod's folder for `.ws` files and recording their paths relative to the scripts root.
- **Game running check:** Detect if `witcher3.exe` is running before any file operations. Block install/remove/merge with a user-facing warning.

### 3. Script Merger (Built-in)

Custom implementation of 3-way merge for `.ws` script files. No dependency on external Script Merger tool — avoids license concerns.

- **Conflict detection:** Scan which mods modify the same `.ws` script files
- **3-way merge:** Vanilla (original) ↔ Mod A ↔ Mod B using diff3 algorithm
- **Auto merge:** When no conflicts, automatically write result to `<gamePath>/Mods/mod0000_MergedFiles/`
- **Manual merge UI:** Visual diff view showing conflicts for user resolution
- **Vanilla script cache:** Witcher 3 stores scripts inside `.bundle` files. On first run, extract vanilla `.ws` scripts from `content/content0/bundles/scripts.bundle` using the W3 bundle format parser (custom implementation — the format is well-documented in the modding community). Cache extracted scripts per game version in app data (`vanilla-scripts/nextgen/`, `vanilla-scripts/classic/`). Re-extract if game update is detected.

### 4. Nexus API Client

Integration with Nexus Mods API v2 for mod discovery and update checking.

- **Requires:** User-provided Nexus API key (optional — app works without it)
- **Search:** Query mods by keyword and category
- **Info:** Retrieve mod details (name, description, version, download count, rating)
- **Updates:** Check installed mods for newer versions on Nexus
- **Download:** Open Nexus mod page in browser via `shell.openExternal` (no direct download)

### 5. Preset Manager

Mod preset system for easy sharing and one-click setup.

- **Built-in presets:** Ship with curated mod collections (mod name + Nexus URL per entry)
- **Custom presets:** Users save current mod configuration as a preset
- **Share:** Export/import presets as `.json` files
- **Apply preset:** Install already-downloaded mods, show Nexus links for missing ones

## Data Model

### Storage Locations

- **App config:** `%APPDATA%/witcher3-mod-manager/config.json`
- **Mod database:** `%APPDATA%/witcher3-mod-manager/mods.json`
- **Presets:** `%APPDATA%/witcher3-mod-manager/presets/`
- **Vanilla script cache:** `%APPDATA%/witcher3-mod-manager/vanilla-scripts/{nextgen,classic}/`

### Core Types

```typescript
interface AppConfig {
  gamePath: string;
  gameVersion: "nextgen" | "classic";
  platform: "steam" | "gog" | "epic" | "manual";
  nexusApiKey?: string;
  language: "ko" | "en";
}

interface InstalledMod {
  id: string;                  // UUID
  name: string;
  version: string;
  nexusModId?: number;
  nexusUrl?: string;
  enabled: boolean;
  loadOrder: number;
  installedAt: string;         // ISO date
  modifiedScripts: string[];   // .ws file paths this mod modifies
}

interface ScriptConflict {
  scriptPath: string;
  involvedMods: string[];
  status: "unresolved" | "auto_merged" | "manual_merged";
  mergedFilePath?: string;     // path to merged result file on disk (not inline)
}

interface Preset {
  id: string;
  name: string;
  description: string;
  mods: PresetMod[];
  createdAt: string;
  isBuiltIn: boolean;
}

interface PresetMod {
  name: string;
  nexusUrl?: string;           // optional — mods without Nexus page are valid
  loadOrder: number;
  notes?: string;
}
```

## UI Design

### Layout

Sidebar (fixed left) + Main Content area.

**Sidebar navigation:**
- App logo (Witcher-themed)
- Mod Management
- Script Merger
- Mod Search (Nexus)
- Presets
- Settings

### Screens

**1. Mod Management (main screen)**
- Installed mod list with enable/disable checkboxes
- Drag-and-drop load order
- Add mod button (file dialog)
- Per-mod: name, version, status, conflict warning icon
- Right-click context menu: delete, open Nexus page, open folder

**2. Script Merger**
- Conflict list (which mods conflict on which files)
- "Merge All" button
- Auto merge results / failure display
- Manual merge: left/right diff view (Mod A vs Mod B) + result editor

**3. Mod Search (Nexus)**
- Search bar + category filter
- Result cards (thumbnail, name, download count, rating)
- Click for details + "Download on Nexus" button (opens browser)
- Update available badge for installed mods

**4. Presets**
- Built-in presets tab / My presets tab
- Preset card: name, mod list with Nexus URL links
- "Apply Preset" → install downloaded mods, show links for missing
- Export / Import buttons

**5. Settings**
- Game path (auto-detected + manual change)
- Game version display (Next-Gen / Classic)
- Nexus API Key input
- Language selector (한국어 / English)
- Theme (dark default)

### Visual Design

- **Background:** Deep dark (#0f0f0f ~ #1a1a1a)
- **Accent:** Witcher gold/amber (#c4a135)
- **Warning:** Dark red (#8b2020) for conflicts/errors
- **Fonts:** Pretendard (Korean) / Inter (English), optional decorative font for titles
- **Cards/Panels:** Subtle dark glassmorphism effect

## Project Structure

```
witcher3-mod-manager/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── modules/
│   │   ├── game-detector.ts
│   │   ├── mod-manager.ts
│   │   ├── script-merger.ts
│   │   ├── nexus-client.ts
│   │   └── preset-manager.ts
│   └── utils/
│       ├── registry.ts
│       ├── archive.ts
│       └── i18n-main.ts
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainContent.tsx
│   │   ├── mods/
│   │   │   ├── ModList.tsx
│   │   │   ├── ModCard.tsx
│   │   │   └── ModInstallDialog.tsx
│   │   ├── merger/
│   │   │   ├── ConflictList.tsx
│   │   │   └── DiffView.tsx
│   │   ├── nexus/
│   │   │   ├── SearchBar.tsx
│   │   │   └── ModSearchResults.tsx
│   │   └── presets/
│   │       ├── PresetList.tsx
│   │       └── PresetEditor.tsx
│   ├── hooks/
│   ├── stores/
│   ├── i18n/
│   │   ├── ko.json
│   │   └── en.json
│   └── styles/
│       └── globals.css
├── resources/
│   ├── presets/
│   └── icons/
├── package.json
├── electron-builder.yml
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Key Dependencies

| Purpose | Package |
|---------|---------|
| Build | Vite + electron-vite |
| UI Components | shadcn/ui + Tailwind CSS |
| State Management | Zustand |
| i18n | react-i18next |
| Archive Extraction | node-7z |
| Diff/Merge | node-diff3 (3-way merge) |
| Windows Registry | winreg |
| Distribution | electron-builder |

### Distribution

- **Installer:** NSIS (.exe) — start menu, desktop shortcut
- **Portable:** Zip archive — extract and run
- **Auto-update:** electron-updater via GitHub Releases

## Error Handling & Safety

### Operation Queue
All file operations (install, remove, merge, enable/disable) go through a serial operation queue in the Main Process. Only one file operation runs at a time. The UI disables conflicting actions while an operation is in progress.

### Error Recovery
- **Failed install:** Roll back by deleting the partially extracted mod folder. No changes to mods.json until extraction succeeds.
- **Failed merge:** Preserve existing merged files. Only overwrite on successful merge completion.
- **Backup before merge:** Snapshot the current `mod0000_MergedFiles/` folder before running a new merge. Users can restore from the last snapshot.
- **All IPC calls** return `{ success: boolean; data?: T; error?: string }`. The UI shows toast notifications for failures.

### Logging
- Write structured logs to `%APPDATA%/witcher3-mod-manager/logs/` (rotated daily).
- Include module name, operation, file paths, and error details.
- Settings page includes "Open Log Folder" button for troubleshooting.

### Minimum Requirements
- Windows 10 or later
- Witcher 3 (any platform: Steam, GOG, Epic)
