import { describe, it, expect } from 'vitest'

import {
  buildModInfoUrl,
  buildModFilesUrl,
  buildUpdatedModsUrl,
  buildSearchUrl,
  buildModPageUrl,
  parseModInfo,
  parseSearchResults,
  parseModFiles,
} from '../../src/main/modules/nexus-client'

describe('URL builders', () => {
  it('buildModInfoUrl returns correct endpoint', () => {
    const url = buildModInfoUrl(123)
    expect(url).toBe('https://api.nexusmods.com/v1/games/witcher3/mods/123.json')
  })

  it('buildModFilesUrl returns correct endpoint', () => {
    const url = buildModFilesUrl(456)
    expect(url).toBe('https://api.nexusmods.com/v1/games/witcher3/mods/456/files.json')
  })

  it('buildUpdatedModsUrl uses default period', () => {
    const url = buildUpdatedModsUrl()
    expect(url).toBe(
      'https://api.nexusmods.com/v1/games/witcher3/mods/updated.json?period=1m'
    )
  })

  it('buildUpdatedModsUrl accepts custom period', () => {
    const url = buildUpdatedModsUrl('1w')
    expect(url).toContain('period=1w')
  })

  it('buildSearchUrl encodes query', () => {
    const url = buildSearchUrl('better combat')
    expect(url).toContain('terms=better+combat')
    expect(url).toContain('game_id=952')
  })

  it('buildModPageUrl returns nexusmods.com URL', () => {
    const url = buildModPageUrl(789)
    expect(url).toBe('https://www.nexusmods.com/witcher3/mods/789')
  })
})

describe('parseModInfo', () => {
  it('parses a full mod info response', () => {
    const raw = {
      mod_id: 100,
      name: 'Test Mod',
      summary: 'A test summary',
      description: '<p>Full description</p>',
      picture_url: 'https://example.com/pic.jpg',
      version: '2.1',
      author: 'TestAuthor',
      category_id: 5,
      endorsement_count: 1234,
      created_timestamp: 1000000,
      updated_timestamp: 2000000,
      domain_name: 'witcher3',
    }

    const result = parseModInfo(raw)

    expect(result.mod_id).toBe(100)
    expect(result.name).toBe('Test Mod')
    expect(result.summary).toBe('A test summary')
    expect(result.version).toBe('2.1')
    expect(result.author).toBe('TestAuthor')
    expect(result.endorsement_count).toBe(1234)
  })

  it('provides defaults for missing fields', () => {
    const result = parseModInfo({})
    expect(result.mod_id).toBe(0)
    expect(result.name).toBe('')
    expect(result.version).toBe('')
    expect(result.endorsement_count).toBe(0)
  })
})

describe('parseSearchResults', () => {
  it('parses an array of search results', () => {
    const raw = [
      {
        name: 'Mod A',
        mod_id: 10,
        game_id: 952,
        summary: 'Summary A',
        downloads: 5000,
        endorsements: 200,
      },
      {
        name: 'Mod B',
        mod_id: 20,
        game_id: 952,
      },
    ]

    const results = parseSearchResults(raw)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('Mod A')
    expect(results[0].downloads).toBe(5000)
    expect(results[1].name).toBe('Mod B')
    expect(results[1].downloads).toBeUndefined()
  })

  it('returns empty array for non-array input', () => {
    expect(parseSearchResults(null)).toEqual([])
    expect(parseSearchResults('bad')).toEqual([])
    expect(parseSearchResults({})).toEqual([])
  })
})

describe('parseModFiles', () => {
  it('parses files array from response', () => {
    const raw = {
      files: [
        {
          file_id: 1,
          name: 'Main File',
          version: '1.0',
          category_name: 'MAIN',
          size_in_bytes: 1024000,
          uploaded_timestamp: 1700000000,
        },
        {
          file_id: 2,
          name: 'Optional',
          version: '1.0',
          category_name: 'OPTIONAL',
          size_in_bytes: 512000,
          uploaded_timestamp: 1700000001,
        },
      ],
    }

    const files = parseModFiles(raw)
    expect(files).toHaveLength(2)
    expect(files[0].name).toBe('Main File')
    expect(files[0].category_name).toBe('MAIN')
    expect(files[1].size_in_bytes).toBe(512000)
  })

  it('returns empty array when files is missing', () => {
    expect(parseModFiles({})).toEqual([])
  })
})
