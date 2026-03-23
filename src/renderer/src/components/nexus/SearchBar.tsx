import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps): JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) onSearch(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('search.placeholder')}
        className="flex-1 bg-witcher-card/50 border border-witcher-border/50 rounded-xl px-4 py-3
                   text-sm text-witcher-text placeholder:text-witcher-text-muted/40
                   transition-smooth"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="px-6 py-3 bg-witcher-gold text-witcher-bg text-sm font-semibold rounded-xl
                   hover:bg-witcher-gold-light transition-smooth
                   disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-witcher-gold/20"
      >
        {isLoading ? t('common.loading') : t('search.title')}
      </button>
    </form>
  )
}
