import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://relocation.quest'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/handler/',
          '/dashboard',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
