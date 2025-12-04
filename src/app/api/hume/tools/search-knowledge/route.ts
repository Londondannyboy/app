import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeGraph } from '@/lib/api-clients/zep'

/**
 * POST /api/hume/tools/search-knowledge
 *
 * Hume EVI Tool - searches the ZEP knowledge graph for relocation info.
 *
 * Configure in Hume Dashboard:
 * - Tool Name: search_knowledge
 * - Description: Search the knowledge base for information about countries, visas, cost of living, and relocation topics
 * - Parameters:
 *   - query (string, required): The topic or question to search for
 */
export async function POST(request: NextRequest) {
  console.log('🔧 Hume Tool called: search_knowledge')

  try {
    const body = await request.json()

    // Hume sends parameters in the request
    const query = body.parameters?.query || body.query

    console.log('Search query:', query)

    if (!query) {
      return NextResponse.json({
        content: 'Please specify what you want to search for.',
        type: 'tool_response'
      })
    }

    // Search the ZEP knowledge graph
    const results = await searchKnowledgeGraph(query, {
      graphId: 'relocation',
      scope: 'edges',
      limit: 5
    })

    if (!results || !results.formatted) {
      return NextResponse.json({
        content: `I don't have specific information about "${query}" in my knowledge base. I can still help based on general knowledge.`,
        type: 'tool_response'
      })
    }

    console.log('✅ Knowledge search results:', results.formatted.substring(0, 200))

    return NextResponse.json({
      content: `Knowledge Base Results:\n${results.formatted}`,
      type: 'tool_response'
    })

  } catch (error) {
    console.error('Knowledge search error:', error)
    return NextResponse.json({
      content: 'Unable to search knowledge base at the moment.',
      type: 'tool_response'
    })
  }
}
