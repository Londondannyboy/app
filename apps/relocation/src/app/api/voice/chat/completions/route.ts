import { NextRequest } from 'next/server'
import {
  generateResponse,
  searchKnowledgeGraph,
  getUserFacts,
  getPersonalizedContext,
  searchArticles,
  getOrCreateProfile,
  storeFact
} from '@quest/api-clients'
import type {
  ChatCompletionRequest,
  SSEChunk,
  UserFact,
  VoiceContext
} from '@quest/types'

// Natural bridge expressions for complex queries
const BRIDGE_EXPRESSIONS = [
  "Let me think about that...",
  "Hmm, that's a great question...",
  "Let me look into that for you...",
  "One moment while I check...",
  "Good question, let me see..."
]

/**
 * POST /api/voice/chat/completions
 *
 * OpenAI-compatible endpoint for Hume EVI custom language model.
 * This is called by Hume during voice conversations.
 */
export async function POST(request: NextRequest) {
  // 🔥 CRITICAL: Log immediately to verify Hume is calling us
  console.log('🔥 HUME CALLED /api/voice/chat/completions')
  console.log('Time:', new Date().toISOString())

  try {
    const body: ChatCompletionRequest = await request.json()
    const { messages, user: userId } = body

    console.log('Request:', {
      userId,
      messageCount: messages.length
    })

    // Extract the latest user message
    const userMessage = extractLatestUserMessage(messages)
    if (!userMessage) {
      return createErrorResponse('No user message found')
    }

    console.log('Query:', userMessage.substring(0, 100))

    // Build rich context from all sources
    const context = await buildVoiceContext(userId || 'anonymous', userMessage)

    // Check if complex query (needs thinking time)
    const isComplex =
      userMessage.length > 50 ||
      /compare|difference|explain|tell me about|what are|how do|why/i.test(userMessage)

    // Create SSE stream response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const chunkId = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2)}`

        try {
          // Send bridge expression for complex queries
          if (isComplex) {
            const bridge = BRIDGE_EXPRESSIONS[
              Math.floor(Math.random() * BRIDGE_EXPRESSIONS.length)
            ]
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(createChunk(chunkId, bridge + ' ', false))}\n\n`)
            )
          }

          // Generate AI response
          const response = await generateResponse(
            userMessage,
            formatContextForLLM(context)
          )

          // Extract and store facts in background (don't block response)
          if (userId && userId !== 'anonymous') {
            extractAndStoreFacts(userId, userMessage, response, context)
              .catch(err => console.error('Fact extraction error:', err))
          }

          // Stream response word-by-word for natural voice pacing
          const words = response.split(' ')
          for (let i = 0; i < words.length; i++) {
            const isLast = i === words.length - 1
            const content = words[i] + (isLast ? '' : ' ')

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(createChunk(chunkId, content, isLast))}\n\n`)
            )

            // Small delay between words for natural pacing
            if (!isLast) {
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          console.log('✅ Response completed')

        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(createChunk(chunkId,
              'I apologize, I encountered an error. Please try again.',
              true))}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })

  } catch (error) {
    console.error('Voice endpoint error:', error)
    return createErrorResponse('Internal server error')
  }
}

/**
 * Extract the latest user message from conversation history
 */
function extractLatestUserMessage(messages: any[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        return msg.content
      }
      if (Array.isArray(msg.content)) {
        const textBlock = msg.content.find((b: any) => b.type === 'text')
        if (textBlock) return textBlock.text
      }
    }
  }
  return null
}

/**
 * Build comprehensive context from all available sources
 */
