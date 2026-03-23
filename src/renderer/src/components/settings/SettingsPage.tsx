import { useTranslation } from 'react-i18next'
import { useAppStore, AppConfig } from '../../stores/app-store'
import { useIpc } from '../../hooks/use-ipc'
import { useToastStore } from '../layout/Toast'

export default function SettingsPage(): JSX.Element {
  const { t, i18n } = useTranslation()
  const { invoke } = useIpc()
  const config = useAppStore((s) => s.config)
  const setConfig = useAppStore((s) => s.setConfig)
  const addToast = useToastStore((s) => s.addToast)

  if (!config) return <div className="p-8 text-witcher-text-muted">{t('common.loading')}</div>

  const saveConfig = async (updates: Partial<AppConfig>): Promise<void> => {
    const newConfig = { ...config, ...updates }
    try {
      await invoke('config:save', newConfig)
      setConfig(newConfig)
      addToast(t('common.success'), 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[Settings] Save failed:', msg)
      addToast(msg, 'error')
    }
  }

  const handleChangePath = async (): Promise<void> => {
    try {
      const result = await invoke<{ gamePath: string; gameVersion: string }>('game:select-manual')
      if (result?.gamePath) {
        await saveConfig({
          gamePath: result.gamePath,
          gameVersion: (result.gameVersion as AppConfig['gameVersion']) || config.gameVersion
        })
      }
    } catch (e) {
      const msg = String(e)
      if (msg.includes('canceled')) return
      console.error('[Settings] Change path failed:', msg)
      addToast(msg, 'error')
    }
  }

  const handleLanguageChange = async (lang: 'ko' | 'en'): Promise<void> => {
    await i18n.changeLanguage(lang)
    await saveConfig({ language: lang })
  }

  const handleOpenLogs = (): void => {
    window.api.invoke('shell:open-logs')
  }

  const handleResetAll = async (): Promise<void> => {
    try {
      await invoke('config:save', {
        gamePath: '',
        gameVersion: 'nextgen',
        platform: 'manual',
        language: config.language,
        nexusApiKey: ''
      })
      window.location.reload()
    } catch (e) {
      const msg = String(e)
      console.error('[Settings] Reset failed:', msg)
      addToast(msg, 'error')
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-witcher-text mb-8">{t('settings.title')}</h1>

      {/* Game Path */}
      <section className="bg-witcher-card/60 rounded-xl p-5 mb-4">
        <div className="mb-1">
          <h2 className="text-sm font-semibold text-witcher-text">{t('settings.gamePath')}</h2>
          <p className="text-xs text-witcher-text-muted/50 mt-0.5">The Witcher 3 installation directory</p>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm text-witcher-text-muted truncate">
              {config.gamePath || '---'}
            </span>
            {config.gamePath && (
              <span className="text-green-400 text-sm shrink-0" title="Valid path">&#x2713;</span>
            )}
          </div>
          <button
            onClick={handleChangePath}
            className="px-4 py-2 text-xs bg-witcher-bg/50 rounded-lg hover:bg-witcher-bg text-witcher-text transition-smooth shrink-0"
          >
            {t('settings.changePath')}
          </button>
        </div>
      </section>

      {/* Game Version */}
      <section className="bg-witcher-card/60 rounded-xl p-5 mb-4">
        <div className="mb-1">
          <h2 className="text-sm font-semibold text-witcher-text">{t('settings.gameVersion')}</h2>
          <p className="text-xs text-witcher-text-muted/50 mt-0.5">Detected game edition</p>
        </div>
        <div className="mt-3">
          <span className="text-sm text-witcher-text bg-witcher-bg/30 px-3 py-1.5 rounded-lg inline-block">
            {config.gameVersion === 'nextgen' ? 'Next-Gen' : 'Classic'}
          </span>
        </div>
      </section>

      {/* Language — toggle switch style */}
      <section className="bg-witcher-card/60 rounded-xl p-5 mb-4">
        <div className="mb-1">
          <h2 className="text-sm font-semibold text-witcher-text">{t('settings.language')}</h2>
          <p className="text-xs text-witcher-text-muted/50 mt-0.5">Interface language</p>
        </div>
        <div className="flex gap-2 mt-3 bg-witcher-bg/30 rounded-xl p-1 w-fit">
          {(['ko', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-5 py-2 text-sm rounded-lg transition-smooth ${
                config.language === lang
                  ? 'bg-witcher-gold text-witcher-bg font-semibold shadow-sm'
                  : 'text-witcher-text-muted hover:text-witcher-text'
              }`}
            >
              {lang === 'ko' ? '\uD55C\uAD6D\uC5B4' : 'English'}
            </button>
          ))}
        </div>
      </section>

      {/* Logs & Reset */}
      <section className="bg-witcher-card/60 rounded-xl p-5 mb-4">
        <div className="mb-1">
          <h2 className="text-sm font-semibold text-witcher-text">Debug</h2>
          <p className="text-xs text-witcher-text-muted/50 mt-0.5">Logs and reset options</p>
        </div>
        <div className="flex gap-3 mt-3">
          <button
            onClick={handleOpenLogs}
            className="px-4 py-2 text-xs bg-witcher-bg/50 rounded-lg hover:bg-witcher-bg text-witcher-text transition-smooth"
          >
            {t('settings.openLogs')}
          </button>
          <button
            onClick={handleResetAll}
            className="px-4 py-2 text-xs bg-red-900/15 rounded-lg hover:bg-red-900/30 text-red-400 transition-smooth"
          >
            Reset All
          </button>
        </div>
      </section>

      {/* Version info */}
      <div className="mt-8 pt-4 border-t border-witcher-border/20">
        <div className="flex items-center justify-between text-xs text-witcher-text-muted/40">
          <span>{t('settings.version')}: v1.0.0</span>
          <span>Data: {config.gamePath ? config.gamePath.replace(/[/\\][^/\\]+$/, '') : '---'}</span>
        </div>
      </div>
    </div>
  )
}
