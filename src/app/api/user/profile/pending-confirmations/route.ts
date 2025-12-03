import { NextRequest, NextResponse } from 'next/server'
import { getPendingConfirmations } from '@/lib/api-clients'

/**
 * GET /api/user/profile/pending-confirmations
 *
 * Fetch pending HITL confirmations for a user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get pending confirmations from user record
    const confirmations = await getPendingConfirmations(userId)

    return NextResponse.json({ confirmations })
  } catch (error) {
    console.error('Error fetching confirmations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch confirmations' },
      { status: 500 }
    )
  }
}
