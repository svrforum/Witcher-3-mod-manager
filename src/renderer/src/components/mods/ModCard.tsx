import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import type { InstalledMod } from '../../stores/mod-store'

interface ModCardProps {
  mod: InstalledMod
  onToggle: (id: string, enabled: boolean) => void
  onContextMenu: (e: React.MouseEvent, mod: InstalledMod) => void
}

export default function ModCard({ mod, onToggle, onContextMenu }: ModCardProps): JSX.Element {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const hasConflicts = false

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded border transition-colors group
        ${mod.enabled
          ? 'bg-witcher-card border-witcher-border hover:border-witcher-gold/40'
          : 'bg-witcher-card/50 border-witcher-border/50 opacity-60'
        }
        ${isDragging ? 'shadow-lg shadow-witcher-gold/10' : ''}`}
      onContextMenu={(e) => onContextMenu(e, mod)}
    >
      {/* Drag handle */}
      <button
        className="text-witcher-text-muted hover:text-witcher-gold cursor-grab active:cursor-grabbing px-0.5 shrink-0"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm select-none leading-none tracking-widest">&#x2AF8;</span>
      </button>

      {/* Enable/disable toggle */}
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={mod.enabled}
          onChange={() => onToggle(mod.id, !mod.enabled)}
          className="sr-only peer"
        />
        <div className="w-8 h-4 bg-witcher-border rounded-full peer peer-checked:bg-witcher-gold/80 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-witcher-text after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
      </label>

      {/* Mod info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-witcher-text truncate font-medium">{mod.name}</span>
          {mod.version && (
            <span className="text-xs text-witcher-text-muted shrink-0">v{mod.version}</span>
          )}
        </div>
      </div>

      {/* Conflict warning */}
      {hasConflicts && (
        <span
          className="text-amber-500 text-sm shrink-0"
          title={`${t('mods.conflict')}: ${mod.modifiedScripts.length} scripts`}
        >
          &#x26A0;
        </span>
      )}
    </div>
  )
}
