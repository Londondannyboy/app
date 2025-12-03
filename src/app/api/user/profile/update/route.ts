import { NextRequest, NextResponse } from 'next/server'
import { updateUserProfile } from '@/lib/api-clients'

/**
 * POST /api/user/profile/update
 *
 * Update user profile fields
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const updates = await request.json()

    await updateUserProfile(userId, updates)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
