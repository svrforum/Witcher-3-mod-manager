import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { InstalledMod } from '../../stores/mod-store'

interface ModContextMenuProps {
  mod: InstalledMod
  x: number
  y: number
  onClose: () => void
  onDelete: (id: string) => void
  onOpenFolder: (id: string) => void
  onOpenNexus: (url: string) => void
}

export default function ModContextMenu({
  mod,
  x,
  y,
  onClose,
  onDelete,
  onOpenFolder,
  onOpenNexus,
}: ModContextMenuProps): JSX.Element {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const items = [
    {
      label: t('mods.openFolder'),
      icon: '\uD83D\uDCC2',
      action: () => onOpenFolder(mod.id),
      className: 'text-witcher-text hover:text-witcher-gold hover:bg-white/5',
    },
    ...(mod.nexusUrl
      ? [
          {
            label: t('mods.openNexus'),
            icon: '\uD83C\uDF10',
            action: () => onOpenNexus(mod.nexusUrl!),
            className: 'text-witcher-text hover:text-witcher-gold hover:bg-white/5',
          },
        ]
      : []),
    {
      label: t('mods.delete'),
      icon: '\uD83D\uDDD1',
      action: () => onDelete(mod.id),
      className: 'text-red-400 hover:text-red-300 hover:bg-red-900/20',
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 glass-card rounded-xl shadow-2xl py-1.5 min-w-44 animate-fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.action()
            onClose()
          }}
          className={`flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm transition-colors-smooth ${item.className}`}
        >
          <span className="text-xs">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )
}
