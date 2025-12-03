import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { messages, threadId } = await req.json()
    const appId = req.headers.get('X-App-Id') || 'relocation'
    const userId = req.headers.get('X-User-Id')

    // Build system prompt with app context
    const appContext = {
      relocation: {
        name: 'Quest Relocation',
        focus: 'helping users find their ideal country, job, and visa',
        capabilities: 'job search, country comparison, visa guidance, article discovery',
        features: 'Generate interactive UI with articles, job cards, country comparisons, and guides'
      },
      placement: {
        name: 'Placement Quest',
        focus: 'private equity deal flow and placement agent networks',
        capabilities: 'deal tracking, agent discovery, PE trends, market analysis',
        features: 'Generate interactive UI with deals, agent networks, and market reports'
      }
    }[appId as 'relocation' | 'placement']

    const systemPrompt = `You are ${appContext?.name}, ${appContext?.focus}.

Your capabilities: ${appContext?.capabilities}

IMPORTANT: You can generate rich, interactive UI components directly in your responses:

**UI Components** (use when appropriate):
- ArticleGrid: Display articles with images, reading time, bookmark buttons
- JobCards: Show job listings with salary, requirements, save/apply actions
- CountryComparison: Side-by-side country analysis with charts
- DashboardWidget: Personalized widgets based on user needs

**Artifacts** (use for comprehensive content):
- Relocation Guides: Complete guides for moving to specific countries
- Reports: Professional comparison reports or market analyses
- Presentations: Multi-slide presentations about topics
- Roadmaps: Step-by-step personalized plans

When users ask questions, provide helpful text responses AND generate appropriate UI/artifacts to enhance the experience. Always be conversational and helpful.

User ID: ${userId || 'anonymous'}`

    // Call TheSys C1 API (using correct endpoint and model)
    const response = await fetch('https://api.thesys.dev/v1/embed/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.THESYS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'c1/anthropic/claude-sonnet-4/v-20250815',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
        metadata: {
          appId,
          userId,
          threadId
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`TheSys API error: ${response.statusText}`)
    }

    // Stream the response back
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('C1 Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
