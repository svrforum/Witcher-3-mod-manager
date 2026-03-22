import { useState } from 'react'
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
  const _ = config?.nexusApiKey // unused, kept for config compat

  if (!config) return <div className="p-6 text-witcher-text-muted">{t('common.loading')}</div>

  const saveConfig = async (updates: Partial<AppConfig>): Promise<void> => {
    const newConfig = { ...config, ...updates }
    try {
      await invoke('config:save', newConfig)
      setConfig(newConfig)
      addToast(t('common.success'), 'success')
    } catch {
      addToast(t('common.error'), 'error')
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
      if (String(e).includes('canceled')) return
      addToast(t('common.error'), 'error')
    }
  }

  const handleLanguageChange = async (lang: 'ko' | 'en'): Promise<void> => {
    await i18n.changeLanguage(lang)
    await saveConfig({ language: lang })
  }

  const handleOpenLogs = (): void => {
    window.api.invoke('shell:open-logs')
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-witcher-text mb-6">{t('settings.title')}</h1>

      {/* Game Path */}
      <section className="bg-witcher-card rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-witcher-gold mb-3">{t('settings.gamePath')}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-witcher-text-muted flex-1 truncate">
            {config.gamePath || '---'}
          </span>
          <button
            onClick={handleChangePath}
            className="px-3 py-1.5 text-xs bg-witcher-surface border border-witcher-border rounded hover:border-witcher-gold text-witcher-text transition-colors"
          >
            {t('settings.changePath')}
          </button>
        </div>
      </section>

      {/* Game Version */}
      <section className="bg-witcher-card rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-witcher-gold mb-3">{t('settings.gameVersion')}</h2>
        <span className="text-sm text-witcher-text">
          {config.gameVersion === 'nextgen' ? 'Next-Gen' : 'Classic'}
        </span>
      </section>

      {/* Language */}
      <section className="bg-witcher-card rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-witcher-gold mb-3">{t('settings.language')}</h2>
        <div className="flex gap-2">
          {(['ko', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-4 py-1.5 text-sm rounded transition-colors ${
                config.language === lang
                  ? 'bg-witcher-gold text-witcher-bg font-semibold'
                  : 'bg-witcher-surface border border-witcher-border text-witcher-text-muted hover:border-witcher-gold'
              }`}
            >
              {lang === 'ko' ? '\uD55C\uAD6D\uC5B4' : 'English'}
            </button>
          ))}
        </div>
      </section>

      {/* Open Logs */}
      <section className="bg-witcher-card rounded-lg p-4 mb-4">
        <button
          onClick={handleOpenLogs}
          className="px-3 py-1.5 text-xs bg-witcher-surface border border-witcher-border rounded hover:border-witcher-gold text-witcher-text transition-colors"
        >
          {t('settings.openLogs')}
        </button>
      </section>
    </div>
  )
}
