import { NextRequest, NextResponse } from 'next/server'
import { getUserFacts, syncUserProfile } from '@/lib/api-clients'

/**
 * POST /api/user/profile/sync-to-zep
 *
 * Syncs user profile facts to Zep knowledge graph
 * Creates/updates a user-specific graph: user_{userId}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    console.log(`Syncing facts to Zep for user ${user_id}`)

    // Get user facts from database
    const facts = await getUserFacts(user_id)

    if (facts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No facts to sync'
      })
    }

    // Sync to Zep user graph
    const result = await syncUserProfile(user_id, facts)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to sync to Zep'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      synced: facts.length,
      graphId: `user_${user_id}`,
      message: `Synced ${facts.length} facts to Zep`
    })
  } catch (error) {
    console.error('Error syncing to Zep:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync to Zep' },
      { status: 500 }
    )
  }
}
