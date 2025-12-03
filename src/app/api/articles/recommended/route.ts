import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, searchArticles } from '@/lib/api-clients'

/**
 * GET /api/articles/recommended
 *
 * Get recommended articles based on user's destination countries
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get user's destination countries
    const user = await getOrCreateUser(userId)
    const destinations = user.destination_countries || []

    if (destinations.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        destinations: [],
        message: 'No destination preferences set. Tell us where you want to move!'
      })
    }

    // Search articles for each destination
    const allArticles = []
    for (const destination of destinations.slice(0, 3)) { // Limit to 3 countries
      const results = await searchArticles(destination, 'relocation', 5)
      allArticles.push(...results)
    }

    // Dedupe by slug and limit to 10
    const uniqueArticles = Array.from(
      new Map(allArticles.map(a => [a.slug, a])).values()
    ).slice(0, 10)

    return NextResponse.json({
      success: true,
      articles: uniqueArticles,
      destinations
    })
  } catch (error) {
    console.error('Error fetching recommended articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
