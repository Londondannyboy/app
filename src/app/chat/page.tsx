'use client'

import { TextChat } from '@/components/TextChat'
import { UserFactsPanel } from '@/components/UserFactsPanel'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import { useState } from 'react'

export default function ChatPage() {
  const [userId] = useState<string | null>(null) // Will come from auth
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [activeTools, setActiveTools] = useState<string[]>([])

  return (
    <main className="flex min-h-screen">
      {/* Main chat interface */}
      <div className="flex-1 flex flex-col p-8">
        <h1 className="text-2xl font-bold mb-4">Text Chat</h1>

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
