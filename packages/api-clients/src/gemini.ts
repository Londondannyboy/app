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
