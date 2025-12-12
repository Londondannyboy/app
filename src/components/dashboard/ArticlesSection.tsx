'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: number
  title: string
  slug: string
  type: 'country_guide' | 'article' | 'deal' | 'job'
  excerpt?: string
  country_code?: string
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
  const [destinations, setDestinations] = useState<string[]>([])
  const [message, setMessage] = useState<string>('')

  // Fetch recommended articles
  useEffect(() => {
    if (!userId) return

    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles/recommended', {
          headers: { 'X-User-Id': userId }
        })
        if (res.ok) {
          const data = await res.json()
          setArticles(data.articles || [])
          setDestinations(data.destinations || [])
          setMessage(data.message || '')
        }
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [userId])

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view recommendations</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <h2 className="font-semibold">Recommended for You</h2>
        </div>
        {destinations.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Based on: {destinations.join(', ')}
          </p>
        )}
      </div>

      {/* Articles */}
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-4 animate-pulse">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p>No recommendations yet</p>
            <p className="text-xs mt-2">{message || 'Tell us where you want to move!'}</p>
          </div>
        ) : (
          articles.map(article => {
            const style = TYPE_STYLES[article.type] || TYPE_STYLES.article
            return (
              <a
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="block p-3 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-purple-400 transition truncate">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded bg-${style.color}-500/20 text-${style.color}-400`}>
                        {(article.type || '').replace('_', ' ')}
                      </span>
                      {article.country_code && (
                        <span className="text-xs text-gray-500">
                          {article.country_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-500">
        {articles.length} articles
      </div>
    </div>
  )
}
