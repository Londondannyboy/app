'use client'

import { useUser } from '@stackframe/stack'
import { useState, useRef, useEffect } from 'react'
import { GlobalHeader } from '@/components/GlobalHeader'
import { RepoSection } from '@/components/dashboard/RepoSection'
import { HITLConfirmations } from '@/components/HITLConfirmations'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const user = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'Sorry, I could not generate a response.',
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${errorMsg}. Please try again.`,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex flex-col">
      <GlobalHeader />

      {/* HITL Confirmations overlay */}
      <HITLConfirmations userId={user?.id || null} />

      <main className="flex-1 flex gap-6 max-w-7xl mx-auto w-full p-4">
        {/* Chat Section - Left */}
        <div className="flex-1 flex flex-col max-w-3xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Chat with Quest
            </h1>
            <p className="text-gray-400 mt-2">
              Your personal relocation assistant
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg mb-2">Start a conversation</p>
                <p className="text-sm">Ask me anything about relocating to a new country</p>
              </div>
            )}

            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-500/20 text-white'
                      : 'bg-white/10 text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-gray-400 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about relocation, visas, cost of living..."
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>

          {!user && (
            <p className="text-center text-gray-500 text-sm mt-4">
              <a href="/handler/sign-in" className="text-purple-400 hover:text-purple-300">
                Sign in
              </a>
              {' '}for personalized responses
            </p>
          )}
        </div>

        {/* Repo Section - Right Sidebar */}
        {user && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <RepoSection userId={user.id} />
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 bg-black/20 py-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Relocation Quest
      </footer>
    </div>
  )
}
