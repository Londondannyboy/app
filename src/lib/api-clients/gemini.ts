import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// System prompt for relocation assistant
const RELOCATION_SYSTEM_CONTEXT = `You are a helpful, conversational relocation assistant.

PERSONALITY:
- Friendly and warm, like talking to a knowledgeable friend
- Concise for voice (2-3 sentences unless detail is needed)
- Proactive in asking clarifying questions
- Culturally sensitive

CAPABILITIES:
- Answer questions about countries, visas, costs, culture
- Reference knowledge base and user's personal profile
- Suggest relevant articles and resources
- Extract key facts from conversation

RULES:
- Keep responses under 100 words for voice
- Use contractions and natural language
- When you don't know, say so honestly
- Cite sources when referencing specific facts`

export interface GeminiOptions {
  temperature?: number
  maxTokens?: number
  systemContext?: string  // Override default context
}

export async function generateResponse(
  userMessage: string,
  context: string,
  options: GeminiOptions = {}
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 500
    }
  })

  const systemContext = options.systemContext || RELOCATION_SYSTEM_CONTEXT

  const prompt = `${systemContext}

CONTEXT:
${context}

USER: ${userMessage}

ASSISTANT:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    return response
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate response')
  }
}

// Stream response word-by-word for voice naturalness
export async function* streamResponse(
  userMessage: string,
  context: string,
  options: GeminiOptions = {}
): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 500
    }
  })

  const systemContext = options.systemContext || RELOCATION_SYSTEM_CONTEXT

  const prompt = `${systemContext}

CONTEXT:
${context}

USER: ${userMessage}

ASSISTANT:`

  try {
    const result = await model.generateContentStream(prompt)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        yield text
      }
    }
  } catch (error) {
    console.error('Gemini streaming error:', error)
    throw new Error('Failed to stream response')
  }
}

// Extract structured facts from conversation using LLM
export async function extractFacts(
  userMessage: string,
  assistantResponse: string,
  existingFacts: Array<{ fact_type: string; fact_value: string }>
): Promise<Array<{
  fact_type: string
  fact_value: string
  confidence: number
  requires_confirmation: boolean
}>> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent extraction
      maxOutputTokens: 500
    }
  })

  const existingFactsSummary = existingFacts.length > 0
    ? existingFacts.map(f => `${f.fact_type}: ${f.fact_value}`).join(', ')
    : 'None yet'

  const prompt = `Extract structured facts from this conversation about relocation preferences.

CONVERSATION:
User: ${userMessage}
Assistant: ${assistantResponse}

EXISTING FACTS: ${existingFactsSummary}

Extract ONLY new or changed facts. Return JSON array with this exact format:
[
  {
    "fact_type": "destination" | "origin" | "budget" | "timeline" | "name" | "nationality" | "profession" | "family_status",
    "fact_value": "the exact value (preserve proper capitalization)",
    "confidence": 0.0-1.0,
    "requires_confirmation": true if critical fact or changed value
  }
]

RULES:
1. Only extract facts explicitly mentioned in the conversation
2. Preserve proper capitalization (e.g., "Portugal", not "portugal")
3. Extract full names/locations (e.g., "United Kingdom" not "UK")
4. Set requires_confirmation=true for: destination, origin, budget changes
5. Set confidence based on clarity (explicit=0.9+, implied=0.5-0.8, vague=0.3-0.5)
6. If no new facts found, return empty array: []
7. Return ONLY valid JSON, no explanation

JSON:`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || text.match(/(\[[\s\S]*?\])/)
    const jsonText = jsonMatch ? jsonMatch[1] : text

    const facts = JSON.parse(jsonText)

    if (!Array.isArray(facts)) {
      console.warn('Fact extraction returned non-array:', facts)
      return []
    }

    console.log(`✅ Extracted ${facts.length} facts from conversation`)
    return facts

  } catch (error) {
    console.error('Fact extraction error:', error)
    // Don't throw - just return empty array to not block conversation
    return []
  }
}
