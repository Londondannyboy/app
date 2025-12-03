import { NextRequest, NextResponse } from 'next/server'
import { approveConfirmation, rejectConfirmation } from '@/lib/api-clients'

/**
 * POST /api/user/profile/confirm-fact
 *
 * Approve or reject a pending HITL confirmation
 *
 * Body: { confirmationId: string, action: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const { confirmationId, action } = await request.json()

    if (!confirmationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid confirmationId or action' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      await approveConfirmation(userId, confirmationId)
      return NextResponse.json({
        success: true,
        action: 'approved',
        message: 'Fact confirmed and saved to your profile'
      })
    } else {
      await rejectConfirmation(userId, confirmationId)
      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Confirmation rejected'
      })
    }
  } catch (error) {
    console.error('Error processing confirmation:', error)
    return NextResponse.json(
      { error: 'Failed to process confirmation' },
      { status: 500 }
    )
  }
}
