'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface TextChatProps {
  userId: string | null
  appId?: string
  onThinking?: (status: string | null) => void
  onToolCall?: (tool: string) => void
  onToolResult?: (tool: string, result?: string) => void
  onFactExtracted?: (fact: unknown) => void
  onZepQuery?: (query: string) => void
  onNeonQuery?: (query: string) => void
  onContentSuggestion?: (content: unknown) => void
}

export function TextChat({
  userId,
  appId = 'relocation',
  onThinking,
  onToolCall,
  onToolResult,
  onFactExtracted,
  onZepQuery,
  onNeonQuery,
  onContentSuggestion,
}: TextChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    onThinking?.('Processing your message...')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': appId,
          ...(userId && { 'X-User-Id': userId }),
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              // Handle different SSE event types
              switch (parsed.type) {
                case 'text_delta':
                  assistantMessage.content += parsed.text
                  setMessages(prev =>
                    prev.map(m => m.id === assistantMessage.id ? {...m, content: assistantMessage.content} : m)
                  )
                  break

                case 'thinking':
                  onThinking?.(parsed.content)
                  break

                case 'tool_call':
                case 'tool_start':
                  onToolCall?.(parsed.name)
                  onThinking?.(`Using ${parsed.name.replace(/_/g, ' ')}...`)
                  break

                case 'tool_result':
                case 'tool_end':
                  onToolResult?.(parsed.name, parsed.result)
                  break

                case 'fact_extracted':
                  onFactExtracted?.(parsed.fact)
                  break

                case 'zep_query':
                  onZepQuery?.(parsed.query)
                  break

                case 'neon_query':
                  onNeonQuery?.(parsed.query)
                  break

                case 'content_suggestion':
                  onContentSuggestion?.(parsed.content)
                  break

                case 'profile_change_pending':
                  onThinking?.(`Considering update: ${parsed.fact_type}`)
                  break

                default:
                  // OpenAI format fallback
                  if (parsed.choices?.[0]?.delta?.content) {
                    assistantMessage.content += parsed.choices[0].delta.content
                    setMessages(prev =>
                      prev.map(m => m.id === assistantMessage.id ? {...m, content: assistantMessage.content} : m)
                    )
                  }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Show error in chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsStreaming(false)
      onThinking?.(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-xl overflow-hidden border border-white/10">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-lg font-medium mb-2">Welcome to Quest</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Tell me about your relocation plans. I'll help you find the right country,
              visa options, jobs, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {['I want to move to Cyprus', 'Looking for remote jobs in Europe', 'Tell me about digital nomad visas'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                : 'bg-white/10 border border-white/10'
            }`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div className="text-xs text-white/50 mt-1">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your relocation..."
          disabled={isStreaming}
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition placeholder:text-gray-500"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </span>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  )
}
