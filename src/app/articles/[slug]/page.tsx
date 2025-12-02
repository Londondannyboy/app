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
  content: string | null
  article_mode: string
  article_angle: string | null
  country: string | null
  country_name: string | null
  flag_emoji: string | null
  featured_asset_url: string | null
  hero_asset_url: string | null
  video_playback_id: string | null
  published_at: string | null
  word_count: number | null
  is_featured: boolean | null
  payload: {
    faq?: Array<{ question: string; answer: string }>
    callouts?: Array<{ type: string; title: string; content: string }>
    stat_highlight?: { value: string; label: string; context: string }
    timeline?: Array<{ date: string; title: string; description: string }>
    sources?: Array<{ title: string; url: string }>
  } | null
  video_narrative: {
    playback_id?: string
    acts?: Record<string, { start: number; end: number; title: string }>
  } | null
}

interface RelatedArticle {
  id: number
  slug: string
  title: string
  excerpt: string | null
  video_playback_id: string | null
  article_mode: string
}

const MODE_CONFIG: Record<string, { label: string; icon: string; gradient: string }> = {
  story: { label: 'Story', icon: '📖', gradient: 'from-amber-500 to-orange-600' },
  guide: { label: 'Guide', icon: '📋', gradient: 'from-blue-500 to-indigo-600' },
  yolo: { label: 'YOLO', icon: '🚀', gradient: 'from-pink-500 to-rose-600' },
  voices: { label: 'Voices', icon: '💬', gradient: 'from-purple-500 to-violet-600' },
  topic: { label: 'Deep Dive', icon: '🔍', gradient: 'from-emerald-500 to-teal-600' },
  nomad: { label: 'Digital Nomad', icon: '🌍', gradient: 'from-cyan-500 to-blue-600' },
}

