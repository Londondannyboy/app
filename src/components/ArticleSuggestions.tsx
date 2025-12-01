'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: number
  title: string
  slug: string
  excerpt?: string
  type: 'country_guide' | 'article' | 'deal' | 'job'
  country?: string
  countryFlag?: string
  imageUrl?: string
}

interface ArticleSuggestionsProps {
  userId: string | null
}

const TYPE_ICONS: Record<string, string> = {
  country_guide: '🌍',
  article: '📰',
  deal: '🎫',
  job: '💼',
}

const TYPE_LABELS: Record<string, string> = {
  country_guide: 'Country Guide',
  article: 'Article',
  deal: 'Deal',
  job: 'Job',
}

export function ArticleSuggestions({ userId }: ArticleSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastQuery, setLastQuery] = useState<string | null>(null)

  // SSE connection for real-time suggestions
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('content_suggestion', (e) => {
      const data = JSON.parse(e.data)
      setSuggestions(prev => {
        // Dedupe by id
        const existing = prev.find(s => s.id === data.id && s.type === data.type)
        if (existing) return prev
        // Keep max 5 suggestions
        return [...prev, data].slice(-5)
      })
      if (data.query) {
        setLastQuery(data.query)
      }
    })

    eventSource.addEventListener('content_clear', () => {
      setSuggestions([])
      setLastQuery(null)
    })

    return () => eventSource.close()
  }, [userId])

  if (!userId) return null

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span>📚</span>
          <span className="font-medium">Relevant Content</span>
        </div>
        {lastQuery && (
          <div className="text-xs text-gray-400 mt-1">
            Based on: "{lastQuery}"
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="text-center text-gray-400 py-4 animate-pulse">
            Finding relevant content...
          </div>
        )}

        {!isLoading && suggestions.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            Mention a country or topic to see relevant guides
          </div>
        )}

        {suggestions.map((article, idx) => (
          <a
            key={`${article.type}-${article.id}`}
            href={`https://relocation.quest/${article.type === 'country_guide' ? 'countries' : article.type}/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-3 rounded-lg bg-gradient-to-r hover:scale-[1.02] transition-all ${
              idx === 0
                ? 'from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                : 'from-white/5 to-white/10 border border-white/10'
            }`}
          >
            <div className="flex items-start gap-3">
              {article.countryFlag && (
                <span className="text-2xl">{article.countryFlag}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {TYPE_ICONS[article.type]} {TYPE_LABELS[article.type]}
                  </span>
                </div>
                <h4 className="font-medium text-sm truncate">{article.title}</h4>
                {article.excerpt && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {article.excerpt}
                  </p>
                )}
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </div>
          </a>
        ))}
      </div>

      {/* View All Link */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10">
          <a
            href="https://relocation.quest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 transition"
          >
            View all on relocation.quest →
          </a>
        </div>
      )}
    </div>
  )
}
