import { NextRequest } from 'next/server'

/**
 * GET /api/dashboard/events?user_id=xxx
 *
 * Server-Sent Events endpoint for real-time dashboard updates
 * Streams live activity, fact changes, and agent actions
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return new Response('user_id is required', { status: 400 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`)
        )

        // Keep connection alive with heartbeat every 30s
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
            )
          } catch (e) {
            clearInterval(heartbeat)
          }
        }, 30000)

        // TODO: Implement actual event streaming when we have real-time events
        // For now, just keep the connection alive
        // Future: Subscribe to database changes, fact updates, agent actions

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          controller.close()
        })

      } catch (error) {
        console.error('SSE error:', error)
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
