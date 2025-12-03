import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeGraph } from '@/lib/api-clients'

/**
 * GET /api/user/profile/zep-graph?user_id=xxx&graph_type=user|relocation
 *
 * Returns user's knowledge graph from Zep
 * - graph_type=user: User's personal graph (preferences, facts, etc.)
 * - graph_type=relocation: General relocation knowledge graph
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const graphType = searchParams.get('graph_type') || 'user'

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    console.log(`Fetching ZEP graph: type=${graphType}, userId=${userId}`)

    // Search knowledge graph
    // For user graphs, ZEP uses user_id directly (not a custom graph_id)
    const graphContext = await searchKnowledgeGraph('*', {
      graphId: graphType === 'relocation' ? 'relocation' : userId,
      scope: 'edges',
      limit: 50
    })

    // Add debug info
    const displayId = graphType === 'relocation' ? 'relocation' : `user:${userId}`
    console.log(`ZEP graph results for ${displayId}:`, {
      nodes: graphContext.nodes.length,
      edges: graphContext.edges.length
    })

    return NextResponse.json({
      success: true,
      graphId: displayId,
      graphType,
      nodes: graphContext.nodes,
      edges: graphContext.edges
    })
  } catch (error) {
    console.error('Error fetching Zep graph:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch knowledge graph', message: String(error) },
      { status: 500 }
    )
  }
}