async function buildVoiceContext(
  userId: string,
  query: string
): Promise<VoiceContext> {
  const context: VoiceContext = {}

  // Parallel fetch all context sources
  const results = await Promise.allSettled([
    // User profile facts (repo)
    userId !== 'anonymous' ? getUserFacts(userId) : Promise.resolve([]),

    // Knowledge graph search (relocation graph)
    searchKnowledgeGraph(query, { graphId: 'relocation', scope: 'both', limit: 10 }),

    // SuperMemory personalization
    userId !== 'anonymous'
      ? getPersonalizedContext(userId, query)
      : Promise.resolve(''),

    // Relevant articles (relocation app)
    searchArticles(query, 'relocation', 3)
  ])

  if (results[0].status === 'fulfilled') {
    context.user_profile = results[0].value
  }

  if (results[1].status === 'fulfilled') {
    context.knowledge_graph = results[1].value
  }

  if (results[2].status === 'fulfilled' && results[2].value) {
    context.personal_memory = results[2].value
  }

  if (results[3].status === 'fulfilled') {
    context.relevant_articles = results[3].value
  }

  return context
}

/**
 * Format context for LLM prompt
 */
function formatContextForLLM(context: VoiceContext): string {
  const parts: string[] = []

  // User profile
  if (context.user_profile && context.user_profile.length > 0) {
    const facts = context.user_profile.map((f: UserFact) => {
      const value = typeof f.fact_value === 'object'
        ? f.fact_value.value
        : f.fact_value
      return `- ${f.fact_type}: ${value}`
    }).join('\n')

    parts.push(`USER PROFILE:\n${facts}`)
  }

  // Knowledge graph
  if (context.knowledge_graph?.formatted) {
    parts.push(`KNOWLEDGE BASE:\n${context.knowledge_graph.formatted}`)
  }

  // Personal memory
  if (context.personal_memory) {
    parts.push(`PREVIOUS CONVERSATIONS:\n${context.personal_memory}`)
  }

  // Relevant articles
  if (context.relevant_articles && context.relevant_articles.length > 0) {
    const articles = context.relevant_articles.map(a =>
      `- ${a.title}${a.country_name ? ` (${a.country_name})` : ''}: ${a.excerpt?.substring(0, 100)}...`
    ).join('\n')

    parts.push(`RELEVANT ARTICLES:\n${articles}`)
  }

  return parts.join('\n\n')
}

/**
 * Create SSE chunk in OpenAI format
 */
function createChunk(id: string, content: string, isLast: boolean): SSEChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'gemini-2.0-flash',
    choices: [{
      index: 0,
      delta: { content },
      finish_reason: isLast ? 'stop' : null
    }]
  }
}

/**
 * Create error response
 */
function createErrorResponse(message: string) {
  const chunk = createChunk(`error-${Date.now()}`, message, true)
  return new Response(
    `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
    {
      headers: { 'Content-Type': 'text/event-stream' }
    }
  )
}

/**
 * Extract facts from conversation and store them (with HITL flow)
 */
async function extractAndStoreFacts(
  userId: string,
  query: string,
  response: string,
  context: VoiceContext
): Promise<void> {
  // Simple regex patterns for fact extraction
  const patterns: Record<string, RegExp[]> = {
    destination: [
      /(?:move|relocate|moving|going) to (\w+)/i,
      /interested in (\w+)/i,
      /looking at (\w+)/i
    ],
    origin: [
      /(?:from|currently in|live in|based in) (\w+)/i
    ],
    budget: [
      /budget (?:is |of )?([€$£]?[\d,]+(?:k)?(?:\s*(?:per|\/)\s*month)?)/i
    ],
    timeline: [
      /(?:within|in|by|next) ([\w\s]+(?:months?|years?|weeks?))/i
    ]
  }

  const combinedText = `${query} ${response}`.toLowerCase()
  const profileId = await getOrCreateProfile(userId)

  for (const [factType, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const match = combinedText.match(regex)
      if (match && match[1]) {
        const value = match[1].trim()

        // Get existing facts
        const existingFacts = context.user_profile || []
        const existingFact = existingFacts.find(f => f.fact_type === factType)

        if (!existingFact) {
          // New fact - store it
          await storeFact(profileId, factType, { value }, 'voice', 0.7)
          console.log(`✅ Stored fact: ${factType} = ${value}`)
        }

        break // Only match first pattern per fact type
      }
    }
  }
}
