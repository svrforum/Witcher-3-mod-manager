import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModStore } from '../../stores/mod-store'

interface PresetMod {
  name: string
  nexusUrl?: string
  loadOrder: number
  notes?: string
}

interface PresetEditorProps {
  onSave: (data: { name: string; description: string; mods: PresetMod[] }) => void
  onCancel: () => void
}

export default function PresetEditor({ onSave, onCancel }: PresetEditorProps): JSX.Element {
  const { t } = useTranslation()
  const installedMods = useModStore((s) => s.mods)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMods, setSelectedMods] = useState<PresetMod[]>([])
  const [manualName, setManualName] = useState('')
  const [manualUrl, setManualUrl] = useState('')

  function handleAddFromInstalled(modName: string, modUrl?: string): void {
    if (selectedMods.some((m) => m.name === modName)) return
    setSelectedMods((prev) => [
      ...prev,
      {
        name: modName,
        nexusUrl: modUrl,
        loadOrder: prev.length,
      },
    ])
  }

  function handleAddManual(): void {
    const trimName = manualName.trim()
    if (!trimName) return
    if (selectedMods.some((m) => m.name === trimName)) return
    setSelectedMods((prev) => [
      ...prev,
      {
        name: trimName,
        nexusUrl: manualUrl.trim() || undefined,
        loadOrder: prev.length,
      },
    ])
    setManualName('')
    setManualUrl('')
  }

  function handleRemoveMod(index: number): void {
    setSelectedMods((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      mods: selectedMods.map((m, i) => ({ ...m, loadOrder: i })),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <h2 className="text-xl font-bold text-witcher-text mb-4">{t('presets.create')}</h2>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm text-witcher-text-muted mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-witcher-surface border border-witcher-border rounded px-3 py-2
                     text-sm text-witcher-text focus:border-witcher-gold focus:outline-none"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm text-witcher-text-muted mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-witcher-surface border border-witcher-border rounded px-3 py-2
                     text-sm text-witcher-text focus:border-witcher-gold focus:outline-none resize-none"
        />
      </div>

      {/* Add from installed mods */}
      {installedMods.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm text-witcher-text-muted mb-1">
            Add from installed mods
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
            {installedMods.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleAddFromInstalled(mod.name, mod.nexusUrl)}
                disabled={selectedMods.some((m) => m.name === mod.name)}
                className="px-2 py-1 text-xs bg-witcher-surface border border-witcher-border rounded
                           text-witcher-text hover:border-witcher-gold transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                + {mod.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add manually */}
      <div className="mb-4">
        <label className="block text-sm text-witcher-text-muted mb-1">
          Add mod manually
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Mod name"
            className="flex-1 bg-witcher-surface border border-witcher-border rounded px-3 py-1.5
                       text-sm text-witcher-text focus:border-witcher-gold focus:outline-none"
          />
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Nexus URL (optional)"
            className="flex-1 bg-witcher-surface border border-witcher-border rounded px-3 py-1.5
                       text-sm text-witcher-text focus:border-witcher-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddManual}
            disabled={!manualName.trim()}
            className="px-3 py-1.5 text-xs bg-witcher-surface border border-witcher-border rounded
                       text-witcher-text hover:border-witcher-gold transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected mods list */}
      {selectedMods.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm text-witcher-text-muted mb-1">
            Mods in preset ({selectedMods.length})
          </label>
          <div className="space-y-1">
            {selectedMods.map((mod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-1.5 bg-witcher-surface
                           border border-witcher-border rounded text-sm text-witcher-text"
              >
                <span className="truncate">
                  {idx + 1}. {mod.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveMod(idx)}
                  className="text-red-400 hover:text-red-300 text-xs ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-4 py-2 bg-witcher-gold text-witcher-bg text-sm font-semibold rounded
                     hover:bg-witcher-gold-light transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-witcher-surface border border-witcher-border text-witcher-text
                     text-sm rounded hover:border-witcher-gold transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
