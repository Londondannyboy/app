import { NextRequest, NextResponse } from 'next/server'
import { getUserFacts } from '@/lib/api-clients'

/**
 * GET /api/user/profile/facts
 *
 * Get user's facts from users.facts JSONB array
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const facts = await getUserFacts(userId)

    return NextResponse.json({
      success: true,
      facts: facts.map((fact, index) => ({
        id: index,
        fact_type: fact.fact_type,
        fact_value: fact.fact_value,
        source: fact.source,
        confidence: fact.confidence,
        is_active: true,
        updated_at: fact.extracted_at
      }))
    })
  } catch (error) {
    console.error('Error fetching facts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch facts' },
      { status: 500 }
    )
  }
}
