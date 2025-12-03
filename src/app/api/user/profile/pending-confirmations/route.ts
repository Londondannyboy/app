import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getOrCreateProfile } from '@/lib/api-clients'

const sql = neon(process.env.DATABASE_URL!)

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

    // Get user profile (create if doesn't exist)
    const profileId = await getOrCreateProfile(userId)

    // Get pending confirmations
    const confirmations = await sql`
      SELECT
        id, fact_type, old_value, new_value,
        source, confidence, user_message, ai_response,
        created_at
      FROM user_fact_confirmations
      WHERE user_profile_id = ${profileId}
      AND status = 'pending'
      ORDER BY created_at DESC
    `

    return NextResponse.json({ confirmations })
  } catch (error) {
    console.error('Error fetching confirmations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch confirmations' },
      { status: 500 }
    )
  }
}
