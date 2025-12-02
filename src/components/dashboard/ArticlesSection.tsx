'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: number
  title: string
  slug: string
  type: 'country_guide' | 'article' | 'deal' | 'job'
  excerpt?: string
  country?: string
  countryFlag?: string
  matchReason?: string
}

interface ArticlesSectionProps {
  userId: string | null
}

const TYPE_STYLES: Record<string, { icon: string; color: string }> = {
  country_guide: { icon: '🌍', color: 'purple' },
  article: { icon: '📰', color: 'blue' },
  deal: { icon: '🎫', color: 'green' },
  job: { icon: '💼', color: 'orange' },
}

export function ArticlesSection({ userId }: ArticlesSectionProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchContext, setSearchContext] = useState<string | null>(null)
  const [noResults, setNoResults] = useState<string | null>(null)

  // SSE for live content suggestions
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('content_suggestion', (e) => {
      const data = JSON.parse(e.data)

      // Clear no results if we got a suggestion
      setNoResults(null)

      setArticles(prev => {
        // Dedupe by id and type
        const key = `${data.type}-${data.id}`
        const existing = prev.find(a => `${a.type}-${a.id}` === key)
        if (existing) return prev

        // Add new, keep max 10
        const newArticle: Article = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          type: data.type,
          excerpt: data.excerpt,
          country: data.country,
          countryFlag: data.country_flag,
          matchReason: data.match_reason,
        }

        return [newArticle, ...prev].slice(0, 10)
      })

      if (data.search_context) {
        setSearchContext(data.search_context)
      }
    })

    eventSource.addEventListener('content_no_results', (e) => {
      const data = JSON.parse(e.data)
      setNoResults(data.query || 'your search')
      setSearchContext(data.query)
    })

    eventSource.addEventListener('content_search', (e) => {
      const data = JSON.parse(e.data)
      setSearchContext(data.query)
      setLoading(true)
    })

    eventSource.addEventListener('content_search_complete', () => {
      setLoading(false)
    })

    return () => eventSource.close()
  }, [userId])

  // Fetch initial recommendations based on user profile
  useEffect(() => {
    if (!userId) return

    const fetchRecommendations = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/content/recommendations`,
          { headers: { 'X-Stack-User-Id': userId } }
        )
        if (res.ok) {
          const data = await res.json()
          setArticles(data.articles || [])
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId])

  const getArticleUrl = (article: Article) => {
    const baseUrl = 'https://relocation.quest'
    switch (article.type) {
      case 'country_guide':
        return `${baseUrl}/countries/${article.slug}`
      case 'job':
        return `${baseUrl}/jobs/${article.slug}`
      case 'deal':
        return `${baseUrl}/deals/${article.slug}`
      default:
        return `${baseUrl}/articles/${article.slug}`
    }
  }

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to see recommendations</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <h2 className="font-semibold">Relevant Content</h2>
        </div>
        {searchContext && (
          <div className="text-xs text-gray-400 mt-1">
            Based on: "{searchContext}"
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {loading && articles.length === 0 && (
          <div className="text-center text-gray-400 py-8 animate-pulse">
            Searching content...
          </div>
        )}

        {/* No Results Message */}
        {noResults && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <span className="text-2xl mb-2 block">🔍</span>
            <p className="text-yellow-400 text-sm font-medium">
              No articles found for "{noResults}"
            </p>
            <p className="text-yellow-500/70 text-xs mt-1">
              We don't have content about this topic yet
            </p>
          </div>
        )}

        {/* Articles List */}
        {articles.length > 0 ? (
          articles.map((article, idx) => {
            const style = TYPE_STYLES[article.type] || { icon: '📄', color: 'gray' }

            return (
              <a
                key={`${article.type}-${article.id}`}
                href={getArticleUrl(article)}
                target="_blank"
                rel="noopener noreferrer"
                className={`block p-3 rounded-lg border transition-all hover:scale-[1.02] ${
                  idx === 0
                    ? `bg-${style.color}-500/10 border-${style.color}-500/30 hover:border-${style.color}-500/50`
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {article.countryFlag && (
                    <span className="text-2xl">{article.countryFlag}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                        {style.icon} {article.type.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm line-clamp-2">
                      {article.title}
                    </h4>
                    {article.excerpt && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    {article.matchReason && (
                      <p className="text-xs text-purple-400 mt-1 italic">
                        "{article.matchReason}"
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm flex-shrink-0">→</span>
                </div>
              </a>
            )
          })
        ) : !loading && !noResults && (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">No recommendations yet</p>
            <p className="text-xs">Mention a country or topic to see relevant content</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/10 flex-shrink-0">
        <a
          href="https://relocation.quest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300 transition"
        >
          Browse all content on relocation.quest →
        </a>
      </div>
    </div>
  )
}
