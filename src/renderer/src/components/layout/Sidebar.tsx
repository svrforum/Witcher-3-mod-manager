import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app-store'

const navItems = [
  { key: 'mods', icon: '\u2692' },
  { key: 'merger', icon: '\u29C9' },
  { key: 'search', icon: '\u2315' },
  { key: 'presets', icon: '\u2630' },
  { key: 'settings', icon: '\u2731' }
] as const

export default function Sidebar(): JSX.Element {
  const { t } = useTranslation()
  const currentPage = useAppStore((s) => s.currentPage)
  const setPage = useAppStore((s) => s.setPage)

  return (
    <aside className="w-56 bg-witcher-surface flex flex-col pt-3 pb-4">
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {navItems.map((item) => {
          const active = currentPage === item.key
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-smooth text-left
                ${active
                  ? 'text-witcher-gold bg-witcher-gold/10 font-medium'
                  : 'text-witcher-text-muted hover:text-witcher-text hover:bg-white/5'
                }`}
            >
              <span className={`text-base w-5 text-center ${active ? 'text-witcher-gold' : ''}`}>
                {item.icon}
              </span>
              <span>{t(`sidebar.${item.key}`)}</span>
            </button>
          )
        })}
      </nav>

      {/* Version */}
      <div className="px-6 pt-3 border-t border-witcher-border/30 mt-auto">
        <span className="text-[11px] text-witcher-text-muted/50">v1.0.0</span>
      </div>
    </aside>
  )
}
