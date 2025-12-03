// ZEP types for the frontend
// Actual ZEP queries go through the Quest gateway

export interface ZepNode {
  id: string
  label: string
  type: 'user' | 'fact' | 'entity'
}

export interface ZepEdge {
  source: string
  target: string
  relation: string
  weight: number
}

export interface ZepSearchResult {
  nodes: ZepNode[]
  edges: ZepEdge[]
  query: string
}

// These functions would call the gateway, not ZEP directly
// The gateway handles ZEP authentication and queries

export async function searchZepViaGateway(
  query: string,
  userId?: string
): Promise<ZepSearchResult> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/knowledge/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'X-User-Id': userId }),
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!response.ok) {
      return { nodes: [], edges: [], query }
    }

    return await response.json()
  } catch (error) {
    console.error('ZEP search via gateway error:', error)
    return { nodes: [], edges: [], query }
  }
}

export async function getUserFactsViaGateway(userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/facts`,
      {
        headers: {
          'X-User-Id': userId,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.facts || []
  } catch (error) {
    console.error('Get user facts error:', error)
    return []
  }
}
