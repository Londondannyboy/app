import { NextRequest, NextResponse } from 'next/server'
import { addTranscript } from '@/lib/api-clients/neon'

/**
 * POST /api/user/transcripts/save
 *
 * Save multiple transcript messages to the database.
 * Called by the voice UI when a conversation ends.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, messages } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      )
    }

    console.log(`💾 Saving ${messages.length} transcript messages for user ${user_id}`)

    // Save each message
    for (const msg of messages) {
      await addTranscript(user_id, {
        id: crypto.randomUUID(),
        role: msg.role || 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || new Date().toISOString(),
        source: msg.source || 'voice'
      })
    }

    console.log('✅ Transcripts saved successfully')

    return NextResponse.json({
      success: true,
      saved: messages.length
    })

  } catch (error) {
    console.error('Error saving transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to save transcripts' },
      { status: 500 }
    )
  }
}
