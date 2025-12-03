// OpenAI Chat Completion compatible types (for Hume)
export interface ChatCompletionRequest {
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  user?: string  // Stack Auth user ID
  model?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentBlock[]
  name?: string
}

export interface ContentBlock {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

// SSE (Server-Sent Events) response format
export interface SSEChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: SSEChoice[]
}

export interface SSEChoice {
  index: number
  delta: { content?: string; role?: 'assistant' }
  finish_reason: 'stop' | 'length' | null
}

// Context sources for LLM
export interface VoiceContext {
  user_profile?: UserFact[]
  knowledge_graph?: KnowledgeGraphContext
  personal_memory?: string
  relevant_articles?: Article[]
  profile_data?: {
    current_country?: string
    destination_countries?: string[]
    nationality?: string
    budget_monthly?: number
    timeline?: string
    relocation_motivation?: string[]
  }
}

export interface KnowledgeGraphContext {
  edges: KnowledgeEdge[]
  nodes: KnowledgeNode[]
  formatted: string  // Pre-formatted for LLM prompt
}

export interface KnowledgeEdge {
  fact: string
  type: string
  score: number
  attributes?: Record<string, any>
}

export interface KnowledgeNode {
  name: string
  type: string
  summary?: string
  score: number
  attributes?: Record<string, any>
}

// Import types from user and article
import type { UserFact } from './user'
import type { Article } from './article'
