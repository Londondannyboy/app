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
      `${ZEP_BASE_URL}/graph/${graphId}/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZEP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          scope: 'edges',
          limit
        })
      }
    )

    if (!edgesResponse.ok) {
      throw new Error(`ZEP API error: ${edgesResponse.status}`)
    }

    const edgesData = await edgesResponse.json()

    // Optionally search nodes (entities)
    let nodesData = { nodes: [] }
    if (scope === 'nodes' || scope === 'both') {
      const nodesResponse = await fetch(
        `${ZEP_BASE_URL}/graph/${graphId}/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ZEP_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
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
 * Creates/updates nodes and edges in a user-specific graph
 */
export async function syncUserProfile(
  userId: string,
  facts: Array<{ fact_type: string; fact_value: any }>
): Promise<{ success: boolean; error?: string }> {
  const graphId = `user_${userId}`

  try {
    // Add user node if it doesn't exist
    const userNode = {
      name: `User ${userId.slice(0, 8)}`,
      type: 'User',
      uuid: userId,
      attributes: {
        user_id: userId,
        created_at: new Date().toISOString()
      }
    }

    await fetch(`${ZEP_BASE_URL}/graph/${graphId}/nodes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZEP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nodes: [userNode] })
    })

    // Add fact nodes and edges
    const factNodes = facts.map(fact => {
      const value = typeof fact.fact_value === 'object'
        ? fact.fact_value.value
        : fact.fact_value

      return {
        name: String(value),
        type: fact.fact_type.charAt(0).toUpperCase() + fact.fact_type.slice(1),
        uuid: `${userId}_${fact.fact_type}`,
        attributes: {
          fact_type: fact.fact_type,
          value: String(value)
        }
      }
    })

    if (factNodes.length > 0) {
      await fetch(`${ZEP_BASE_URL}/graph/${graphId}/nodes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZEP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nodes: factNodes })
      })

      // Create edges connecting user to facts
      const edges = factNodes.map(node => ({
        source: userId,
        target: node.uuid,
        fact: `User has ${node.attributes.fact_type}: ${node.attributes.value}`,
        name: `HAS_${node.type.toUpperCase()}`
      }))

      await fetch(`${ZEP_BASE_URL}/graph/${graphId}/edges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ZEP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ edges })
      })
    }

    console.log(`✅ Synced ${facts.length} facts to ZEP graph ${graphId}`)
    return { success: true }
  } catch (error) {
    console.error('ZEP sync error:', error)
    return { success: false, error: String(error) }
  }
}
