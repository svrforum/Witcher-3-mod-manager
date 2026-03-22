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
      addToast(String(e), 'error')
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
      addToast(String(e), 'error')
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await invoke('mods:remove', id)
      await loadMods()
      addToast(t('common.success'), 'success')
    } catch (e) {
      addToast(String(e), 'error')
    }
  }

  function handleOpenFolder(id: string): void {
    if (!gamePath) return
    invoke('shell:open-path', `${gamePath}/Mods/${id}`).catch((e) => {
      addToast(String(e), 'error')
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
      addToast(String(e), 'error')
      await loadMods()
    }
  }

  const sortedMods = [...mods].sort((a, b) => a.loadOrder - b.loadOrder)

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-witcher-text">{t('mods.title')}</h1>
        <button
          onClick={handleAddMod}
          disabled={isOperating}
          className="px-4 py-2 bg-witcher-gold/90 hover:bg-witcher-gold text-witcher-bg text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('mods.add')}
        </button>
      </div>

      {/* Mod list */}
      {sortedMods.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-witcher-text-muted text-sm">{t('mods.empty')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedMods.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1.5">
                {sortedMods.map((mod) => (
                  <ModCard
                    key={mod.id}
                    mod={mod}
                    onToggle={handleToggle}
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
