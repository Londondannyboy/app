import { NextRequest, NextResponse } from 'next/server'
import { getUserFacts } from '@/lib/api-clients'

/**
 * GET /api/user/profile/facts?user_id=xxx
 *
 * Returns all active facts for a user (their "repo")
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

    const facts = await getUserFacts(userId)

    return NextResponse.json({ facts })
  } catch (error) {
    console.error('Error fetching user facts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user facts' },
      { status: 500 }
    )
  }
}
