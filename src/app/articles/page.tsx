'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser, UserButton } from '@stackframe/stack'

interface Article {
  id: number
  slug: string
  title: string
  excerpt: string | null
  article_mode: string
  country: string | null
  featured_asset_url: string | null
  hero_asset_url: string | null
  published_at: string | null
  word_count: number | null
}

interface ArticlesByMode {
  [mode: string]: Article[]
}

const MODE_CONFIG: Record<string, { emoji: string; label: string; description: string }> = {
  story: { emoji: '📖', label: 'Stories', description: 'Personal narratives and experiences' },
  guide: { emoji: '📋', label: 'Guides', description: 'Step-by-step practical guides' },
  yolo: { emoji: '🎯', label: 'Adventure', description: 'Bold moves and spontaneous decisions' },
  voices: { emoji: '🗣️', label: 'Expat Voices', description: 'Real experiences from expats' },
  topic: { emoji: '🔍', label: 'Deep Dives', description: 'In-depth analysis and research' },
  nomad: { emoji: '🌍', label: 'Digital Nomad', description: 'Remote work and location independence' },
}

function ArticleCard({ article }: { article: Article }) {
  const imageUrl = article.featured_asset_url || article.hero_asset_url
  const mode = MODE_CONFIG[article.article_mode] || MODE_CONFIG.topic
  const publishDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <a
      href={`https://relocation.quest/articles/${article.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-purple-500/10"
    >
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-900/20 to-pink-900/20">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-50">
            {mode.emoji}
          </div>
        )}

        {/* Mode badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs font-medium flex items-center gap-1.5">
            <span>{mode.emoji}</span>
            <span className="text-white/90">{mode.label}</span>
          </span>
        </div>

        {/* Country badge */}
        {article.country && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs font-medium text-white/90">
              {article.country}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:via-pink-400 group-hover:to-purple-400 transition-all line-clamp-2 mb-2">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-4">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {publishDate && <span>{publishDate}</span>}
            {article.word_count && (
              <span>{Math.ceil(article.word_count / 200)} min read</span>
            )}
          </div>
          <span className="text-purple-400 group-hover:text-pink-400 transition flex items-center gap-1">
            Read <span className="group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </div>
      </div>
    </a>
  )
}

function ArticleSection({
  mode,
  articles,
}: {
  mode: string
  articles: Article[]
}) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.topic

  if (articles.length === 0) return null

  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{config.emoji}</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{config.label}</h2>
          <p className="text-sm text-gray-400">{config.description}</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
          {articles.length} articles
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

export default function ArticlesPage() {
  const user = useUser()
  const [articlesByMode, setArticlesByMode] = useState<ArticlesByMode>({})
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/content/articles?limit=100`
        )
        if (res.ok) {
          const data = await res.json()
          const articles: Article[] = data.articles || []

          // Group by article_mode
          const grouped: ArticlesByMode = {}
          articles.forEach((article) => {
            const mode = article.article_mode || 'topic'
            if (!grouped[mode]) grouped[mode] = []
            grouped[mode].push(article)
          })

          setArticlesByMode(grouped)
          setTotalCount(articles.length)
        }
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  // Order of sections
  const sectionOrder = ['story', 'guide', 'yolo', 'voices', 'topic', 'nomad']

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
            >
              Quest
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/chat" className="text-gray-400 hover:text-white transition">
                Chat
              </Link>
              <Link href="/voice" className="text-gray-400 hover:text-white transition">
                Voice
              </Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
                Dashboard
              </Link>
              <span className="text-white font-medium">Articles</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-400 hidden md:block">
                  {user.displayName || user.primaryEmail}
                </span>
                <UserButton />
              </>
            ) : (
              <Link
                href="/handler/sign-in"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Relocation Articles
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            In-depth guides, personal stories, and practical advice for relocating abroad.
            Everything you need to make your move.
          </p>

          {!loading && (
            <div className="flex flex-wrap justify-center gap-4">
              {sectionOrder.map((mode) => {
                const count = articlesByMode[mode]?.length || 0
                if (count === 0) return null
                const config = MODE_CONFIG[mode]
                return (
                  <a
                    key={mode}
                    href={`#${mode}`}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm hover:bg-white/10 hover:border-purple-500/50 transition flex items-center gap-2"
                  >
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                    <span className="text-purple-400">({count})</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Articles */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-white/10" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500 mb-4">No articles found</p>
            <p className="text-gray-600">Check back soon for new content!</p>
          </div>
        ) : (
          <>
            {sectionOrder.map((mode) => (
              <div key={mode} id={mode}>
                <ArticleSection mode={mode} articles={articlesByMode[mode] || []} />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            Content from{' '}
            <a
              href="https://relocation.quest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              relocation.quest
            </a>
          </p>
        </div>
      </footer>
    </main>
  )
}
