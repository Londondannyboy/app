'use client'

import { useUser, UserButton } from '@stackframe/stack'
import { QuestChat } from '@/components/QuestChat'
import { UserFactsPanel } from '@/components/UserFactsPanel'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import { LiveActivityPanel } from '@/components/LiveActivityPanel'
import { ArticleSuggestions } from '@/components/ArticleSuggestions'
import { useState, useCallback } from 'react'

export default function ChatPage() {
  const user = useUser()
  const userId = user?.id || null

  // Thinking state
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [toolResults, setToolResults] = useState<Record<string, string>>({})
  const [zepQuery, setZepQuery] = useState<string | null>(null)
  const [neonQuery, setNeonQuery] = useState<string | null>(null)

  // Handle tool calls from the chat
  const handleToolCall = useCallback((tool: string) => {
    setActiveTools(prev => [...prev, tool])

    // Special handling for ZEP/Neon queries
    if (tool.includes('zep') || tool.includes('knowledge')) {
      setZepQuery('Searching knowledge graph...')
    }
    if (tool.includes('neon') || tool.includes('countries') || tool.includes('articles')) {
      setNeonQuery('Querying database...')
    }
  }, [])

  const handleToolResult = useCallback((tool: string, result?: string) => {
    setActiveTools(prev => prev.filter(t => t !== tool))
    if (result) {
      setToolResults(prev => ({ ...prev, [tool]: result }))
      // Clear result after 3 seconds
      setTimeout(() => {
        setToolResults(prev => {
          const next = { ...prev }
          delete next[tool]
          return next
        })
      }, 3000)
    }

    // Clear ZEP/Neon indicators
    if (tool.includes('zep') || tool.includes('knowledge')) {
      setZepQuery(null)
    }
    if (tool.includes('neon') || tool.includes('countries') || tool.includes('articles')) {
      setNeonQuery(null)
    }
  }, [])

  // Handle profile change confirmations
  const handleConfirmChange = useCallback(async (changeId: string, confirmed: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/confirm-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || '',
        },
        body: JSON.stringify({ change_id: changeId, confirmed }),
      })
    } catch (error) {
      console.error('Failed to confirm change:', error)
    }
  }, [userId])

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header with auth */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
        <a href="/" className="text-gray-400 hover:text-white transition">Home</a>
        <a href="/voice" className="text-gray-400 hover:text-white transition">Voice</a>
        {user && (
          <a href="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</a>
        )}
        {user ? (
          <UserButton />
        ) : (
          <a
            href="/handler/sign-in"
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
          >
            Sign In
          </a>
        )}
      </div>

      {/* Left sidebar - Live Activity */}
      <aside className="w-80 bg-black/20 border-r border-white/10 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="pt-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Quest AI
          </h2>

          {/* Live Activity Panel */}
          <LiveActivityPanel
            userId={userId}
            onConfirmChange={handleConfirmChange}
          />

          {/* Article Suggestions */}
          <div className="mt-4">
            <ArticleSuggestions userId={userId} />
          </div>
        </div>
      </aside>

      {/* Main chat interface */}
      <div className="flex-1 flex flex-col p-8 pt-16">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Chat with Quest</h1>
          {user && (
            <p className="text-gray-400 text-sm">
              Logged in as {user.displayName || user.primaryEmail}
            </p>
          )}
        </div>

        {/* Thinking Indicator - enhanced */}
        <ThinkingIndicator
          status={thinkingStatus}
          activeTools={activeTools}
          toolResults={toolResults}
          zepQuery={zepQuery || undefined}
          neonQuery={neonQuery || undefined}
        />

        {/* Chat Component - Now with TheSys C1 Generative UI! */}
        <div className="flex-1">
          <QuestChat appId="relocation" />
        </div>
      </div>

      {/* Right sidebar - User Profile Facts */}
      <aside className="w-80 bg-black/20 border-l border-white/10 p-4 overflow-y-auto">
        <div className="pt-12">
          <UserFactsPanel userId={userId} />
        </div>
      </aside>
    </main>
  )
}
