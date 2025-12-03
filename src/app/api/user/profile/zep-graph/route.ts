import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeGraph } from '@/lib/api-clients'

/**
 * GET /api/user/profile/zep-graph?user_id=xxx
 *
 * Returns user's personalized knowledge graph from Zep
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Search knowledge graph for user-specific context
    const graphContext = await searchKnowledgeGraph(`user:${userId}`, {
      graphId: 'relocation',
      scope: 'both',
      limit: 20
    })

    return NextResponse.json({
      success: true,
      nodes: graphContext.nodes,
      edges: graphContext.edges
    })
  } catch (error) {
    console.error('Error fetching Zep graph:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph' },
      { status: 500 }
    )
  }
}
