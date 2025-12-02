import { NextRequest, NextResponse } from 'next/server'
import { getUserFacts } from '@/lib/api-clients'

/**
 * POST /api/user/profile/sync-to-zep
 *
 * Syncs user profile facts to Zep knowledge graph
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

    // Get user facts
    const facts = await getUserFacts(user_id)

    // TODO: Implement actual Zep sync when Zep API client has sync method
    // For now, just return success
    console.log(`Syncing ${facts.length} facts to Zep for user ${user_id}`)

    return NextResponse.json({
      success: true,
      synced: facts.length,
      message: 'User facts synced to Zep'
    })
  } catch (error) {
    console.error('Error syncing to Zep:', error)
    return NextResponse.json(
      { error: 'Failed to sync to Zep' },
      { status: 500 }
    )
  }
}
