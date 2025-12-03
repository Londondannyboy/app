import type { KnowledgeGraphContext } from '@/lib/types'

const ZEP_API_KEY = process.env.ZEP_API_KEY!
const ZEP_BASE_URL = 'https://api.getzep.com/api/v2'

export interface ZepSearchOptions {
  graphId?: string
  limit?: number
  scope?: 'edges' | 'nodes' | 'both'
}

/**
 * Search Zep knowledge graph for information
 *
 * @example
 * const result = await searchKnowledgeGraph('cost of living in Portugal', {
 *   graphId: 'relocation'
 * })
 * console.log(result.formatted) // Ready for LLM prompt
 */
export async function searchKnowledgeGraph(
  query: string,
  options: ZepSearchOptions = {}
): Promise<KnowledgeGraphContext> {
  const {
    graphId = process.env.ZEP_GRAPH_ID_RELOCATION || 'relocation',
    limit = 10,
    scope = 'edges'
  } = options

  try {
    // Search edges (facts/relationships)
    const edgesResponse = await fetch(
      `${ZEP_BASE_URL}/graph/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${ZEP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          graph_id: graphId,
          query,
          scope: 'edges',
          limit
        })
      }
    )

    if (!edgesResponse.ok) {
      const errorText = await edgesResponse.text()
      throw new Error(`ZEP API error: ${edgesResponse.status} - ${errorText}`)
    }

    const edgesData = await edgesResponse.json()

    // Optionally search nodes (entities)
    let nodesData = { nodes: [] }
    if (scope === 'nodes') {
      const nodesResponse = await fetch(
        `${ZEP_BASE_URL}/graph/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Api-Key ${ZEP_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            graph_id: graphId,
            query,
            scope: 'nodes',
            limit: Math.floor(limit / 2)
          })
        }
      )

      if (nodesResponse.ok) {
        nodesData = await nodesResponse.json()
      }
    }

    const edges = (edgesData.edges || []).map((e: any) => ({
      fact: e.fact || String(e),
      type: e.name || 'unknown',
      score: e.score || 0,
      attributes: e.attributes || {}
    }))

    const nodes = (nodesData.nodes || []).map((n: any) => ({
      name: n.name || 'unknown',
      type: n.labels?.[0] || 'Entity',
      summary: n.summary || '',
      score: n.score || 0,
      attributes: n.attributes || {}
    }))

    return {
      edges,
      nodes,
      formatted: formatForLLM(edges, nodes)
    }
  } catch (error) {
    console.error('ZEP search error:', error)
    return {
      edges: [],
      nodes: [],
      formatted: ''
    }
  }
}

function formatForLLM(edges: any[], nodes: any[]): string {
  const parts: string[] = []

  // Format facts from edges
  if (edges.length > 0) {
    const facts = edges
      .slice(0, 5)
      .map(e => e.fact)
      .filter(f => f && f.length > 10)
      .map(f => `- ${f}`)

    if (facts.length > 0) {
      parts.push(`FACTS:\n${facts.join('\n')}`)
    }
  }

  // Format entities by type
  if (nodes.length > 0) {
    const byType: Record<string, any[]> = {}

    nodes.slice(0, 8).forEach(node => {
      const type = node.type
      if (!byType[type]) byType[type] = []
      byType[type].push(node)
    })

    for (const [type, typeNodes] of Object.entries(byType)) {
      const entries = typeNodes.slice(0, 3).map(n => {
        let entry = `- ${n.name}`
        if (n.summary) entry += `: ${n.summary.substring(0, 150)}`
        return entry
      })

      if (entries.length > 0) {
        parts.push(`${type.toUpperCase()}S:\n${entries.join('\n')}`)
      }
    }
  }

  return parts.join('\n\n')
}

/**
 * Sync user facts to ZEP user graph (for personalization)
 * Uses user_id to automatically create/update user-specific graph
 */
export async function syncUserProfile(
  userId: string,
  facts: Array<{ fact_type: string; fact_value: any }>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing ${facts.length} facts to ZEP for user ${userId}`)

    // Add fact triplets to user's graph
    // ZEP automatically creates user-specific graph when using user_id
    for (const fact of facts) {
      const value = typeof fact.fact_value === 'object'
        ? fact.fact_value.value
        : fact.fact_value

      const factText = `User has ${fact.fact_type}: ${value}`

      try {
        const response = await fetch(`${ZEP_BASE_URL}/graph/add`, {
          method: 'POST',
          headers: {
            'Authorization': `Api-Key ${ZEP_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            data: factText
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to add fact: ${errorText}`)
        }
      } catch (err) {
        console.error(`Error adding fact ${fact.fact_type}:`, err)
      }
    }

    console.log(`✅ Synced ${facts.length} facts to ZEP for user ${userId}`)
    return { success: true }
  } catch (error) {
    console.error('ZEP sync error:', error)
    return { success: false, error: String(error) }
  }
}
