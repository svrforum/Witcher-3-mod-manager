import { useAppStore } from '../../stores/app-store'
import SettingsPage from '../settings/SettingsPage'
import ModList from '../mods/ModList'
import ConflictList from '../merger/ConflictList'
import NexusSearchPage from '../nexus/NexusSearchPage'
import PresetList from '../presets/PresetList'

export default function MainContent(): JSX.Element {
  const currentPage = useAppStore((s) => s.currentPage)

  const pages: Record<string, JSX.Element> = {
    mods: <ModList />,
    merger: <ConflictList />,
    search: <NexusSearchPage />,
    presets: <PresetList />,
    settings: <SettingsPage />
  }

  return (
    <main className="flex-1 bg-witcher-bg overflow-auto">
      <div key={currentPage} className="animate-page-enter h-full">
        {pages[currentPage] ?? <ModList />}
      </div>
    </main>
  )
}
