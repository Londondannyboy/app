import { NextRequest, NextResponse } from 'next/server'
import { searchArticles } from '@/lib/api-clients'

/**
 * GET /api/content/recent?limit=10&app=relocation
 *
 * Returns recent published articles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const app = searchParams.get('app') as 'relocation' | 'placement' || 'relocation'

    // Get recent articles (empty query returns most recent)
    const articles = await searchArticles('', app, limit)

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Error fetching recent content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent content' },
      { status: 500 }
    )
  }
}
