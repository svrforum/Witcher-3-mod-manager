import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { useModStore } from '../../stores/mod-store'
import type { InstalledMod } from '../../stores/mod-store'
import { useAppStore } from '../../stores/app-store'
import { useIpc } from '../../hooks/use-ipc'
import { useToastStore } from '../layout/Toast'
import ModCard from './ModCard'
import ModContextMenu from './ModContextMenu'
import ModInstallDialog from './ModInstallDialog'

interface ContextMenuState {
  mod: InstalledMod
  x: number
  y: number
}

export default function ModList(): JSX.Element {
  const { t } = useTranslation()
  const { invoke } = useIpc()
  const mods = useModStore((s) => s.mods)
  const setMods = useModStore((s) => s.setMods)
  const isOperating = useModStore((s) => s.isOperating)
  const setOperating = useModStore((s) => s.setOperating)
  const gamePath = useAppStore((s) => s.config?.gamePath)
  const addToast = useToastStore((s) => s.addToast)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [filter, setFilter] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load mods on mount
  useEffect(() => {
    loadMods()
  }, [])

  async function loadMods(): Promise<void> {
    try {
      const result = await invoke<InstalledMod[]>('mods:list')
      setMods(result)
    } catch (e) {
      const msg = String(e)
      console.error('[ModList] Failed to load mods:', msg)
      addToast(msg, 'error')
    }
  }

  async function handleAddMod(): Promise<void> {
    setOperating(true)
    try {
      await invoke('mods:install')
      await loadMods()
      addToast(t('common.success'), 'success')
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('canceled')) {
        console.error('[ModList] Install failed:', msg)
        addToast(msg, 'error')
      }
    } finally {
      setOperating(false)
    }
  }

  async function handleToggle(id: string, enabled: boolean): Promise<void> {
    try {
      await invoke('mods:toggle', id, enabled)
      await loadMods()
    } catch (e) {
      const msg = String(e)
      console.error('[ModList] Toggle failed:', msg)
      addToast(msg, 'error')
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await invoke('mods:remove', id)
      await loadMods()
      addToast(t('common.success'), 'success')
    } catch (e) {
      const msg = String(e)
      console.error('[ModList] Delete failed:', msg)
      addToast(msg, 'error')
    }
  }

  function handleOpenFolder(id: string): void {
    if (!gamePath) return
    invoke('shell:open-path', `${gamePath}/Mods/${id}`).catch((e) => {
      const msg = String(e)
      console.error('[ModList] Open folder failed:', msg)
      addToast(msg, 'error')
    })
  }

  function handleOpenNexus(url: string): void {
    window.open(url, '_blank')
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, mod: InstalledMod) => {
    e.preventDefault()
    setContextMenu({ mod, x: e.clientX, y: e.clientY })
  }, [])

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = mods.findIndex((m) => m.id === active.id)
    const newIndex = mods.findIndex((m) => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(mods, oldIndex, newIndex)
    setMods(reordered)

    try {
      const orderedIds = reordered.map((m) => m.id)
      const result = await invoke<InstalledMod[]>('mods:reorder', orderedIds)
      setMods(result)
    } catch (e) {
      const msg = String(e)
      console.error('[ModList] Reorder failed:', msg)
      addToast(msg, 'error')
      await loadMods()
    }
  }

  const sortedMods = [...mods].sort((a, b) => a.loadOrder - b.loadOrder)
  const filteredMods = filter
    ? sortedMods.filter((m) =>
        m.name.toLowerCase().includes(filter.toLowerCase()) ||
        m.id.toLowerCase().includes(filter.toLowerCase())
      )
    : sortedMods

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-witcher-text">{t('mods.title')}</h1>
          {mods.length > 0 && (
            <span className="text-xs font-medium text-witcher-text-muted bg-witcher-card px-2.5 py-1 rounded-full">
              {mods.length}
            </span>
          )}
        </div>
        <button
          onClick={handleAddMod}
          disabled={isOperating}
          className="px-5 py-2.5 bg-witcher-gold hover:bg-witcher-gold-light text-witcher-bg text-sm font-semibold rounded-xl transition-smooth disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-witcher-gold/20"
        >
          {t('mods.add')}
        </button>
      </div>

      {/* Search/filter */}
      {mods.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full bg-witcher-card/50 border border-witcher-border/50 rounded-xl px-4 py-2.5 text-sm text-witcher-text placeholder:text-witcher-text-muted/40 transition-smooth"
          />
        </div>
      )}

      {/* Mod list */}
      {sortedMods.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-witcher-card/50 flex items-center justify-center">
            <span className="text-4xl text-witcher-text-muted/30">&#x2692;</span>
          </div>
          <div className="text-center">
            <p className="text-witcher-text-muted text-sm mb-1">{t('mods.empty')}</p>
            <p className="text-witcher-text-muted/50 text-xs">
              {t('mods.add')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredMods.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {filteredMods.map((mod) => (
                  <ModCard
                    key={mod.id}
                    mod={mod}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ModContextMenu
          mod={contextMenu.mod}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onOpenFolder={handleOpenFolder}
          onOpenNexus={handleOpenNexus}
        />
      )}

      {/* Install progress overlay */}
      <ModInstallDialog visible={isOperating} />
    </div>
  )
}
