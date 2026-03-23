import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIpc } from '../../hooks/use-ipc'
import { useToastStore } from '../layout/Toast'
import PresetEditor from './PresetEditor'

interface PresetMod {
  name: string
  nexusUrl?: string
  loadOrder: number
  notes?: string
}

interface Preset {
  id: string
  name: string
  description: string
  mods: PresetMod[]
  createdAt: string
  isBuiltIn: boolean
}

type Tab = 'built-in' | 'custom'

export default function PresetList(): JSX.Element {
  const { t } = useTranslation()
  const { invoke } = useIpc()
  const addToast = useToastStore((s) => s.addToast)

  const [presets, setPresets] = useState<Preset[]>([])
  const [tab, setTab] = useState<Tab>('built-in')
  const [showEditor, setShowEditor] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadPresets()
  }, [])

  async function loadPresets(): Promise<void> {
    try {
      const data = await invoke<Preset[]>('presets:list')
      setPresets(data)
    } catch (e) {
      const msg = String(e)
      console.error('[PresetList] Load failed:', msg)
      addToast(msg, 'error')
    }
  }

  async function handleCreate(data: {
    name: string
    description: string
    mods: PresetMod[]
  }): Promise<void> {
    try {
      await invoke('presets:create', data)
      await loadPresets()
      setShowEditor(false)
      setTab('custom')
      addToast(t('common.success'), 'success')
    } catch (e) {
      const msg = String(e)
      console.error('[PresetList] Create failed:', msg)
      addToast(msg, 'error')
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await invoke('presets:remove', id)
      await loadPresets()
      addToast(t('common.success'), 'success')
    } catch (e) {
      const msg = String(e)
      console.error('[PresetList] Delete failed:', msg)
      addToast(msg, 'error')
    }
  }

  async function handleExport(id: string): Promise<void> {
    try {
      const json = await invoke<string>('presets:export', id)
      await navigator.clipboard.writeText(json)
      addToast('Preset copied to clipboard', 'success')
    } catch (e) {
      const msg = String(e)
      console.error('[PresetList] Export failed:', msg)
      addToast(msg, 'error')
    }
  }

  async function handleImport(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText()
      await invoke('presets:import', text)
      await loadPresets()
      setTab('custom')
      addToast(t('common.success'), 'success')
    } catch (e) {
      const msg = String(e)
      console.error('[PresetList] Import failed:', msg)
      addToast(msg, 'error')
    }
  }

  const filteredPresets = presets.filter((p) =>
    tab === 'built-in' ? p.isBuiltIn : !p.isBuiltIn
  )

  if (showEditor) {
    return (
      <div className="p-8 animate-page-enter">
        <PresetEditor onSave={handleCreate} onCancel={() => setShowEditor(false)} />
      </div>
    )
  }

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-witcher-text">{t('presets.title')}</h1>
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="px-4 py-2 text-sm bg-witcher-card/50 rounded-xl text-witcher-text hover:bg-witcher-card transition-smooth"
          >
            {t('presets.import')}
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="px-5 py-2.5 bg-witcher-gold hover:bg-witcher-gold-light text-witcher-bg text-sm font-semibold rounded-xl transition-smooth shadow-lg shadow-witcher-gold/20"
          >
            {t('presets.create')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-witcher-card/30 rounded-xl p-1 w-fit">
        {(['built-in', 'custom'] as const).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-5 py-2 text-sm rounded-lg transition-smooth ${
              tab === t_
                ? 'bg-witcher-card text-witcher-gold font-semibold shadow-sm'
                : 'text-witcher-text-muted hover:text-witcher-text'
            }`}
          >
            {t_ === 'built-in' ? t('presets.builtIn') : t('presets.custom')}
          </button>
        ))}
      </div>

      {/* Preset cards */}
      <div className="flex-1 overflow-auto">
        {filteredPresets.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-witcher-card/50 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl text-witcher-text-muted/30">&#x2630;</span>
            </div>
            <p className="text-witcher-text-muted text-sm">
              {tab === 'custom'
                ? 'No custom presets yet. Create one or import from clipboard.'
                : 'No built-in presets available.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="bg-witcher-card/60 rounded-xl overflow-hidden transition-smooth"
              >
                {/* Card header */}
                <div
                  className="p-5 cursor-pointer hover:bg-witcher-card/80 transition-smooth"
                  onClick={() =>
                    setExpandedId(expandedId === preset.id ? null : preset.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-witcher-text font-medium text-sm">
                        {preset.name}
                      </h3>
                      <p className="text-witcher-text-muted/50 text-xs mt-1.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-witcher-text-muted/50 bg-witcher-bg/30 px-2.5 py-1 rounded-full">
                        {preset.mods.length} mods
                      </span>
                      <span className={`text-witcher-text-muted/40 text-xs transition-transform duration-300 ${expandedId === preset.id ? 'rotate-180' : ''}`}>
                        &#x25BC;
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded content with animation */}
                {expandedId === preset.id && (
                  <div className="border-t border-witcher-border/20 p-5 animate-expand">
                    {/* Mod list */}
                    <div className="space-y-1.5 mb-5">
                      {preset.mods.map((mod, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2.5
                                     bg-witcher-bg/30 rounded-lg text-sm"
                        >
                          <span className="text-witcher-text truncate">
                            {idx + 1}. {mod.name}
                          </span>
                          {mod.nexusUrl && (
                            <a
                              href={mod.nexusUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-witcher-gold/60 hover:text-witcher-gold ml-2 flex-shrink-0 transition-smooth"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Nexus
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExport(preset.id)}
                        className="px-4 py-2 text-xs bg-witcher-bg/30 rounded-lg text-witcher-text hover:bg-witcher-bg/50 transition-smooth"
                      >
                        {t('presets.export')}
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => handleDelete(preset.id)}
                          className="px-4 py-2 text-xs bg-red-900/15 rounded-lg text-red-400 hover:bg-red-900/30 transition-smooth"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