function getThumbnail(playbackId: string | null, time: number = 5): string {
  if (!playbackId) return ''
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=800`
}

export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = useUser()
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>('')

  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (!slug) return

    const fetchArticle = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/content/articles/${slug}`
        )
        if (!res.ok) {
          throw new Error('Article not found')
        }
        const data = await res.json()
        if (!data.article) {
          throw new Error('Article not found')
        }
        setArticle(data.article)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article')
      } finally {
        setLoading(false)
      }
    }

    const fetchRelated = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/content/articles?limit=4`
        )
        if (res.ok) {
          const data = await res.json()
          // Filter out the current article
          const related = (data.articles || [])
            .filter((a: RelatedArticle) => a.slug !== slug)
            .slice(0, 3)
          setRelatedArticles(related)
        }
      } catch (err) {
        console.error('Failed to fetch related articles:', err)
      }
    }

    fetchArticle()
    fetchRelated()
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">
        <div className="max-w-4xl mx-auto px-6 py-32 text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading article...</p>
        </div>
      </main>
    )
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">
        <div className="max-w-4xl mx-auto px-6 py-32 text-center">
          <p className="text-2xl text-gray-400 mb-4">{error || 'Article not found'}</p>
          <Link
            href="/articles"
            className="text-amber-500 hover:text-amber-400 transition-colors"
          >
            ← Back to articles
          </Link>
        </div>
      </main>
    )
  }

  const config = MODE_CONFIG[article.article_mode] || MODE_CONFIG.topic
  const publishDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null
  const readTime = article.word_count ? Math.ceil(article.word_count / 200) : 5

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              <span className="text-white">Quest</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              <Link href="/voice" className="text-gray-400 hover:text-white transition-colors">Voice</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/articles" className="text-amber-500">Articles</Link>
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

      {/* Hero with Video */}
      <header className="relative pt-16">
        {article.video_playback_id ? (
          <div className="relative">
            <MuxPlayer
              playbackId={article.video_playback_id}
              autoPlay="muted"
              loop
              muted
              className="w-full aspect-video max-h-[70vh] object-cover"
              style={{ '--controls': 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/80" />

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-4">
                  {article.flag_emoji && (
                    <span className="text-3xl">{article.flag_emoji}</span>
                  )}
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r ${config.gradient}`}>
                    {config.icon} {config.label}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg">
                  {article.title}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-900 to-[#0a0a0a] pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex items-center gap-3 mb-4">
                {article.flag_emoji && (
                  <span className="text-3xl">{article.flag_emoji}</span>
                )}
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r ${config.gradient}`}>
                  {config.icon} {config.label}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                {article.title}
              </h1>
            </div>
          </div>
        )}
      </header>

      {/* Article Meta */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                RQ
              </div>
              <span className="font-medium text-white">
                Relocation Quest
              </span>
            </div>
            {publishDate && (
              <>
                <span className="text-gray-600">•</span>
                <span>{publishDate}</span>
              </>
            )}
            {article.word_count && (
              <>
                <span className="text-gray-600">•</span>
                <span>{article.word_count.toLocaleString()} words</span>
              </>
            )}
            <span className="text-gray-600">•</span>
            <span>{readTime} min read</span>
          </div>
          {article.excerpt && (
            <p className="mt-4 text-lg text-amber-400/80 font-medium leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        {article.content ? (
          <div
            className="prose prose-lg prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-white
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-l-4 prose-h2:border-amber-500 prose-h2:pl-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-amber-500 prose-a:no-underline hover:prose-a:text-amber-400
              prose-strong:text-amber-400 prose-strong:font-semibold
              prose-ul:list-none prose-ul:pl-0 prose-ul:space-y-3
              prose-li:bg-white/5 prose-li:border-l-2 prose-li:border-amber-500 prose-li:px-4 prose-li:py-3 prose-li:rounded-r-lg
              prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:bg-white/5 prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:italic
            "
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No content available for this article.</p>
          </div>
        )}

        {/* Stat Highlight */}
        {article.payload?.stat_highlight && (
          <div className="my-12 p-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl text-center">
            <div className="text-5xl font-bold text-amber-400 mb-2">
              {article.payload.stat_highlight.value}
            </div>
            <div className="text-xl text-white font-medium mb-2">
              {article.payload.stat_highlight.label}
            </div>
            <div className="text-gray-400">
              {article.payload.stat_highlight.context}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {article.payload?.faq && article.payload.faq.length > 0 && (
          <div className="my-12">
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-amber-500 pl-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {article.payload.faq.map((item, idx) => (
                <details
                  key={idx}
                  className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5">
                    <span className="font-medium text-white">{item.question}</span>
                    <span className="text-amber-500 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-4 pb-4 text-gray-300">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Callouts */}
        {article.payload?.callouts && article.payload.callouts.length > 0 && (
          <div className="my-12 space-y-4">
            {article.payload.callouts.map((callout, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-xl border ${
                  callout.type === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : callout.type === 'tip'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{callout.type === 'warning' ? '⚠️' : callout.type === 'tip' ? '💡' : 'ℹ️'}</span>
                  <span className="font-semibold text-white">{callout.title}</span>
                </div>
                <p className="text-gray-300">{callout.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {article.payload?.timeline && article.payload.timeline.length > 0 && (
          <div className="my-12">
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-amber-500 pl-4">
              Timeline
            </h2>
            <div className="space-y-4 border-l-2 border-amber-500/30 pl-6">
              {article.payload.timeline.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-8 w-3 h-3 bg-amber-500 rounded-full" />
                  <div className="text-sm text-amber-400 font-medium">{item.date}</div>
                  <div className="text-white font-semibold">{item.title}</div>
                  <div className="text-gray-400 text-sm">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {article.payload?.sources && article.payload.sources.length > 0 && (
          <div className="my-12 p-6 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Sources</h3>
            <ul className="space-y-2">
              {article.payload.sources.map((source, idx) => (
                <li key={idx}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-400 underline"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Article Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10">
          <div className="flex items-center gap-4">
            {article.video_playback_id && (
              <Image
                src={getThumbnail(article.video_playback_id, 10)}
                alt=""
                width={64}
                height={64}
                className="rounded-full border-2 border-amber-500/30 object-cover"
              />
            )}
            <div>
              <p className="font-medium text-white">Relocation Quest Editorial Team</p>
              <p className="text-sm text-gray-500">
                Published {publishDate} • {article.word_count?.toLocaleString()} words
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/articles"
              className="inline-flex items-center text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              ← Back to articles
            </Link>
          </div>
        </footer>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="border-t border-white/10 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-white mb-8">More Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => {
                const relConfig = MODE_CONFIG[related.article_mode] || MODE_CONFIG.topic
                return (
                  <Link
                    key={related.id}
                    href={`/articles/${related.slug}`}
                    className="group block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1"
                  >
                    <div className="relative aspect-video">
                      {related.video_playback_id ? (
                        <Image
                          src={getThumbnail(related.video_playback_id, 5)}
                          alt={related.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${relConfig.gradient} opacity-30 flex items-center justify-center`}>
                          <span className="text-4xl">{relConfig.icon}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${relConfig.gradient}`}>
                          {relConfig.icon} {relConfig.label}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                        {related.title}
                      </h3>
                      {related.excerpt && (
                        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{related.excerpt}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
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
