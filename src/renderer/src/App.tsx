import { useEffect } from 'react'
import { useAppStore } from './stores/app-store'
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import MainContent from './components/layout/MainContent'
import { ToastContainer } from './components/layout/Toast'
import SetupWizard from './components/setup/SetupWizard'
import i18n from './i18n'

function SkeletonLoader(): JSX.Element {
  return (
    <div className="flex flex-col h-screen bg-witcher-bg">
      {/* Title bar skeleton */}
      <div className="h-10 bg-witcher-surface/80 flex items-center px-4">
        <div className="skeleton w-32 h-4" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-56 bg-witcher-surface p-3 flex flex-col gap-2 pt-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-8">
          <div className="skeleton w-48 h-8 mb-6" />
          <div className="skeleton w-full h-12 mb-4 rounded-xl" />
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function App(): JSX.Element {
  const config = useAppStore((s) => s.config)
  const isLoading = useAppStore((s) => s.isLoading)
  const setConfig = useAppStore((s) => s.setConfig)
  const setLoading = useAppStore((s) => s.setLoading)

  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      try {
        const result = await window.api.invoke('config:load')
        if (result.success && result.data) {
          const loadedConfig = result.data as ReturnType<typeof useAppStore.getState>['config'] & object
          setConfig(loadedConfig)
          if (loadedConfig.language) {
            i18n.changeLanguage(loadedConfig.language)
          }
        }
      } catch (err) {
        console.error('[App] Failed to load config:', err)
        // Config not found — first launch
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [setConfig, setLoading])

  if (isLoading) {
    return <SkeletonLoader />
  }

  if (!config?.gamePath) {
    return (
      <>
        <SetupWizard />
        <ToastContainer />
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
