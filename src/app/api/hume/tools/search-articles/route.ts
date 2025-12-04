import { NextRequest, NextResponse } from 'next/server'
import { searchArticles, getArticlesByCountry } from '@/lib/api-clients/neon'

/**
 * POST /api/hume/tools/search-articles
 *
 * Hume EVI Tool - searches articles in Neon database.
 *
 * Configure in Hume Dashboard:
 * - Tool Name: search_articles
 * - Description: Search for articles about specific countries or relocation topics
 * - Parameters:
 *   - query (string, required): Country name or topic to search for
 */
export async function POST(request: NextRequest) {
  console.log('🔧 Hume Tool called: search_articles')

  try {
    const body = await request.json()
    const query = body.parameters?.query || body.query

    console.log('Article search:', query)

    if (!query) {
      return NextResponse.json({
        content: 'Please specify what country or topic you want articles about.',
        type: 'tool_response'
      })
    }

    // Search articles
    const articles = await searchArticles(query, 'relocation', 3)

    if (!articles || articles.length === 0) {
      // Try by country
      const countryArticles = await getArticlesByCountry(query, 'relocation', 3)

      if (!countryArticles || countryArticles.length === 0) {
        return NextResponse.json({
          content: `I don't have specific articles about "${query}" yet.`,
          type: 'tool_response'
        })
      }

      const formatted = countryArticles.map(a =>
        `- "${a.title}" - ${a.excerpt?.substring(0, 100) || 'Read more about ' + query}...`
      ).join('\n')

      return NextResponse.json({
        content: `Found these articles about ${query}:\n${formatted}`,
        type: 'tool_response'
      })
    }

    const formatted = articles.map(a =>
      `- "${a.title}"${a.country_code ? ` (${a.country_code})` : ''} - ${a.excerpt?.substring(0, 100) || ''}...`
    ).join('\n')

    console.log('✅ Found articles:', articles.length)

    return NextResponse.json({
      content: `Relevant articles:\n${formatted}`,
      type: 'tool_response'
    })

  } catch (error) {
    console.error('Article search error:', error)
    return NextResponse.json({
      content: 'Unable to search articles at the moment.',
      type: 'tool_response'
    })
  }
}
