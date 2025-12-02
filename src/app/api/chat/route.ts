import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export const runtime = 'edge'
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Get context from headers
    const appId = req.headers.get('X-App-Id') || 'relocation'
    const userId = req.headers.get('X-Stack-User-Id')

    // Build system message with app context
    const systemMessage = appId === 'relocation'
      ? 'You are Quest Relocation, helping users find their ideal country, job, and visa. Generate rich interactive UI components like article grids, job cards, and country comparisons when appropriate.'
      : 'You are Placement Quest, helping with private equity deal flow and placement agent networks. Generate interactive UI for deals, agents, and market analysis.'

    const result = streamText({
      model: createOpenAI({
        apiKey: process.env.THESYS_API_KEY,
        baseURL: 'https://api.thesys.dev/v1/embed',
      }).chat('c1/anthropic/claude-sonnet-4/v-20250815'),
      system: systemMessage,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
