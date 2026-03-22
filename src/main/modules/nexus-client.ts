// ─── Nexus Mods API Client ──────────────────────────────────────────────────
// Pure functions for URL building & response parsing, plus fetch wrappers.

const BASE_URL = 'https://api.nexusmods.com/v1'
const SEARCH_URL = 'https://search.nexusmods.com/mods'
const GAME_DOMAIN = 'witcher3'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NexusModInfo {
  mod_id: number
  name: string
  summary: string
  description?: string
  picture_url?: string
  version: string
  author: string
  category_id: number
  endorsement_count: number
  created_timestamp: number
  updated_timestamp: number
  domain_name: string
}

export interface NexusSearchResult {
  name: string
  mod_id: number
  game_id: number
  summary?: string
  author?: string
  endorsements?: number
  downloads?: number
  image?: string
  url?: string
}

export interface NexusModFile {
  file_id: number
  name: string
  version: string
  category_name: string
  size_in_bytes: number
  uploaded_timestamp: number
  description?: string
}

export interface NexusModFilesResponse {
  files: NexusModFile[]
}

// ─── URL Builders (pure, testable) ──────────────────────────────────────────

export function buildModInfoUrl(modId: number): string {
  return `${BASE_URL}/games/${GAME_DOMAIN}/mods/${modId}.json`
}

export function buildModFilesUrl(modId: number): string {
  return `${BASE_URL}/games/${GAME_DOMAIN}/mods/${modId}/files.json`
}

export function buildUpdatedModsUrl(period: string = '1m'): string {
  return `${BASE_URL}/games/${GAME_DOMAIN}/mods/updated.json?period=${period}`
}

export function buildSearchUrl(query: string): string {
  const params = new URLSearchParams({
    terms: query,
    game_id: '952', // Witcher 3 game ID on Nexus
    include_adult: 'false',
  })
  return `${SEARCH_URL}?${params.toString()}`
}

export function buildModPageUrl(modId: number): string {
  return `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modId}`
}

// ─── Response Parsers (pure, testable) ──────────────────────────────────────

export function parseModInfo(raw: Record<string, unknown>): NexusModInfo {
  return {
    mod_id: (raw.mod_id as number) ?? 0,
    name: (raw.name as string) ?? '',
    summary: (raw.summary as string) ?? '',
    description: raw.description as string | undefined,
    picture_url: raw.picture_url as string | undefined,
    version: (raw.version as string) ?? '',
    author: (raw.author as string) ?? '',
    category_id: (raw.category_id as number) ?? 0,
    endorsement_count: (raw.endorsement_count as number) ?? 0,
    created_timestamp: (raw.created_timestamp as number) ?? 0,
    updated_timestamp: (raw.updated_timestamp as number) ?? 0,
    domain_name: (raw.domain_name as string) ?? GAME_DOMAIN,
  }
}

export function parseSearchResults(raw: unknown): NexusSearchResult[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: Record<string, unknown>) => ({
    name: (item.name as string) ?? '',
    mod_id: (item.mod_id as number) ?? 0,
    game_id: (item.game_id as number) ?? 0,
    summary: item.summary as string | undefined,
    author: item.author as string | undefined,
    endorsements: item.endorsements as number | undefined,
    downloads: item.downloads as number | undefined,
    image: item.image as string | undefined,
    url: item.url as string | undefined,
  }))
}

export function parseModFiles(raw: Record<string, unknown>): NexusModFile[] {
  const files = raw.files
  if (!Array.isArray(files)) return []
  return files.map((f: Record<string, unknown>) => ({
    file_id: (f.file_id as number) ?? 0,
    name: (f.name as string) ?? '',
    version: (f.version as string) ?? '',
    category_name: (f.category_name as string) ?? '',
    size_in_bytes: (f.size_in_bytes as number) ?? 0,
    uploaded_timestamp: (f.uploaded_timestamp as number) ?? 0,
    description: f.description as string | undefined,
  }))
}

// ─── Headers ────────────────────────────────────────────────────────────────

function nexusHeaders(apiKey: string): Record<string, string> {
  return {
    apikey: apiKey,
    Accept: 'application/json',
  }
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function searchMods(
  query: string,
  _apiKey: string
): Promise<NexusSearchResult[]> {
  const url = buildSearchUrl(query)
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Nexus search failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  // search.nexusmods.com returns { results: [...] } or an array
  const results = data.results ?? data
  return parseSearchResults(results)
}

export async function getModInfo(
  modId: number,
  apiKey: string
): Promise<NexusModInfo> {
  const url = buildModInfoUrl(modId)
  const response = await fetch(url, { headers: nexusHeaders(apiKey) })

  if (!response.ok) {
    throw new Error(`Failed to get mod info: ${response.status} ${response.statusText}`)
  }

  const raw = await response.json()
  return parseModInfo(raw)
}

export async function getModFiles(
  modId: number,
  apiKey: string
): Promise<NexusModFile[]> {
  const url = buildModFilesUrl(modId)
  const response = await fetch(url, { headers: nexusHeaders(apiKey) })

  if (!response.ok) {
    throw new Error(`Failed to get mod files: ${response.status} ${response.statusText}`)
  }

  const raw = await response.json()
  return parseModFiles(raw)
}

export interface UpdateCheckResult {
  modId: number
  modName: string
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  nexusUrl: string
}

export async function checkForUpdates(
  installedMods: Array<{ nexusModId?: number; name: string; version: string }>,
  apiKey: string
): Promise<UpdateCheckResult[]> {
  const modsWithNexusId = installedMods.filter((m) => m.nexusModId)
  const results: UpdateCheckResult[] = []

  for (const mod of modsWithNexusId) {
    try {
      const info = await getModInfo(mod.nexusModId!, apiKey)
      results.push({
        modId: mod.nexusModId!,
        modName: mod.name,
        currentVersion: mod.version,
        latestVersion: info.version,
        hasUpdate: info.version !== mod.version,
        nexusUrl: buildModPageUrl(mod.nexusModId!),
      })
    } catch {
      // Skip mods that fail to fetch
    }
  }

  return results
}
