'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSSE } from '@/hooks/useSSE'
import Image from 'next/image'

interface Article {
  id: number
  type: string
  title: string
  slug: string
  excerpt?: string
  country?: string
  country_flag?: string
  featured_image?: string
  hero_image?: string
  match_reason?: string
}

interface ArticlesPanelProps {
  userId: string | null
}

export function ArticlesPanel({ userId }: ArticlesPanelProps) {
  const [suggestedArticles, setSuggestedArticles] = useState<Article[]>([])
  const [recentArticles, setRecentArticles] = useState<Article[]>([])
  const [noResults, setNoResults] = useState<string | null>(null)
  const [loadingRecent, setLoadingRecent] = useState(true)

  // Handle SSE events for content suggestions
  const handleSSEEvent = useCallback((eventType: string, data: unknown) => {
    const eventData = data as Record<string, unknown>

    if (eventType === 'content_suggestion') {
      setSuggestedArticles(prev => {
        // Deduplicate by id and type
        const key = `${eventData.type}-${eventData.id}`
        const exists = prev.some(a => `${a.type}-${a.id}` === key)
        if (exists) return prev

        return [...prev, {
          id: eventData.id as number,
          type: eventData.type as string,
          title: eventData.title as string,
          slug: eventData.slug as string,
          excerpt: eventData.excerpt as string | undefined,
          country: eventData.country as string | undefined,
          country_flag: eventData.country_flag as string | undefined,
          featured_image: eventData.featured_image as string | undefined,
          hero_image: eventData.hero_image as string | undefined,
          match_reason: eventData.match_reason as string | undefined,
        }].slice(-6) // Keep last 6
      })
      setNoResults(null)
    } else if (eventType === 'content_no_results') {
      setNoResults(eventData.query as string)
    } else if (eventType === 'content_search') {
      // Clear previous suggestions when new search starts
      setNoResults(null)
    }
  }, [])

  useSSE({
    userId,
    onEvent: handleSSEEvent,
    events: ['content_suggestion', 'content_no_results', 'content_search'],
  })

  // Fetch recent articles from relocation.quest
  useEffect(() => {
    const fetchRecentArticles = async () => {
      setLoadingRecent(true)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/content/recent?limit=4`,
          {
            headers: userId ? { 'X-User-Id': userId } : {},
          }
        )
        if (res.ok) {
          const data = await res.json()
          setRecentArticles(data.articles || [])
        }
      } catch (error) {
        console.error('Failed to fetch recent articles:', error)
      } finally {
        setLoadingRecent(false)
      }
    }

    fetchRecentArticles()
  }, [userId])

  const getArticleUrl = (article: Article) => {
    const baseUrl = 'https://relocation.quest'
    if (article.type === 'country_guide') {
      return `${baseUrl}/countries/${article.slug}`
    }
    return `${baseUrl}/articles/${article.slug}`
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'country_guide': return '🌍'
      case 'article': return '📄'
      case 'job': return '💼'
      case 'deal': return '🎁'
      default: return '📌'
    }
  }

  return (
    <div className="space-y-6">
      {/* Suggested Articles (from conversation) */}
      {(suggestedArticles.length > 0 || noResults) && (
        <div>
          <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Related to Your Conversation
          </h3>

          {noResults && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center mb-3">
              <p className="text-yellow-400 text-sm font-medium">
                No articles found for "{noResults}"
              </p>
              <p className="text-yellow-500/70 text-xs mt-1">
                We don't have content about this topic yet
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {suggestedArticles.map((article) => (
              <a
                key={`${article.type}-${article.id}`}
                href={getArticleUrl(article)}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/50 transition group"
              >
                <div className="flex gap-3">
                  {/* Image */}
                  {(article.featured_image || article.hero_image) && (
                    <div className="relative w-20 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5">
                      <Image
                        src={article.featured_image || article.hero_image || ''}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getTypeIcon(article.type)}</span>
                      {article.country_flag && (
                        <span className="text-sm">{article.country_flag}</span>
                      )}
                      <span className="text-xs text-gray-500 capitalize">
                        {article.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-medium text-white group-hover:text-purple-400 transition line-clamp-2">
                      {article.title}
                    </h4>

                    {article.excerpt && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}

                    {article.match_reason && (
                      <p className="text-xs text-purple-400/70 mt-1">
                        {article.match_reason}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent Articles */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Recent from Relocation.Quest
        </h3>

        {loadingRecent ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse p-3 bg-white/5 rounded-lg">
                <div className="flex gap-3">
                  <div className="w-20 h-16 bg-white/10 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-1/4" />
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recentArticles.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent articles available</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recentArticles.map((article) => (
              <a
                key={`recent-${article.id}`}
                href={getArticleUrl(article)}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/50 transition group"
              >
                <div className="flex gap-3">
                  {/* Image */}
                  {(article.featured_image || article.hero_image) && (
                    <div className="relative w-20 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5">
                      <Image
                        src={article.featured_image || article.hero_image || ''}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getTypeIcon(article.type)}</span>
                      {article.country_flag && (
                        <span className="text-sm">{article.country_flag}</span>
                      )}
                    </div>

                    <h4 className="text-sm font-medium text-white group-hover:text-purple-400 transition line-clamp-2">
                      {article.title}
                    </h4>

                    {article.excerpt && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Link to full site */}
        <a
          href="https://relocation.quest/articles"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 text-center text-xs text-purple-400 hover:text-purple-300 transition"
        >
          View all articles →
        </a>
      </div>
    </div>
  )
}
