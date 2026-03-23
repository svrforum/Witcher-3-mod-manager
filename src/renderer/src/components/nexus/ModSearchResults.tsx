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

function SkeletonCard(): JSX.Element {
  return (
    <div className="bg-witcher-card/40 rounded-xl p-5">
      <div className="flex gap-3">
        <div className="skeleton w-16 h-16 rounded-lg shrink-0" />
        <div className="flex-1">
          <div className="skeleton w-3/4 h-4 mb-2" />
          <div className="skeleton w-1/3 h-3 mb-2" />
          <div className="skeleton w-full h-3" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-witcher-border/20">
        <div className="skeleton w-32 h-3" />
        <div className="skeleton w-20 h-7 rounded-lg" />
      </div>
    </div>
  )
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-witcher-card/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-witcher-text-muted/30">&#x2315;</span>
        </div>
        <p className="text-witcher-text-muted text-base mb-1">No results found</p>
        <p className="text-witcher-text-muted/50 text-sm">Try different search terms</p>
      </div>
    )
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-witcher-card/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-witcher-text-muted/30">&#x2315;</span>
        </div>
        <p className="text-witcher-text-muted/60 text-sm">
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
          className="bg-witcher-card/60 rounded-xl p-5 hover-lift cursor-pointer"
          onClick={() => onViewDetail?.(mod.mod_id)}
        >
          <div className="flex gap-3">
            {mod.image && (
              <img
                src={mod.image}
                alt={mod.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-witcher-text font-medium text-sm truncate">
                {mod.name}
              </h3>
              {mod.author && (
                <p className="text-witcher-text-muted/60 text-xs mt-0.5">
                  by {mod.author}
                </p>
              )}
              {mod.summary && (
                <p className="text-witcher-text-muted/50 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                  {mod.summary}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-witcher-border/20">
            <div className="flex gap-4 text-xs text-witcher-text-muted/50">
              <span>{t('search.downloads')}: {formatCount(mod.downloads)}</span>
              <span>{t('search.endorsements')}: {formatCount(mod.endorsements)}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenMod(mod.mod_id) }}
              className="px-3.5 py-1.5 text-xs bg-witcher-gold hover:bg-witcher-gold-light text-witcher-bg
                         font-medium rounded-lg transition-smooth"
            >
              {t('search.downloadOnNexus')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
