import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import type { InstalledMod } from '../../stores/mod-store'

interface ModCardProps {
  mod: InstalledMod
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  onContextMenu: (e: React.MouseEvent, mod: InstalledMod) => void
}

export default function ModCard({ mod, onToggle, onDelete, onContextMenu }: ModCardProps): JSX.Element {
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
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-smooth group
        ${mod.enabled
          ? 'bg-witcher-card/80 hover:bg-witcher-card'
          : 'bg-witcher-card/30 opacity-50'
        }
        ${isDragging ? 'shadow-xl shadow-witcher-gold/10 scale-[1.02]' : 'shadow-sm'}`}
      onContextMenu={(e) => onContextMenu(e, mod)}
    >
      {/* Drag handle */}
      <button
        className="text-witcher-text-muted/40 hover:text-witcher-gold cursor-grab active:cursor-grabbing shrink-0 transition-colors-smooth"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm select-none leading-none tracking-widest">&#x2AF8;</span>
      </button>

      {/* iOS-style toggle */}
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={mod.enabled}
          onChange={() => onToggle(mod.id, !mod.enabled)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-witcher-border/80 rounded-full peer peer-checked:bg-witcher-gold transition-all duration-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all after:duration-300 after:shadow-sm peer-checked:after:translate-x-5" />
      </label>

      {/* Mod info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-witcher-text truncate font-medium">{mod.name}</span>
          {mod.version && (
            <span className="text-[11px] text-witcher-text-muted/60 shrink-0">v{mod.version}</span>
          )}
        </div>
        <span className="text-[11px] text-witcher-text-muted/40 truncate block mt-0.5">
          {mod.id}
        </span>
      </div>

      {/* Conflict warning */}
      {hasConflicts && (
        <span
          className="text-amber-500/80 text-sm shrink-0"
          title={`${t('mods.conflict')}: ${mod.modifiedScripts.length} scripts`}
        >
          &#x26A0;
        </span>
      )}

      {/* Delete button — trash icon */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(mod.id)
        }}
        className="text-witcher-text-muted/30 hover:text-witcher-red-light opacity-0 group-hover:opacity-100 transition-smooth shrink-0 p-1.5 rounded-lg hover:bg-witcher-red/10"
        title={t('mods.delete')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}
