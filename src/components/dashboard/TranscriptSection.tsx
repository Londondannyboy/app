'use client'

import { useState, useEffect, useRef } from 'react'

interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  source: 'voice' | 'chat'
}

interface TranscriptSectionProps {
  userId: string | null
}

export function TranscriptSection({ userId }: TranscriptSectionProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'voice' | 'chat'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch transcripts
  useEffect(() => {
    if (!userId) return

    const fetchTranscripts = async () => {
      try {
        const res = await fetch(`/api/user/transcripts?limit=50`, {
          headers: { 'X-User-Id': userId }
        })
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Failed to fetch transcripts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTranscripts()

    // Poll every 10 seconds for new messages
    const interval = setInterval(fetchTranscripts, 10000)
    return () => clearInterval(interval)
  }, [userId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [messages.length])

  const filteredMessages = messages.filter(m =>
    filter === 'all' || m.source === filter
  )

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view transcript</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h2 className="font-semibold">Conversation History</h2>
        </div>
        <div className="flex gap-1">
          {(['all', 'voice', 'chat'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-400 animate-pulse">Loading...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-xs mt-2">Start a conversation to see transcripts</p>
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-purple-500/10 border border-purple-500/20 ml-8'
                  : 'bg-white/5 border border-white/10 mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.source === 'voice' && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                    🎙️ voice
                  </span>
                )}
              </div>
              <p className="text-sm text-white/90">{msg.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-500">
        {filteredMessages.length} messages
      </div>
    </div>
  )
}
