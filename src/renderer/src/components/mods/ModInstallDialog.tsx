import { useTranslation } from 'react-i18next'

interface ModInstallDialogProps {
  visible: boolean
}

export default function ModInstallDialog({ visible }: ModInstallDialogProps): JSX.Element | null {
  const { t } = useTranslation()

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 animate-fade-in">
      <div className="glass-card rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="w-10 h-10 border-2 border-witcher-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-witcher-text font-medium">{t('common.loading')}</p>
        <p className="text-xs text-witcher-text-muted/60">Installing mod...</p>
      </div>
    </div>
  )
}
