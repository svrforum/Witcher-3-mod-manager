import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMergeStore } from '../../stores/merge-store'
import type { ScriptConflict } from '../../stores/merge-store'
import DiffView from './DiffView'

const statusColors: Record<ScriptConflict['status'], string> = {
  unresolved: 'bg-red-600',
  auto_merged: 'bg-green-600',
  manual_merged: 'bg-yellow-600',
}

const statusLabels: Record<ScriptConflict['status'], string> = {
  unresolved: 'Unresolved',
  auto_merged: 'Auto Merged',
  manual_merged: 'Manual Merged',
}

export default function ConflictList(): JSX.Element {
  const { t } = useTranslation()
  const { conflicts, isMerging, setConflicts, setMerging } = useMergeStore()
  const [selectedConflict, setSelectedConflict] = useState<ScriptConflict | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConflicts()
  }, [])

  async function loadConflicts(): Promise<void> {
    try {
      setError(null)
      const result = await window.api.invoke<ScriptConflict[]>('merger:detect-conflicts')
      if (result.success && result.data) {
        setConflicts(result.data as ScriptConflict[])
      } else if (result.error) {
        setError(result.error)
      }
    } catch (e) {
      setError(String(e))
    }
  }

  async function handleMergeAll(): Promise<void> {
    setMerging(true)
    setError(null)
    try {
      const result = await window.api.invoke<ScriptConflict[]>('merger:merge-all')
      if (result.success && result.data) {
        setConflicts(result.data as ScriptConflict[])
      } else if (result.error) {
        setError(result.error)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setMerging(false)
    }
  }

  if (selectedConflict) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedConflict(null)}
          className="mb-4 px-3 py-1.5 text-sm bg-witcher-surface border border-witcher-border
                     text-witcher-text rounded hover:bg-witcher-card transition-colors"
        >
          &larr; Back to Conflicts
        </button>
        <DiffView conflict={selectedConflict} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-witcher-text">
          {t('merger.title', 'Script Merger')}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={loadConflicts}
            className="px-4 py-2 text-sm bg-witcher-surface border border-witcher-border
                       text-witcher-text rounded hover:bg-witcher-card transition-colors"
          >
            {t('merger.refresh', 'Refresh')}
          </button>
          {conflicts.length > 0 && (
            <button
              onClick={handleMergeAll}
              disabled={isMerging}
              className="px-4 py-2 text-sm bg-witcher-gold text-witcher-bg font-medium rounded
                         hover:bg-witcher-gold/90 transition-colors disabled:opacity-50"
            >
              {isMerging
                ? t('merger.merging', 'Merging...')
                : t('merger.mergeAll', 'Merge All')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {conflicts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-witcher-text-muted text-lg">
            {t('merger.noConflicts', 'No script conflicts detected.')}
          </p>
          <p className="text-witcher-text-muted text-sm mt-2">
            {t(
              'merger.noConflictsHint',
              'Conflicts appear when multiple mods modify the same script file.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conflicts.map((conflict, idx) => (
            <div
              key={`${conflict.scriptPath}-${idx}`}
              className="flex items-center gap-4 p-4 bg-witcher-surface border border-witcher-border
                         rounded hover:bg-witcher-card/50 transition-colors cursor-pointer"
              onClick={() => setSelectedConflict(conflict)}
            >
              <span
                className={`px-2 py-0.5 text-xs font-medium text-white rounded ${statusColors[conflict.status]}`}
              >
                {statusLabels[conflict.status]}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-witcher-text font-mono text-sm truncate">
                  {conflict.scriptPath}
                </p>
                <p className="text-witcher-text-muted text-xs mt-1">
                  {conflict.involvedMods.join(', ')}
                </p>
              </div>

              <span className="text-witcher-text-muted text-sm">
                {conflict.involvedMods.length} mods
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
