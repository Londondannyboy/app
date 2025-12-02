'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser, UserButton } from '@stackframe/stack'
import MuxPlayer from '@mux/mux-player-react'

interface Article {
  id: number
  slug: string
  title: string
  excerpt: string | null
  article_mode: string
  country: string | null
  country_name: string | null
  flag_emoji: string | null
  featured_asset_url: string | null
  hero_asset_url: string | null
  video_playback_id: string | null
  published_at: string | null
  word_count: number | null
  is_featured: boolean | null
}

interface ArticlesByMode {
  [mode: string]: Article[]
}

const MODE_CONFIG: Record<string, { label: string; icon: string; gradient: string; accent: string }> = {
  story: { label: 'Stories', icon: '📖', gradient: 'from-amber-500 to-orange-600', accent: '#f59e0b' },
  guide: { label: 'Guides', icon: '📋', gradient: 'from-blue-500 to-indigo-600', accent: '#3b82f6' },
  yolo: { label: 'YOLO', icon: '🚀', gradient: 'from-pink-500 to-rose-600', accent: '#ec4899' },
  voices: { label: 'Voices', icon: '💬', gradient: 'from-purple-500 to-violet-600', accent: '#8b5cf6' },
  topic: { label: 'Deep Dives', icon: '🔍', gradient: 'from-emerald-500 to-teal-600', accent: '#10b981' },
  nomad: { label: 'Digital Nomad', icon: '🌍', gradient: 'from-cyan-500 to-blue-600', accent: '#06b6d4' },
}

function getThumbnail(article: Article, index: number): string {
  if (!article.video_playback_id) return ''
  const baseTime = article.article_mode === 'topic' ? 1 + (index % 6) * 2 : 5
  return `https://image.mux.com/${article.video_playback_id}/thumbnail.jpg?time=${baseTime}&width=800`
}

