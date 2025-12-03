import { MetadataRoute } from 'next'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://relocation.quest'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all published articles
  const articles = await sql`
    SELECT slug, published_at, updated_at
    FROM articles
    WHERE status = 'published'
    AND app = 'relocation'
    ORDER BY published_at DESC
  ` as Array<{
    slug: string
    published_at: string | null
    updated_at: string | null
  }>

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/chat`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/voice`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Dynamic article pages
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: article.updated_at
      ? new Date(article.updated_at)
      : article.published_at
      ? new Date(article.published_at)
      : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...articlePages]
}
