import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMergeStore } from '../../stores/merge-store'
import type { ScriptConflict } from '../../stores/merge-store'
import DiffView from './DiffView'

const statusConfig: Record<ScriptConflict['status'], { bg: string; text: string; label: string }> = {
  unresolved: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Unresolved' },
  auto_merged: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Auto Merged' },
  manual_merged: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Manual Merged' },
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
        console.error('[ConflictList] Detect conflicts error:', result.error)
        setError(result.error)
      }
    } catch (e) {
      const msg = String(e)
      console.error('[ConflictList] Failed to load conflicts:', msg)
      setError(msg)
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
        console.error('[ConflictList] Merge all error:', result.error)
        setError(result.error)
      }
    } catch (e) {
      const msg = String(e)
      console.error('[ConflictList] Merge failed:', msg)
      setError(msg)
    } finally {
      setMerging(false)
    }
  }

  if (selectedConflict) {
    return (
      <div className="p-8 animate-page-enter">
        <button
          onClick={() => setSelectedConflict(null)}
          className="mb-6 px-4 py-2 text-sm bg-witcher-card/50 text-witcher-text rounded-xl hover:bg-witcher-card transition-smooth inline-flex items-center gap-2"
        >
          <span>&larr;</span>
          <span>Back to Conflicts</span>
        </button>
        <DiffView conflict={selectedConflict} />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-witcher-text">
            {t('merger.title', 'Script Merger')}
          </h1>
          {conflicts.length > 0 && (
            <span className="text-xs font-medium text-witcher-text-muted bg-witcher-card px-2.5 py-1 rounded-full">
              {conflicts.length}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadConflicts}
            className="px-4 py-2.5 text-sm bg-witcher-card/50 text-witcher-text rounded-xl hover:bg-witcher-card transition-smooth"
          >
            {t('merger.refresh', 'Refresh')}
          </button>
          {conflicts.length > 0 && (
            <button
              onClick={handleMergeAll}
              disabled={isMerging}
              className="px-5 py-2.5 text-sm bg-witcher-gold text-witcher-bg font-semibold rounded-xl hover:bg-witcher-gold-light transition-smooth disabled:opacity-50 shadow-lg shadow-witcher-gold/20"
            >
              {isMerging
                ? t('merger.merging', 'Merging...')
                : t('merger.mergeAll', 'Merge All')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/15 border border-red-700/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {conflicts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-witcher-card/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl text-witcher-text-muted/30">&#x2714;</span>
          </div>
          <p className="text-witcher-text-muted text-base mb-2">
            {t('merger.noConflicts', 'No script conflicts detected.')}
          </p>
          <p className="text-witcher-text-muted/50 text-sm">
            {t(
              'merger.noConflictsHint',
              'Conflicts appear when multiple mods modify the same script file.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conflicts.map((conflict, idx) => {
            const status = statusConfig[conflict.status]
            return (
              <div
                key={`${conflict.scriptPath}-${idx}`}
                className="flex items-center gap-4 p-4 bg-witcher-card/60 rounded-xl hover:bg-witcher-card transition-smooth cursor-pointer group"
                onClick={() => setSelectedConflict(conflict)}
              >
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-witcher-text font-mono text-sm truncate">
                    {conflict.scriptPath}
                  </p>
                  <p className="text-witcher-text-muted/60 text-xs mt-1">
                    {conflict.involvedMods.join(', ')}
                  </p>
                </div>

                <span className="text-witcher-text-muted/50 text-xs bg-witcher-bg/50 px-2.5 py-1 rounded-full">
                  {conflict.involvedMods.length} mods
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
