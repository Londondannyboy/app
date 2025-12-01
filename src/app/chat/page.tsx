'use client'

import { useUser, UserButton } from '@stackframe/stack'
import { TextChat } from '@/components/TextChat'
import { UserFactsPanel } from '@/components/UserFactsPanel'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import { useState } from 'react'

export default function ChatPage() {
  const user = useUser()
  const userId = user?.id || null
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [activeTools, setActiveTools] = useState<string[]>([])

  return (
    <main className="flex min-h-screen">
      {/* Header with auth */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
        <a href="/" className="text-gray-400 hover:text-white transition">← Home</a>
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

      {/* Main chat interface */}
      <div className="flex-1 flex flex-col p-8 pt-16">
        <h1 className="text-2xl font-bold mb-4">Text Chat</h1>
        {user && (
          <p className="text-gray-400 mb-2">Logged in as {user.displayName || user.primaryEmail}</p>
        )}

        <ThinkingIndicator
          status={thinkingStatus}
          activeTools={activeTools}
        />

        <div className="flex-1">
          <TextChat
            userId={userId}
            onThinking={setThinkingStatus}
            onToolCall={(tool) => setActiveTools(prev => [...prev, tool])}
            onToolResult={(tool) => setActiveTools(prev => prev.filter(t => t !== tool))}
          />
        </div>
      </div>

      {/* Facts sidebar */}
      <aside className="w-80 bg-black/20 border-l border-white/10 p-4">
        <UserFactsPanel userId={userId} />
      </aside>
    </main>
  )
}
