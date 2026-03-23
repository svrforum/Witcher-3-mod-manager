import { useTranslation } from 'react-i18next'

interface ModDetail {
  mod_id: number
  name: string
  summary: string
  description?: string
  picture_url?: string
  version: string
  author: string
  endorsement_count: number
}

interface ModDetailPanelProps {
  mod: ModDetail | null
  isLoading: boolean
  onClose: () => void
  onOpenNexus: (modId: number) => void
}

export default function ModDetailPanel({
  mod,
  isLoading,
  onClose,
  onOpenNexus,
}: ModDetailPanelProps): JSX.Element | null {
  const { t } = useTranslation()

  if (!mod && !isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-witcher-border/30">
          <h2 className="text-lg font-semibold text-witcher-text truncate">
            {isLoading ? t('common.loading') : mod?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-witcher-text-muted/40 hover:text-witcher-text text-lg leading-none p-1.5 rounded-lg hover:bg-white/5 transition-smooth"
          >
            &#x2715;
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-witcher-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-witcher-text-muted text-sm">{t('common.loading')}</span>
          </div>
        ) : mod ? (
          <div className="p-5 overflow-auto flex-1">
            {mod.picture_url && (
              <img
                src={mod.picture_url}
                alt={mod.name}
                className="w-full h-48 object-cover rounded-xl mb-5"
              />
            )}

            <div className="space-y-4">
              <div>
                <span className="text-[11px] text-witcher-text-muted/60 uppercase tracking-wider">Author</span>
                <p className="text-sm text-witcher-text mt-0.5">{mod.author}</p>
              </div>

              <div>
                <span className="text-[11px] text-witcher-text-muted/60 uppercase tracking-wider">Version</span>
                <p className="text-sm text-witcher-text mt-0.5">{mod.version}</p>
              </div>

              <div>
                <span className="text-[11px] text-witcher-text-muted/60 uppercase tracking-wider">{t('search.endorsements')}</span>
                <p className="text-sm text-witcher-text mt-0.5">{mod.endorsement_count.toLocaleString()}</p>
              </div>

              <div>
                <span className="text-[11px] text-witcher-text-muted/60 uppercase tracking-wider">Summary</span>
                <p className="text-sm text-witcher-text mt-0.5 leading-relaxed">{mod.summary}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer — bottom-aligned action */}
        {mod && (
          <div className="p-5 border-t border-witcher-border/30">
            <button
              onClick={() => onOpenNexus(mod.mod_id)}
              className="w-full px-4 py-3 bg-witcher-gold text-witcher-bg text-sm font-semibold
                         rounded-xl hover:bg-witcher-gold-light transition-smooth shadow-lg shadow-witcher-gold/20"
            >
              {t('search.downloadOnNexus')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
