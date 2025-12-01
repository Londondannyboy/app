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
  onToolResult?: (tool: string) => void
  onFactExtracted?: (fact: any) => void
}

export function TextChat({
  userId,
  appId = 'dashboard',
  onThinking,
  onToolCall,
  onToolResult,
  onFactExtracted
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

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': appId,
          ...(userId && { 'X-Stack-User-Id': userId }),
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

              // Handle different event types from Vercel AI Protocol
              if (parsed.type === 'text_delta') {
                assistantMessage.content += parsed.text
                setMessages(prev =>
                  prev.map(m => m.id === assistantMessage.id ? {...m, content: assistantMessage.content} : m)
                )
              } else if (parsed.type === 'thinking') {
                onThinking?.(parsed.content)
              } else if (parsed.type === 'tool_call') {
                onToolCall?.(parsed.name)
              } else if (parsed.type === 'tool_result') {
                onToolResult?.(parsed.name)
              } else if (parsed.type === 'fact_extracted') {
                onFactExtracted?.(parsed.fact)
              } else if (parsed.choices?.[0]?.delta?.content) {
                // OpenAI format fallback
                assistantMessage.content += parsed.choices[0].delta.content
                setMessages(prev =>
                  prev.map(m => m.id === assistantMessage.id ? {...m, content: assistantMessage.content} : m)
                )
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsStreaming(false)
      onThinking?.(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-xl overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Start a conversation about your relocation plans
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
                : 'bg-white/10'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-4 py-3 rounded-2xl">
              <span className="animate-pulse">Thinking...</span>
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
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
