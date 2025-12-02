'use client'

import { useState, useEffect, useRef } from 'react'

interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  source: 'voice' | 'chat'
  emotions?: Record<string, number>
}

interface TranscriptSectionProps {
  userId: string | null
}

export function TranscriptSection({ userId }: TranscriptSectionProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [isLive, setIsLive] = useState(false)
  const [filter, setFilter] = useState<'all' | 'voice' | 'chat'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  // SSE for live transcript
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('transcript_message', (e) => {
      const data = JSON.parse(e.data)
      setMessages(prev => [...prev, {
        id: data.id || Date.now().toString(),
        role: data.role,
        content: data.content,
        timestamp: new Date(data.timestamp || Date.now()),
        source: data.source || 'chat',
        emotions: data.emotions,
      }])
      setIsLive(true)

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
    })

    eventSource.addEventListener('session_start', () => {
      setIsLive(true)
    })

    eventSource.addEventListener('session_end', () => {
      setIsLive(false)
    })

    eventSource.onerror = () => {
      setIsLive(false)
    }

    return () => eventSource.close()
  }, [userId])

  // Fetch recent transcript history
  useEffect(() => {
    if (!userId) return

    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/transcript/recent`,
          { headers: { 'X-Stack-User-Id': userId } }
        )
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Failed to fetch transcript:', error)
      }
    }

    fetchHistory()
  }, [userId])

  const filteredMessages = messages.filter(m =>
    filter === 'all' || m.source === filter
  )

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view transcript</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h2 className="font-semibold">Transcript</h2>
          {isLive && (
            <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'voice', 'chat'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition ${
                filter === f
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'voice' ? '🎙️' : '💬'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">No messages yet</p>
            <p className="text-xs">Start a conversation to see the transcript</p>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                <div className={`px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-purple-500/20 border border-purple-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}>
                  <div className="text-sm">{msg.content}</div>
                </div>
                <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                  msg.role === 'user' ? 'justify-end' : ''
                }`}>
                  <span>{formatTime(new Date(msg.timestamp))}</span>
                  <span>{msg.source === 'voice' ? '🎙️' : '💬'}</span>
                  {msg.emotions && Object.keys(msg.emotions).length > 0 && (
                    <span className="text-yellow-400">
                      {Object.entries(msg.emotions)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 1)
                        .map(([emotion]) => emotion)
                        .join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
        <span>{filteredMessages.length} messages</span>
        <button className="text-purple-400 hover:text-purple-300 transition">
          Export
        </button>
      </div>
    </div>
  )
}
