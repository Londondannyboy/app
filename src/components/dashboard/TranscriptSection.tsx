'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSSE } from '@/hooks/useSSE'

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

  const handleSSEEvent = useCallback((eventType: string, data: unknown) => {
    const eventData = data as Record<string, unknown>

    if (eventType === 'transcript_message') {
      setMessages(prev => [...prev, {
        id: (eventData.id as string) || Date.now().toString(),
        role: eventData.role as 'user' | 'assistant',
        content: eventData.content as string,
        timestamp: new Date((eventData.timestamp as string) || Date.now()),
        source: (eventData.source as 'voice' | 'chat') || 'chat',
        emotions: eventData.emotions as Record<string, number> | undefined,
      }])
      setIsLive(true)

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
    } else if (eventType === 'session_start') {
      setIsLive(true)
    } else if (eventType === 'session_end') {
      setIsLive(false)
    }
  }, [])

  const { connected, reconnecting, retryCount } = useSSE({
    userId,
    onEvent: handleSSEEvent,
    events: ['transcript_message', 'session_start', 'session_end'],
  })

  // Update live status based on connection
  useEffect(() => {
    if (!connected && !reconnecting) {
      setIsLive(false)
    }
  }, [connected, reconnecting])

  // Fetch recent transcript history
  useEffect(() => {
    if (!userId) return

    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/transcript/recent`,
          { headers: { 'X-User-Id': userId } }
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
          {reconnecting ? (
            <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
              Reconnecting ({retryCount})
            </span>
          ) : isLive ? (
            <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live
            </span>
          ) : connected ? (
            <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Connected
            </span>
          ) : null}
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
        <button
          onClick={() => {
            // Export transcript as text file
            const content = filteredMessages
              .map(m => `[${formatTime(new Date(m.timestamp))}] ${m.role === 'user' ? 'You' : 'Assistant'}: ${m.content}`)
              .join('\n\n')

            const blob = new Blob([content], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}
          disabled={filteredMessages.length === 0}
          className="text-purple-400 hover:text-purple-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export
        </button>
      </div>
    </div>
  )
}
