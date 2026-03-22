import { useTranslation } from 'react-i18next'
import type { ScriptConflict } from '../../stores/merge-store'

interface DiffViewProps {
  conflict: ScriptConflict
}

/**
 * Simple side-by-side diff viewer for script conflicts.
 * Shows which mods are involved and their conflict status.
 * A basic placeholder that can be enhanced with full diff rendering later.
 */
export default function DiffView({ conflict }: DiffViewProps): JSX.Element {
  const { t } = useTranslation()

  const statusMessages: Record<ScriptConflict['status'], { label: string; color: string }> = {
    unresolved: {
      label: t('merger.statusUnresolved', 'This conflict has not been resolved yet.'),
      color: 'text-red-400',
    },
    auto_merged: {
      label: t('merger.statusAutoMerged', 'This conflict was automatically resolved.'),
      color: 'text-green-400',
    },
    manual_merged: {
      label: t('merger.statusManualMerged', 'This conflict was manually resolved.'),
      color: 'text-yellow-400',
    },
  }

  const statusInfo = statusMessages[conflict.status]

  return (
    <div>
      <h2 className="text-lg font-bold text-witcher-text mb-2 font-mono">
        {conflict.scriptPath}
      </h2>

      <p className={`text-sm mb-4 ${statusInfo.color}`}>{statusInfo.label}</p>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-witcher-text-muted mb-2">
          {t('merger.involvedMods', 'Involved Mods')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {conflict.involvedMods.map((modId) => (
            <span
              key={modId}
              className="px-2 py-1 text-xs bg-witcher-surface border border-witcher-border
                         text-witcher-text rounded"
            >
              {modId}
            </span>
          ))}
        </div>
      </div>

      {conflict.involvedMods.length >= 2 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Mod A Panel */}
          <div className="border border-witcher-border rounded overflow-hidden">
            <div className="bg-witcher-surface px-3 py-2 border-b border-witcher-border">
              <span className="text-sm font-medium text-witcher-text">
                {conflict.involvedMods[0]}
              </span>
            </div>
            <div className="p-3 bg-witcher-bg min-h-[200px]">
              <p className="text-witcher-text-muted text-sm font-mono">
                {t(
                  'merger.diffPlaceholder',
                  'Script diff content will be displayed here when viewing resolved merges.'
                )}
              </p>
            </div>
          </div>

          {/* Mod B Panel */}
          <div className="border border-witcher-border rounded overflow-hidden">
            <div className="bg-witcher-surface px-3 py-2 border-b border-witcher-border">
              <span className="text-sm font-medium text-witcher-text">
                {conflict.involvedMods[1]}
              </span>
            </div>
            <div className="p-3 bg-witcher-bg min-h-[200px]">
              <p className="text-witcher-text-muted text-sm font-mono">
                {t(
                  'merger.diffPlaceholder',
                  'Script diff content will be displayed here when viewing resolved merges.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
