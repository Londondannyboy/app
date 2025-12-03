import { NextRequest, NextResponse } from 'next/server'
import { getTranscripts } from '@/lib/api-clients'

/**
 * GET /api/user/transcripts
 *
 * Get user's conversation transcript messages
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const transcripts = await getTranscripts(userId, limit)

    return NextResponse.json({
      success: true,
      messages: transcripts
    })
  } catch (error) {
    console.error('Error fetching transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    )
  }
}
