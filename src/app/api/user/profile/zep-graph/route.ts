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

    // Determine graph ID based on type
    const graphId = graphType === 'relocation'
      ? 'relocation'  // General relocation knowledge
      : `user_${userId}`  // User-specific graph

    console.log(`Fetching ZEP graph: ${graphId} (type: ${graphType})`)

    // Search knowledge graph
    const graphContext = await searchKnowledgeGraph('*', {
      graphId,
      scope: 'both',
      limit: 50
    })

    // Add debug info
    console.log(`ZEP graph results for ${graphId}:`, {
      nodes: graphContext.nodes.length,
      edges: graphContext.edges.length
    })

    return NextResponse.json({
      success: true,
      graphId,
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
