import { useTranslation } from 'react-i18next'
import type { ScriptConflict } from '../../stores/merge-store'

interface DiffViewProps {
  conflict: ScriptConflict
}

const statusMessages: Record<ScriptConflict['status'], { label: string; bg: string; text: string }> = {
  unresolved: {
    label: 'This conflict has not been resolved yet.',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  auto_merged: {
    label: 'This conflict was automatically resolved.',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
  },
  manual_merged: {
    label: 'This conflict was manually resolved.',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
}

export default function DiffView({ conflict }: DiffViewProps): JSX.Element {
  const { t } = useTranslation()
  const statusInfo = statusMessages[conflict.status]

  return (
    <div className="animate-page-enter">
      <h2 className="text-lg font-bold text-witcher-text mb-3 font-mono">
        {conflict.scriptPath}
      </h2>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-6 ${statusInfo.bg} ${statusInfo.text}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {t(`merger.status_${conflict.status}`, statusInfo.label)}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-witcher-text-muted mb-3">
          {t('merger.involvedMods', 'Involved Mods')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {conflict.involvedMods.map((modId) => (
            <span
              key={modId}
              className="px-3 py-1.5 text-xs bg-witcher-card/60 text-witcher-text rounded-lg"
            >
              {modId}
            </span>
          ))}
        </div>
      </div>

      {conflict.involvedMods.length >= 2 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Mod A Panel */}
          <div className="rounded-xl overflow-hidden bg-witcher-card/40">
            <div className="bg-witcher-card/80 px-4 py-3">
              <span className="text-sm font-medium text-witcher-text">
                {conflict.involvedMods[0]}
              </span>
            </div>
            <div className="p-4 min-h-[200px]">
              <p className="text-witcher-text-muted/60 text-sm font-mono">
                {t(
                  'merger.diffPlaceholder',
                  'Script diff content will be displayed here when viewing resolved merges.'
                )}
              </p>
            </div>
          </div>

          {/* Mod B Panel */}
          <div className="rounded-xl overflow-hidden bg-witcher-card/40">
            <div className="bg-witcher-card/80 px-4 py-3">
              <span className="text-sm font-medium text-witcher-text">
                {conflict.involvedMods[1]}
              </span>
            </div>
            <div className="p-4 min-h-[200px]">
              <p className="text-witcher-text-muted/60 text-sm font-mono">
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
