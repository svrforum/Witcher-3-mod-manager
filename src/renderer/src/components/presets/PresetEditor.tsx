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
      <h2 className="text-xl font-bold text-witcher-text mb-6">{t('presets.create')}</h2>

      {/* Name */}
      <div className="mb-5">
        <label className="block text-xs text-witcher-text-muted/60 uppercase tracking-wider mb-2">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-witcher-card/50 border border-witcher-border/50 rounded-xl px-4 py-3
                     text-sm text-witcher-text transition-smooth"
        />
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="block text-xs text-witcher-text-muted/60 uppercase tracking-wider mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-witcher-card/50 border border-witcher-border/50 rounded-xl px-4 py-3
                     text-sm text-witcher-text transition-smooth resize-none"
        />
      </div>

      {/* Add from installed mods */}
      {installedMods.length > 0 && (
        <div className="mb-5">
          <label className="block text-xs text-witcher-text-muted/60 uppercase tracking-wider mb-2">
            Add from installed mods
          </label>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-auto">
            {installedMods.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleAddFromInstalled(mod.name, mod.nexusUrl)}
                disabled={selectedMods.some((m) => m.name === mod.name)}
                className="px-3 py-1.5 text-xs bg-witcher-card/50 rounded-lg
                           text-witcher-text hover:bg-witcher-card transition-smooth
                           disabled:opacity-20 disabled:cursor-not-allowed"
              >
                + {mod.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add manually */}
      <div className="mb-5">
        <label className="block text-xs text-witcher-text-muted/60 uppercase tracking-wider mb-2">
          Add mod manually
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Mod name"
            className="flex-1 bg-witcher-card/50 border border-witcher-border/50 rounded-xl px-4 py-2.5
                       text-sm text-witcher-text transition-smooth"
          />
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Nexus URL (optional)"
            className="flex-1 bg-witcher-card/50 border border-witcher-border/50 rounded-xl px-4 py-2.5
                       text-sm text-witcher-text transition-smooth"
          />
          <button
            type="button"
            onClick={handleAddManual}
            disabled={!manualName.trim()}
            className="px-4 py-2.5 text-xs bg-witcher-card/50 rounded-xl
                       text-witcher-text hover:bg-witcher-card transition-smooth
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected mods list */}
      {selectedMods.length > 0 && (
        <div className="mb-6">
          <label className="block text-xs text-witcher-text-muted/60 uppercase tracking-wider mb-2">
            Mods in preset ({selectedMods.length})
          </label>
          <div className="space-y-1.5">
            {selectedMods.map((mod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-2.5 bg-witcher-card/40
                           rounded-lg text-sm text-witcher-text"
              >
                <span className="truncate">
                  {idx + 1}. {mod.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveMod(idx)}
                  className="text-red-400/60 hover:text-red-400 text-xs ml-2 transition-smooth"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-6 py-3 bg-witcher-gold text-witcher-bg text-sm font-semibold rounded-xl
                     hover:bg-witcher-gold-light transition-smooth
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-witcher-gold/20"
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-witcher-card/50 text-witcher-text
                     text-sm rounded-xl hover:bg-witcher-card transition-smooth"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
