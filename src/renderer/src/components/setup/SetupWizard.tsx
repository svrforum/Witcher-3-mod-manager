import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore, AppConfig } from '../../stores/app-store'
import { useIpc } from '../../hooks/use-ipc'

type Step = 'language' | 'detect' | 'manual'

const steps: Step[] = ['language', 'detect', 'manual']

function StepIndicator({ current }: { current: Step }): JSX.Element {
  const currentIdx = current === 'manual' ? 2 : steps.indexOf(current)
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`rounded-full transition-smooth ${
            i === currentIdx
              ? 'w-6 h-2 bg-witcher-gold'
              : i < currentIdx
                ? 'w-2 h-2 bg-witcher-gold/50'
                : 'w-2 h-2 bg-witcher-border'
          }`}
        />
      ))}
    </div>
  )
}

export default function SetupWizard(): JSX.Element {
  const { t, i18n } = useTranslation()
  const { invoke } = useIpc()
  const setConfig = useAppStore((s) => s.setConfig)
  const [step, setStep] = useState<Step>('language')
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleLanguageSelect = async (lang: 'ko' | 'en'): Promise<void> => {
    setLanguage(lang)
    await i18n.changeLanguage(lang)
  }

  const handleAutoDetect = async (): Promise<void> => {
    setDetecting(true)
    setError('')
    try {
      const result = await invoke<AppConfig>('game:detect')
      if (result?.gamePath) {
        const config: AppConfig = {
          gamePath: result.gamePath,
          gameVersion: result.gameVersion || 'nextgen',
          platform: result.platform || 'manual',
          language,
          nexusApiKey: ''
        }
        await invoke('config:save', config)
        setSuccess(true)
        setTimeout(() => setConfig(config), 800)
      } else {
        setStep('manual')
      }
    } catch (err) {
      console.error('[SetupWizard] Auto-detect failed:', err)
      setStep('manual')
    } finally {
      setDetecting(false)
    }
  }

  const handleManualSelect = async (): Promise<void> => {
    setError('')
    try {
      const result = await invoke<{ gamePath: string; gameVersion: string }>('game:select-manual')
      if (result?.gamePath) {
        const config: AppConfig = {
          gamePath: result.gamePath,
          gameVersion: (result.gameVersion as AppConfig['gameVersion']) || 'nextgen',
          platform: 'manual',
          language,
          nexusApiKey: ''
        }
        await invoke('config:save', config)
        setSuccess(true)
        setTimeout(() => setConfig(config), 800)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[SetupWizard] Manual select failed:', msg)
      setError(msg)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-screen bg-witcher-bg">
        <div className="glass-card rounded-2xl p-10 w-full max-w-md shadow-2xl text-center animate-fade-in">
          <div className="text-5xl mb-4 text-witcher-gold">&#x2714;</div>
          <h2 className="text-xl font-bold text-witcher-text mb-2">{t('common.success')}</h2>
          <p className="text-sm text-witcher-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-witcher-bg">
      <div className="glass-card rounded-2xl p-10 w-full max-w-md shadow-2xl animate-fade-in">
        <h1 className="text-3xl font-bold text-witcher-gold text-center mb-2">
          {t('app.title')}
        </h1>
        <p className="text-witcher-text-muted text-sm text-center mb-6">
          Witcher 3 Mod Manager
        </p>

        <StepIndicator current={step} />

        {step === 'language' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <p className="text-witcher-text text-sm text-center font-medium">
              {t('settings.language')}
            </p>
            <div className="flex gap-3 w-full">
              {(['ko', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`flex-1 px-6 py-3.5 rounded-xl text-sm font-medium transition-smooth ${
                    language === lang
                      ? 'bg-witcher-gold text-witcher-bg shadow-lg shadow-witcher-gold/20'
                      : 'bg-witcher-surface border border-witcher-border text-witcher-text-muted hover:border-witcher-gold/50'
                  }`}
                >
                  {lang === 'ko' ? '\uD55C\uAD6D\uC5B4' : 'English'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('detect')}
              className="w-full mt-2 px-6 py-3.5 bg-witcher-gold text-witcher-bg font-semibold rounded-xl hover:bg-witcher-gold-light transition-smooth shadow-lg shadow-witcher-gold/20"
            >
              {t('common.confirm')}
            </button>
          </div>
        )}

        {step === 'detect' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-witcher-gold/10 flex items-center justify-center mb-2">
              <span className="text-3xl text-witcher-gold">&#x2692;</span>
            </div>
            <p className="text-witcher-text text-sm text-center">
              {t('settings.autoDetected')}
            </p>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="w-full px-6 py-3.5 bg-witcher-gold text-witcher-bg font-semibold rounded-xl hover:bg-witcher-gold-light transition-smooth disabled:opacity-50 shadow-lg shadow-witcher-gold/20"
            >
              {detecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-witcher-bg border-t-transparent rounded-full animate-spin" />
                  {t('common.loading')}
                </span>
              ) : (
                t('settings.autoDetected')
              )}
            </button>
            <button
              onClick={() => setStep('manual')}
              className="text-sm text-witcher-text-muted hover:text-witcher-gold transition-smooth"
            >
              {t('settings.changePath')}
            </button>
          </div>
        )}

        {step === 'manual' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-witcher-gold/10 flex items-center justify-center mb-2">
              <span className="text-3xl text-witcher-gold">&#x1F4C1;</span>
            </div>
            <p className="text-witcher-text text-sm text-center">
              {t('settings.gamePath')}
            </p>
            <button
              onClick={handleManualSelect}
              className="w-full px-6 py-3.5 bg-witcher-gold text-witcher-bg font-semibold rounded-xl hover:bg-witcher-gold-light transition-smooth shadow-lg shadow-witcher-gold/20"
            >
              {t('settings.changePath')}
            </button>
            {error && (
              <div className="w-full p-3 bg-red-900/20 border border-red-700/30 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <button
              onClick={() => setStep('detect')}
              className="text-sm text-witcher-text-muted hover:text-witcher-gold transition-smooth"
            >
              {t('settings.autoDetected')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
