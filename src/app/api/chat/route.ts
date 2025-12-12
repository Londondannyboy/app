import { NextRequest, NextResponse } from 'next/server'
import { getUser, getUserFacts, searchArticles, addPendingConfirmation } from '@/lib/api-clients/neon'

const BASE_SYSTEM_PROMPT = `You are Quest, a friendly relocation assistant helping people move to new countries.

## Your Personality
- Be warm, casual, and supportive - like a knowledgeable friend
- Greet users naturally: "Hey [Name]!" or "Good to have you back, [Name]!"
- Keep responses concise (2-3 paragraphs max)

## CRITICAL: Respect User Preferences
- If the user mentions a NEW country they're interested in, EMBRACE it enthusiastically
- NEVER say things like "let's stick with your original plans" or override their choices
- People change their minds - that's normal and good! Support their exploration
- If they said Spain before but now say Slovenia, respond with "Slovenia - great choice! Let me tell you about it..."

## Your Expertise
- Visa requirements and immigration
- Cost of living comparisons
- Job markets and opportunities
- Healthcare and education
- Tax implications
- Practical moving tips

Be specific and actionable. If you don't know something, say so. Always specify currency and timeframe for costs.`

const FACT_EXTRACTION_PROMPT = `You are a fact extraction assistant. Analyze the user's message and extract any relocation preferences or personal facts.

Extract ONLY if the user explicitly mentions these:
- destination: A country they want to move to (e.g., "I want to move to Slovenia")
- origin: Where they currently live (e.g., "I'm currently in the UK")
- timeline: When they want to move (e.g., "within 6 months", "next year")
- budget: Monthly budget for living expenses (e.g., "€2000/month")
- profession: Their job/career (e.g., "I'm a software developer")
- family_status: Family situation (e.g., "married with kids", "single")
- nationality: Their nationality/citizenship (e.g., "I'm British")

Respond ONLY with valid JSON. If no facts found, respond with: {"facts": []}

Example response:
{"facts": [{"type": "destination", "value": "Slovenia", "confidence": 0.9}]}

Important:
- Only extract facts the user EXPLICITLY states
- confidence should be 0.7-1.0 based on how clear the statement is
- Do NOT infer or guess - only extract what's directly stated`

async function extractFacts(
  userMessage: string,
  aiResponse: string,
  userId: string,
  apiKey: string
): Promise<void> {
  try {
    // Get current user data to check for changes
    const user = await getUser(userId)
    const existingFacts = await getUserFacts(userId)

    const response = await fetch('https://gateway.pydantic.dev/proxy/groq/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: FACT_EXTRACTION_PROMPT },
          { role: 'user', content: `User message: "${userMessage}"` },
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for consistent extraction
      }),
    })

    if (!response.ok) {
      console.error('Fact extraction failed:', response.status)
      return
    }

    const data = await response.json()
    const extractionText = data.choices?.[0]?.message?.content || ''

    console.log('Fact extraction result:', extractionText)

    // Parse the JSON response
    let extracted: { facts: Array<{ type: string; value: string; confidence: number }> }
    try {
      extracted = JSON.parse(extractionText)
    } catch {
      console.error('Failed to parse fact extraction JSON:', extractionText)
      return
    }

    if (!extracted.facts || extracted.facts.length === 0) {
      console.log('No facts extracted')
      return
    }

    // Process each extracted fact
    for (const fact of extracted.facts) {
      if (!fact.type || !fact.value || fact.confidence < 0.7) {
        continue
      }

      // Check if this is a new or changed value
      let oldValue: string | null = null

      // Check user profile fields
      if (fact.type === 'destination') {
        const existing = user?.destination_countries || []
        if (existing.includes(fact.value)) {
          console.log(`Destination "${fact.value}" already known, skipping`)
          continue
        }
        oldValue = existing.length > 0 ? existing.join(', ') : null
      } else if (fact.type === 'origin') {
        if (user?.current_country === fact.value) continue
        oldValue = user?.current_country || null
      } else if (fact.type === 'timeline') {
        if (user?.timeline === fact.value) continue
        oldValue = user?.timeline || null
      } else if (fact.type === 'nationality') {
        if (user?.nationality === fact.value) continue
        oldValue = user?.nationality || null
      } else {
        // Check existing facts
        const existingFact = existingFacts.find(f => f.fact_type === fact.type)
        if (existingFact?.fact_value === fact.value) continue
        oldValue = existingFact?.fact_value || null
      }

      // Create pending confirmation for HITL
      console.log(`Creating HITL confirmation for ${fact.type}: ${fact.value}`)

      await addPendingConfirmation(userId, {
        fact_type: fact.type,
        old_value: oldValue,
        new_value: fact.value,
        source: 'chat',
        confidence: fact.confidence,
        user_message: userMessage,
        ai_response: aiResponse,
      })

      console.log(`✅ HITL confirmation created for ${fact.type}`)
    }
  } catch (error) {
    console.error('Error in fact extraction:', error)
    // Don't throw - fact extraction failure shouldn't break the chat
  }
}

