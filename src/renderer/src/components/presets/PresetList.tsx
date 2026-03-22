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
      addToast(String(e), 'error')
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
      addToast(String(e), 'error')
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await invoke('presets:remove', id)
      await loadPresets()
      addToast(t('common.success'), 'success')
    } catch (e) {
      addToast(String(e), 'error')
    }
  }

  async function handleExport(id: string): Promise<void> {
    try {
      const json = await invoke<string>('presets:export', id)
      await navigator.clipboard.writeText(json)
      addToast('Preset copied to clipboard', 'success')
    } catch (e) {
      addToast(String(e), 'error')
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
      addToast(String(e), 'error')
    }
  }

  const filteredPresets = presets.filter((p) =>
    tab === 'built-in' ? p.isBuiltIn : !p.isBuiltIn
  )

  if (showEditor) {
    return (
      <div className="p-6">
        <PresetEditor onSave={handleCreate} onCancel={() => setShowEditor(false)} />
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-witcher-text">{t('presets.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            className="px-3 py-1.5 text-xs bg-witcher-surface border border-witcher-border rounded
                       text-witcher-text hover:border-witcher-gold transition-colors"
          >
            {t('presets.import')}
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-witcher-gold/90 hover:bg-witcher-gold text-witcher-bg text-sm
                       font-medium rounded transition-colors"
          >
            {t('presets.create')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['built-in', 'custom'] as const).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-4 py-2 text-sm rounded-t transition-colors ${
              tab === t_
                ? 'bg-witcher-surface text-witcher-gold font-semibold border-b-2 border-witcher-gold'
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
          <div className="text-center py-16">
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
                className="bg-witcher-surface border border-witcher-border rounded-lg overflow-hidden"
              >
                {/* Card header */}
                <div
                  className="p-4 cursor-pointer hover:bg-witcher-card/50 transition-colors"
                  onClick={() =>
                    setExpandedId(expandedId === preset.id ? null : preset.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-witcher-text font-medium text-sm">
                        {preset.name}
                      </h3>
                      <p className="text-witcher-text-muted text-xs mt-1">
                        {preset.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-witcher-text-muted">
                        {preset.mods.length} mods
                      </span>
                      <span className="text-witcher-text-muted text-xs">
                        {expandedId === preset.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {expandedId === preset.id && (
                  <div className="border-t border-witcher-border p-4">
                    {/* Mod list */}
                    <div className="space-y-1.5 mb-4">
                      {preset.mods.map((mod, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-1.5
                                     bg-witcher-bg/50 rounded text-sm"
                        >
                          <span className="text-witcher-text truncate">
                            {idx + 1}. {mod.name}
                          </span>
                          {mod.nexusUrl && (
                            <a
                              href={mod.nexusUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-witcher-gold hover:underline ml-2 flex-shrink-0"
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
                        className="px-3 py-1.5 text-xs bg-witcher-surface border border-witcher-border
                                   rounded text-witcher-text hover:border-witcher-gold transition-colors"
                      >
                        {t('presets.export')}
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => handleDelete(preset.id)}
                          className="px-3 py-1.5 text-xs bg-red-900/30 border border-red-700
                                     rounded text-red-300 hover:bg-red-900/50 transition-colors"
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
