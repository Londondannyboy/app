const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY!
const SUPERMEMORY_BASE_URL = 'https://api.supermemory.ai/v1'

/**
 * Get personalized context from past conversations
 */
export async function getPersonalizedContext(
  userId: string,
  currentQuery: string
): Promise<string> {
  try {
    const response = await fetch(`${SUPERMEMORY_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        query: currentQuery,
        limit: 5
      })
    })

    if (!response.ok) {
      return ''
    }

    const data = await response.json()
    const results = data.results || []

    return results
      .map((r: any) => r.content)
      .filter(Boolean)
      .join('\n')
  } catch (error) {
    console.error('SuperMemory error:', error)
    return ''
  }
}

/**
 * Store conversation memory
 */
export async function storeMemory(
  userId: string,
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await fetch(`${SUPERMEMORY_BASE_URL}/memories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        content,
        metadata
      })
    })
  } catch (error) {
    console.error('SuperMemory store error:', error)
  }
}