async function buildSystemPrompt(userId: string | null, userMessage: string): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT

  if (!userId) {
    prompt += '\n\nThe user is not signed in. Encourage them to sign in for personalized recommendations.'
    return prompt
  }

  try {
    // Fetch user profile from Neon
    const user = await getUser(userId)
    const facts = await getUserFacts(userId)

    if (user) {
      const profileParts: string[] = []

      if (user.first_name) {
        profileParts.push(`Name: ${user.first_name}`)
      }
      if (user.current_country) {
        profileParts.push(`Currently lives in: ${user.current_country}`)
      }
      if (user.destination_countries && user.destination_countries.length > 0) {
        profileParts.push(`Interested in relocating to: ${user.destination_countries.join(', ')}`)
      }
      if (user.nationality) {
        profileParts.push(`Nationality: ${user.nationality}`)
      }
      if (user.timeline) {
        profileParts.push(`Timeline: ${user.timeline}`)
      }
      if (user.budget_monthly) {
        profileParts.push(`Monthly budget: €${user.budget_monthly}`)
      }

      if (profileParts.length > 0) {
        prompt += `\n\n## User Profile\n${profileParts.join('\n')}`
      }
    }

    // Add facts from conversations
    if (facts && facts.length > 0) {
      const factsList = facts
        .filter(f => f.fact_value)
        .map(f => `- ${f.fact_type}: ${f.fact_value}`)
        .join('\n')
      if (factsList) {
        prompt += `\n\n## What We Know About This User\n${factsList}`
      }
    }

    // Search for relevant articles based on the user's message
    const relevantArticles = await searchArticles(userMessage, 'relocation', 3)
    if (relevantArticles.length > 0) {
      const articlesList = relevantArticles
        .map(a => `- "${a.title}" (${a.country || 'General'}) - /articles/${a.slug}`)
        .join('\n')
      prompt += `\n\n## Relevant Country Guides & Articles\nYou can reference these articles in your response:\n${articlesList}`
    }

    // Add destination-specific articles if user has destinations
    if (user?.destination_countries && user.destination_countries.length > 0) {
      prompt += `\n\nRemember: The user is specifically interested in ${user.destination_countries.join(' and ')}. Tailor your advice accordingly.`
    }

  } catch (error) {
    console.error('Error building context:', error)
    // Continue with base prompt if context fetching fails
  }

  return prompt
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, userId } = body

    console.log('Chat request:', { messageCount: messages?.length, userId })

    const apiKey = process.env.PYDANTIC_AI_GATEWAY_API_KEY

    if (!apiKey) {
      console.error('No API key found. PYDANTIC_AI_GATEWAY_API_KEY required.')
      return NextResponse.json(
        { error: 'Chat service not configured - missing PYDANTIC_AI_GATEWAY_API_KEY' },
        { status: 500 }
      )
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Get the latest user message for context search
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .pop()?.content || ''

    // Build system prompt with user context
    const systemPrompt = await buildSystemPrompt(userId, latestUserMessage)

    console.log('System prompt length:', systemPrompt.length)

    const modelName = process.env.PYDANTIC_AI_MODEL || 'llama-3.1-8b-instant'

    // Direct fetch to Pydantic Gateway (Groq) with correct Authorization header
    const response = await fetch('https://gateway.pydantic.dev/proxy/groq/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gateway error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to get response from AI', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    console.log('Result text length:', content?.length)
    console.log('Finish reason:', data.choices?.[0]?.finish_reason)

    if (!content) {
      return NextResponse.json({
        content: 'Sorry, I could not generate a response.',
      })
    }

    // Extract facts and create HITL confirmations (async, don't wait)
    if (userId && latestUserMessage) {
      extractFacts(latestUserMessage, content, userId, apiKey).catch(err => {
        console.error('Background fact extraction error:', err)
      })
    }

    console.log('Chat response generated successfully')
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)

    return NextResponse.json(
      { error: 'Failed to process chat', details: errorMessage },
      { status: 500 }
    )
  }
}
