import { NextRequest } from 'next/server'
import {
  generateResponse,
  extractFacts,
  searchKnowledgeGraph,
  getUserFacts,
  getPersonalizedContext,
  searchArticles,
  getOrCreateUser,
  addUserFact,
  addPendingConfirmation,
  storeMemory,
  syncUserProfile,
  addTranscript,
  syncProfileFieldsFromFacts
} from '@/lib/api-clients'
import type {
  ChatCompletionRequest,
  SSEChunk,
  UserFact,
  VoiceContext
} from '@/lib/types'

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
  console.log('ENV CHECK:', {
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasZep: !!process.env.ZEP_API_KEY,
    hasSupermemory: !!process.env.SUPERMEMORY_API_KEY
  })

  try {
    const body: ChatCompletionRequest = await request.json()
    const { messages, user: bodyUserId } = body

    // Hume sends custom_session_id as a query parameter, not in body
    const url = new URL(request.url)
    const customSessionId = url.searchParams.get('custom_session_id')
    const userId = customSessionId || bodyUserId || null

    console.log('Request:', {
      userId,
      customSessionId,
      bodyUserId,
      messageCount: messages.length
    })

    // Extract the latest user message
    const userMessage = extractLatestUserMessage(messages)
    if (!userMessage) {
      return createErrorResponse('No user message found')
    }

    console.log('Query:', userMessage.substring(0, 100))

    // Get or create user (auto-synced from Stack Auth)
    let user = null
    if (userId && userId !== 'anonymous') {
      user = await getOrCreateUser(userId)
    }

    // Build rich context from all sources
    const context = await buildVoiceContext(userId || 'anonymous', userMessage, user)

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
          const userName = user?.first_name || undefined
          const response = await generateResponse(
            userMessage,
            formatContextForLLM(context, userName)
          )

          // Extract and store facts in background (don't block response)
          if (userId && userId !== 'anonymous' && user) {
            extractAndStoreFacts(userId, userMessage, response, context)
              .catch(err => console.error('Fact extraction error:', err))

            // Store conversation in SuperMemory for future context
            storeMemory(
              userId,
              `User: ${userMessage}\nAssistant: ${response}`,
              {
                timestamp: new Date().toISOString(),
                source: 'voice',
                app: 'relocation'
              }
            ).catch(err => console.error('SuperMemory store error:', err))

            // Store transcript messages
            const timestamp = new Date().toISOString()
            addTranscript(userId, {
              id: `${Date.now()}-user`,
              role: 'user',
              content: userMessage,
              timestamp,
              source: 'voice'
            }).catch(err => console.error('Transcript store error (user):', err))

            addTranscript(userId, {
              id: `${Date.now()}-assistant`,
              role: 'assistant',
              content: response,
              timestamp,
              source: 'voice'
            }).catch(err => console.error('Transcript store error (assistant):', err))
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
  query: string,
  user: any
): Promise<VoiceContext> {
  const context: VoiceContext = {}

  // Add user profile data if available
  if (user) {
    context.profile_data = {
      current_country: user.current_country,
      destination_countries: user.destination_countries || [],
      nationality: user.nationality,
      budget_monthly: user.budget_monthly,
      timeline: user.timeline,
      relocation_motivation: user.relocation_motivation || []
    }
  }

  // Parallel fetch all context sources
  const results = await Promise.allSettled([
    // User facts
    userId !== 'anonymous' ? getUserFacts(userId) : Promise.resolve([]),

    // Knowledge graph search (relocation graph)
    searchKnowledgeGraph(query, { graphId: 'relocation', scope: 'edges', limit: 10 }),

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
function formatContextForLLM(context: VoiceContext, userName?: string): string {
  const parts: string[] = []

  // Add personalized system instruction if we have the user's name
  if (userName) {
    parts.push(`IMPORTANT: Address the user by their first name "${userName.split(' ')[0]}" in your responses to make the conversation feel personal and warm.`)
  }

  // User profile data
  if (context.profile_data) {
    const pd = context.profile_data
    const profileParts: string[] = []
    if (pd.current_country) profileParts.push(`- Current location: ${pd.current_country}`)
    if (pd.destination_countries && pd.destination_countries.length > 0) {
      profileParts.push(`- Interested in relocating to: ${pd.destination_countries.join(', ')}`)
    }
    if (pd.nationality) profileParts.push(`- Nationality: ${pd.nationality}`)
    if (pd.budget_monthly) profileParts.push(`- Monthly budget: ${pd.budget_monthly}`)
    if (pd.timeline) profileParts.push(`- Timeline: ${pd.timeline}`)
    if (pd.relocation_motivation && pd.relocation_motivation.length > 0) {
      profileParts.push(`- Motivation: ${pd.relocation_motivation.join(', ')}`)
    }

    if (profileParts.length > 0) {
      parts.push(`USER PROFILE:\n${profileParts.join('\n')}`)
    }
  }

  // User facts from conversations
  if (context.user_profile && context.user_profile.length > 0) {
    const facts = context.user_profile.map((f: UserFact) => {
      return `- ${f.fact_type}: ${f.fact_value}`
    }).join('\n')

    parts.push(`CONVERSATION FACTS:\n${facts}`)
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
      `- ${a.title}${a.country_code ? ` (${a.country_code})` : ''}: ${a.excerpt?.substring(0, 100)}...`
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
 * Extract facts from conversation and store them using LLM (with HITL flow)
 *
 * HITL Strategy:
 * - Facts marked as requires_confirmation go to pending_confirmations
 * - User can confirm/reject via LiveActivityPanel in the UI
 * - Non-critical facts are auto-approved and added directly
 */
async function extractAndStoreFacts(
  userId: string,
  query: string,
  response: string,
  context: VoiceContext
): Promise<void> {
  try {
    console.log('🔍 Extracting facts from conversation...')

    // Get existing facts for context
    const existingFacts = (context.user_profile || []).map(f => ({
      fact_type: f.fact_type,
      fact_value: f.fact_value
    }))

    // Use LLM to extract structured facts
    const extractedFacts = await extractFacts(query, response, existingFacts)

    if (extractedFacts.length === 0) {
      console.log('ℹ️ No new facts extracted from conversation')
      return
    }

    console.log(`📝 Processing ${extractedFacts.length} extracted facts:`)

    for (const fact of extractedFacts) {
      const { fact_type, fact_value, confidence, requires_confirmation } = fact

      // Find existing fact of this type
      const existingFact = existingFacts.find(f => f.fact_type === fact_type)
      const isChange = existingFact && existingFact.fact_value !== fact_value

      if (requires_confirmation || isChange) {
        // Critical fact or changed value - requires HITL confirmation
        await addPendingConfirmation(userId, {
          fact_type,
          old_value: existingFact?.fact_value || null,
          new_value: fact_value,
          source: 'voice',
          confidence,
          user_message: query,
          ai_response: response
        })

        if (isChange) {
          console.log(`🔄 HITL: ${fact_type} changed from "${existingFact.fact_value}" to "${fact_value}" (pending confirmation)`)
        } else {
          console.log(`⚠️ HITL: New ${fact_type} = ${fact_value} (pending confirmation, confidence: ${confidence})`)
        }
      } else if (!existingFact) {
        // New non-critical fact - auto-approve
        await addUserFact(userId, {
          fact_type,
          fact_value,
          source: 'voice',
          confidence
        })
        console.log(`✅ Auto-stored fact: ${fact_type} = ${fact_value} (confidence: ${confidence})`)
      } else {
        console.log(`ℹ️ Skipped duplicate fact: ${fact_type} = ${fact_value}`)
      }
    }

    console.log('✅ Fact extraction completed')

    // Sync facts to profile fields (destination_countries, etc.)
    try {
      await syncProfileFieldsFromFacts(userId)
      console.log('✅ Profile fields synced from facts')
    } catch (profileError) {
      console.error('❌ Profile sync error:', profileError)
    }

    // Sync all user facts to ZEP for personalized context
    try {
      const allUserFacts = await getUserFacts(userId)
      if (allUserFacts.length > 0) {
        await syncUserProfile(userId, allUserFacts)
        console.log('✅ ZEP sync completed')
      }
    } catch (syncError) {
      console.error('❌ ZEP sync error:', syncError)
      // Don't throw - log but don't block conversation
    }

  } catch (error) {
    console.error('❌ Fact extraction error:', error)
    // Don't throw - log error but don't block conversation
  }
}
