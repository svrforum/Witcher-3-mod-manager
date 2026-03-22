import { useTranslation } from 'react-i18next'

interface SearchResult {
  name: string
  mod_id: number
  summary?: string
  author?: string
  endorsements?: number
  downloads?: number
  image?: string
}

interface ModSearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  hasSearched: boolean
  onOpenMod: (modId: number) => void
  onViewDetail?: (modId: number) => void
}

function formatCount(n?: number): string {
  if (n == null) return '--'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export default function ModSearchResults({
  results,
  isLoading,
  hasSearched,
  onOpenMod,
  onViewDetail,
}: ModSearchResultsProps): JSX.Element {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-witcher-text-muted text-sm">{t('common.loading')}</div>
      </div>
    )
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-witcher-text-muted text-lg">No results found</p>
        <p className="text-witcher-text-muted text-sm mt-2">
          Try different search terms
        </p>
      </div>
    )
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-16">
        <p className="text-witcher-text-muted text-sm">
          Search for Witcher 3 mods on Nexus Mods
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {results.map((mod) => (
        <div
          key={mod.mod_id}
          className="bg-witcher-surface border border-witcher-border rounded-lg p-4
                     hover:border-witcher-gold/50 transition-colors cursor-pointer"
          onClick={() => onViewDetail?.(mod.mod_id)}
        >
          <div className="flex gap-3">
            {mod.image && (
              <img
                src={mod.image}
                alt={mod.name}
                className="w-16 h-16 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-witcher-text font-medium text-sm truncate">
                {mod.name}
              </h3>
              {mod.author && (
                <p className="text-witcher-text-muted text-xs mt-0.5">
                  by {mod.author}
                </p>
              )}
              {mod.summary && (
                <p className="text-witcher-text-muted text-xs mt-1 line-clamp-2">
                  {mod.summary}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-witcher-border">
            <div className="flex gap-4 text-xs text-witcher-text-muted">
              <span>{t('search.downloads')}: {formatCount(mod.downloads)}</span>
              <span>{t('search.endorsements')}: {formatCount(mod.endorsements)}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenMod(mod.mod_id) }}
              className="px-3 py-1 text-xs bg-witcher-gold/90 hover:bg-witcher-gold text-witcher-bg
                         font-medium rounded transition-colors"
            >
              {t('search.downloadOnNexus')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
