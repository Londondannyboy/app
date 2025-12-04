import { NextRequest, NextResponse } from 'next/server'
import { addTranscript } from '@/lib/api-clients/neon'

/**
 * POST /api/hume/webhook
 *
 * Hume EVI Webhook - receives conversation events including transcripts.
 * Configure in Hume Dashboard under "Webhooks" section.
 *
 * Webhook URL: https://new-omega-amber.vercel.app/api/hume/webhook
 */
export async function POST(request: NextRequest) {
  console.log('📥 Hume Webhook received')

  try {
    const body = await request.json()

    console.log('Webhook payload:', JSON.stringify(body, null, 2).substring(0, 500))

    // Extract event type and data
    const eventType = body.type || body.event_type
    const customSessionId = body.custom_session_id || body.session_id

    // Handle different event types
    if (eventType === 'chat_ended' || eventType === 'session_end') {
      // Full conversation ended - save transcript
      const messages = body.messages || body.transcript || []

      if (customSessionId && messages.length > 0) {
        console.log(`💾 Saving ${messages.length} messages for user ${customSessionId}`)

        for (const msg of messages) {
          const role = msg.role === 'user' || msg.type === 'user_message' ? 'user' : 'assistant'
          const content = msg.content || msg.message?.content || msg.text || ''

          if (content) {
            await addTranscript(customSessionId, {
              id: crypto.randomUUID(),
              role,
              content,
              timestamp: new Date().toISOString(),
              source: 'voice'
            })
          }
        }

        console.log('✅ Transcript saved successfully')
      }
    } else if (eventType === 'message' || eventType === 'user_message' || eventType === 'assistant_message') {
      // Individual message - save immediately
      if (customSessionId) {
        const role = eventType === 'user_message' ? 'user' : 'assistant'
        const content = body.content || body.message?.content || body.text || ''

        if (content) {
          await addTranscript(customSessionId, {
            id: crypto.randomUUID(),
            role,
            content,
            timestamp: new Date().toISOString(),
            source: 'voice'
          })
          console.log(`✅ Saved ${role} message`)
        }
      }
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to prevent Hume from retrying
    return NextResponse.json({ success: false, error: 'Processing error' })
  }
}

// Handle GET for webhook verification (some services send GET to verify URL)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Hume EVI Webhook',
    message: 'Webhook endpoint is active'
  })
}
