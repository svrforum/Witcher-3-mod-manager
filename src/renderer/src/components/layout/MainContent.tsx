import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app-store'
import SettingsPage from '../settings/SettingsPage'
import ModList from '../mods/ModList'
import ConflictList from '../merger/ConflictList'

function PlaceholderPage({ titleKey }: { titleKey: string }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-witcher-text mb-4">{t(`${titleKey}.title`)}</h1>
      <p className="text-witcher-text-muted">{t('common.loading')}</p>
    </div>
  )
}

export default function MainContent(): JSX.Element {
  const currentPage = useAppStore((s) => s.currentPage)

  const pages: Record<string, JSX.Element> = {
    mods: <ModList />,
    merger: <ConflictList />,
    search: <PlaceholderPage titleKey="search" />,
    presets: <PlaceholderPage titleKey="presets" />,
    settings: <SettingsPage />
  }

  return (
    <main className="flex-1 bg-witcher-bg overflow-auto">
      {pages[currentPage] ?? <PlaceholderPage titleKey="mods" />}
    </main>
  )
}
