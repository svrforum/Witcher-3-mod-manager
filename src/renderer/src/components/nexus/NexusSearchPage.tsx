import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useIpc } from '../../hooks/use-ipc'
import { useToastStore } from '../layout/Toast'

interface PresetMod {
  name: string
  nexusUrl?: string
  loadOrder: number
  notes?: string
  needsMerge?: boolean
}

interface Preset {
  id: string
  name: string
  nameKo?: string
  description: string
  descriptionKo?: string
  mods: PresetMod[]
  isBuiltIn: boolean
}

export default function NexusSearchPage(): JSX.Element {
  const { t, i18n } = useTranslation()
  const { invoke } = useIpc()
  const addToast = useToastStore((s) => s.addToast)
  const [presets, setPresets] = useState<Preset[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [filter, setFilter] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPresets()
  }, [])

  async function loadPresets(): Promise<void> {
    try {
      const data = await invoke<Preset[]>('presets:list')
      const builtIn = data.filter((p) => p.isBuiltIn)
      setPresets(builtIn)
      if (builtIn.length > 0) setActiveCategory(builtIn[0].id)
    } catch (e) {
      const msg = String(e)
      console.error('[NexusSearchPage] Load presets failed:', msg)
      addToast(msg, 'error')
    }
  }

  function openNexusPage(url: string): void {
    window.open(url, '_blank')
  }

  const isKo = i18n.language === 'ko'
  const activePreset = presets.find((p) => p.id === activeCategory)

  const filteredMods = activePreset?.mods.filter((mod) =>
    filter === '' ||
    mod.name.toLowerCase().includes(filter.toLowerCase()) ||
    (mod.notes || '').toLowerCase().includes(filter.toLowerCase())
  ) || []

  // Collect all mods from all presets for "all" view
  const allMods = presets.flatMap((p) =>
    p.mods.map((m) => ({ ...m, category: isKo && p.nameKo ? p.nameKo : p.name }))
  )
  const filteredAllMods = allMods.filter((mod) =>
    filter === '' ||
    mod.name.toLowerCase().includes(filter.toLowerCase()) ||
    (mod.notes || '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-witcher-text mb-6">{t('search.title')}</h1>

      {/* Search filter */}
      <div className="mb-5">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={isKo ? '\uBAA8\uB4DC \uC774\uB984\uC73C\uB85C \uAC80\uC0C9...' : 'Filter mods by name...'}
          className="w-full px-4 py-3 bg-witcher-card/50 border border-witcher-border/50 rounded-xl text-sm text-witcher-text placeholder-witcher-text-muted/40 transition-smooth"
        />
      </div>

      {/* Category pills — horizontally scrollable */}
      <div
        ref={scrollRef}
        className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 text-sm rounded-full transition-smooth whitespace-nowrap shrink-0 ${
            activeCategory === 'all'
              ? 'bg-witcher-gold text-witcher-bg font-semibold shadow-lg shadow-witcher-gold/20'
              : 'bg-witcher-card/50 text-witcher-text-muted hover:text-witcher-text hover:bg-witcher-card'
          }`}
        >
          {isKo ? '\uC804\uCCB4' : 'All'}
        </button>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setActiveCategory(preset.id)}
            className={`px-4 py-2 text-sm rounded-full transition-smooth whitespace-nowrap shrink-0 ${
              activeCategory === preset.id
                ? 'bg-witcher-gold text-witcher-bg font-semibold shadow-lg shadow-witcher-gold/20'
                : 'bg-witcher-card/50 text-witcher-text-muted hover:text-witcher-text hover:bg-witcher-card'
            }`}
          >
            {isKo && preset.nameKo ? preset.nameKo : preset.name}
          </button>
        ))}
      </div>

      {/* Mod list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {activeCategory === 'all' ? (
          filteredAllMods.map((mod, idx) => (
            <ModRow
              key={`${mod.name}-${idx}`}
              mod={mod}
              category={mod.category}
              onOpen={openNexusPage}
              isKo={isKo}
            />
          ))
        ) : (
          filteredMods.map((mod, idx) => (
            <ModRow
              key={`${mod.name}-${idx}`}
              mod={mod}
              onOpen={openNexusPage}
              isKo={isKo}
            />
          ))
        )}
        {((activeCategory === 'all' && filteredAllMods.length === 0) ||
          (activeCategory !== 'all' && filteredMods.length === 0)) && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-witcher-card/50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-witcher-text-muted/30">&#x2315;</span>
            </div>
            <p className="text-witcher-text-muted/60 text-sm">
              {isKo ? '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4' : 'No mods found'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ModRow({
  mod,
  category,
  onOpen,
  isKo,
}: {
  mod: { name: string; nexusUrl?: string; notes?: string; needsMerge?: boolean }
  category?: string
  onOpen: (url: string) => void
  isKo: boolean
}): JSX.Element {
  return (
    <div className="bg-witcher-card/60 rounded-xl p-4 flex items-center gap-4 hover:bg-witcher-card transition-smooth hover-lift">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-witcher-text truncate">{mod.name}</span>
          {mod.needsMerge && (
            <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full shrink-0">
              {isKo ? '\uBCD1\uD569 \uD544\uC694' : 'Merge'}
            </span>
          )}
        </div>
        {mod.notes && (
          <p className="text-xs text-witcher-text-muted/50 mt-1 truncate">{mod.notes}</p>
        )}
        {category && (
          <span className="text-[11px] text-witcher-gold/40 mt-0.5 block">{category}</span>
        )}
      </div>
      {mod.nexusUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpen(mod.nexusUrl!)
          }}
          className="px-4 py-2 text-xs bg-witcher-gold hover:bg-witcher-gold-light text-witcher-bg font-medium rounded-lg transition-smooth shrink-0 shadow-sm"
        >
          {isKo ? 'Nexus\uC5D0\uC11C \uB2E4\uC6B4\uB85C\uB4DC' : 'Download on Nexus'}
        </button>
      )}
    </div>
  )
}