function ArticleCard({ article, index }: { article: Article; index: number }) {
  const config = MODE_CONFIG[article.article_mode] || MODE_CONFIG.topic
  const thumbnail = getThumbnail(article, index)
  const fallbackImage = article.featured_asset_url || article.hero_asset_url

  const publishDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block transition-all duration-400 hover:-translate-y-2 hover:scale-[1.02]"
    >
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden h-full hover:border-white/20">
        {/* Image/Video Thumbnail */}
        <div className="relative aspect-video">
          {thumbnail || fallbackImage ? (
            <>
              <Image
                src={thumbnail || fallbackImage || ''}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Badges */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                {article.flag_emoji && (
                  <span className="text-2xl">{article.flag_emoji}</span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${config.gradient}`}>
                  {config.icon} {config.label}
                </span>
              </div>

              {/* Play Button Overlay */}
              {article.video_playback_id && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <span className="text-2xl text-gray-900 ml-1">▶</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${config.gradient} opacity-30 flex items-center justify-center`}>
              <span className="text-6xl opacity-50">{config.icon}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-amber-400 transition-colors">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-gray-500 text-sm line-clamp-2 mb-4">{article.excerpt}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-xs">{publishDate}</span>
            <span className="text-amber-500 text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Read <span>→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function ArticlesPage() {
  const user = useUser()
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesByMode, setArticlesByMode] = useState<ArticlesByMode>({})
  const [loading, setLoading] = useState(true)
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/content/articles?limit=100`
        )
        if (res.ok) {
          const data = await res.json()
          const fetchedArticles: Article[] = data.articles || []
          setArticles(fetchedArticles)

          // Find featured article (with video, preferably story mode)
          const featured = fetchedArticles.find(a => a.video_playback_id && a.article_mode === 'story')
            || fetchedArticles.find(a => a.video_playback_id)
          setFeaturedArticle(featured || null)

          // Group by article_mode
          const grouped: ArticlesByMode = {}
          fetchedArticles.forEach((article) => {
            const mode = article.article_mode || 'topic'
            if (!grouped[mode]) grouped[mode] = []
            grouped[mode].push(article)
          })
          setArticlesByMode(grouped)
        }
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  const sectionOrder = ['story', 'guide', 'yolo', 'voices', 'topic', 'nomad']
  const videoCount = articles.filter(a => a.video_playback_id).length

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              <span className="text-white">Quest</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              <Link href="/voice" className="text-gray-400 hover:text-white transition-colors">Voice</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
              <span className="text-amber-500 font-semibold">Articles</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <UserButton />
              ) : (
                <Link
                  href="/handler/sign-in"
                  className="px-4 py-2 rounded-full text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative min-h-[80vh] flex items-center pt-20">
        {featuredArticle?.video_playback_id && (
          <div className="absolute inset-0 overflow-hidden">
            <MuxPlayer
              playbackId={featuredArticle.video_playback_id}
              autoPlay="muted"
              loop
              muted
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto opacity-40"
              style={{ '--controls': 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/80" />
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <span className="bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-amber-400">
                ✨ {articles.length} Expert Articles
              </span>
              <span className="bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-purple-400">
                🎬 {videoCount} With Video
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none">
              <span className="bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Expert
              </span>
              <br />
              <span className="text-white">Insights</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed">
              Deep-dive guides, real expat stories, and actionable advice for your international relocation journey.
            </p>

            {featuredArticle && (
              <Link
                href={`/articles/${featuredArticle.slug}`}
                className="group inline-flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 px-8 py-4 rounded-2xl hover:bg-white/10 transition-all"
                style={{ boxShadow: '0 0 60px -15px rgba(245, 158, 11, 0.3)' }}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden relative">
                  <Image
                    src={getThumbnail(featuredArticle, 0)}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">Featured</p>
                  <p className="text-white font-bold line-clamp-1">{featuredArticle.title}</p>
                </div>
                <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {!loading && articles.length > 0 && (
        <section className="relative z-10 py-8 border-t border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: articlesByMode.story?.length || 0, label: 'Stories', icon: '📖' },
                { value: articlesByMode.guide?.length || 0, label: 'Guides', icon: '📋' },
                { value: (articlesByMode.yolo?.length || 0) + (articlesByMode.voices?.length || 0), label: 'Experiences', icon: '🌍' },
                { value: articlesByMode.topic?.length || 0, label: 'Deep Dives', icon: '🔍' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl font-black bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 text-sm mt-1">{stat.icon} {stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mode Filter */}
      {!loading && articles.length > 0 && (
        <section className="sticky top-16 z-40 py-4 bg-white/5 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {sectionOrder.filter(mode => articlesByMode[mode]?.length > 0).map(mode => {
                const config = MODE_CONFIG[mode]
                return (
                  <a
                    key={mode}
                    href={`#${mode}`}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap flex items-center gap-2 bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity`}
                  >
                    {config.icon} {config.label}
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {articlesByMode[mode].length}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Articles Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-white/10" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-full" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500 mb-4">No articles found</p>
            <p className="text-gray-600">Check back soon for new content!</p>
          </div>
        ) : (
          <>
            {sectionOrder.filter(mode => articlesByMode[mode]?.length > 0).map(mode => {
              const config = MODE_CONFIG[mode]
              const modeArticles = articlesByMode[mode]
              return (
                <section key={mode} id={mode} className="mb-20">
                  <div className="flex items-center gap-4 mb-10">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-2xl`}>
                      {config.icon}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">{config.label}</h2>
                      <p className="text-gray-500">
                        {modeArticles.length} {modeArticles.length === 1 ? 'article' : 'articles'}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modeArticles.map((article, index) => (
                      <ArticleCard key={article.id} article={article} index={index} />
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}
      </div>

      {/* CTA */}
      <section className="relative z-10 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Ready to Move?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Explore our comprehensive country guides for everything you need.
          </p>
          <a
            href="https://relocation.quest/guides"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
            style={{ boxShadow: '0 0 60px -15px rgba(245, 158, 11, 0.3)' }}
          >
            Browse Country Guides <span className="text-2xl">→</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-between items-center">
            <p className="text-xl font-bold">
              Quest <span className="text-amber-500">Articles</span>
            </p>
            <div className="flex gap-8">
              <Link href="/voice" className="text-gray-500 hover:text-white transition-colors">Voice</Link>
              <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors">Dashboard</Link>
              <a href="https://relocation.quest" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                Relocation Quest
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
            Content from relocation.quest
          </div>
        </div>
      </footer>
    </main>
  )
}
