'use client'

import { useState, useEffect } from 'react'

interface SummarySectionProps {
  userId: string | null
}

interface ConversationSummary {
  id: string
  date: string
  summary: string
  key_topics: string[]
  facts_extracted: number
  sentiment: 'positive' | 'neutral' | 'negative'
  next_steps?: string[]
}

export function SummarySection({ userId }: SummarySectionProps) {
  const [currentSummary, setCurrentSummary] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [recentSummaries, setRecentSummaries] = useState<ConversationSummary[]>([])
  const [keyTopics, setKeyTopics] = useState<string[]>([])

  // SSE for live summary updates
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('summary_generating', () => {
      setIsGenerating(true)
    })

    eventSource.addEventListener('summary_update', (e) => {
      const data = JSON.parse(e.data)
      setCurrentSummary(data.summary)
      if (data.key_topics) {
        setKeyTopics(data.key_topics)
      }
      setIsGenerating(false)
    })

    eventSource.addEventListener('topic_detected', (e) => {
      const data = JSON.parse(e.data)
      setKeyTopics(prev => {
        if (prev.includes(data.topic)) return prev
        return [...prev, data.topic].slice(-5)
      })
    })

    return () => eventSource.close()
  }, [userId])

  // Fetch recent summaries
  useEffect(() => {
    if (!userId) return

    const fetchSummaries = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/summaries/recent`,
          { headers: { 'X-User-Id': userId } }
        )
        if (res.ok) {
          const data = await res.json()
          setRecentSummaries(data.summaries || [])
        }
      } catch (error) {
        console.error('Failed to fetch summaries:', error)
      }
    }

    fetchSummaries()
  }, [userId])

  const handleGenerateSummary = async () => {
    if (!userId) return

    setIsGenerating(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/summary/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        setCurrentSummary(data.summary)
        setKeyTopics(data.key_topics || [])
      }
    } catch (error) {
      console.error('Failed to generate summary:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view summaries</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="font-semibold">Summary</h2>
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={isGenerating}
          className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full hover:bg-purple-500/30 transition disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Topics */}
        {keyTopics.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Topics Discussed
            </h3>
            <div className="flex flex-wrap gap-2">
              {keyTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current/Live Summary */}
        <div>
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Conversation Summary
          </h3>
          {isGenerating ? (
            <div className="p-4 bg-white/5 rounded-lg animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          ) : currentSummary ? (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-sm text-gray-300 leading-relaxed">
                {currentSummary}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 rounded-lg text-center text-gray-500 text-sm">
              <p className="mb-2">No summary yet</p>
              <p className="text-xs">Have a conversation and click "Generate" to create a summary</p>
            </div>
          )}
        </div>

        {/* Previous Summaries */}
        {recentSummaries.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Previous Sessions
            </h3>
            <div className="space-y-2">
              {recentSummaries.slice(0, 3).map(summary => (
                <div
                  key={summary.id}
                  className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">
                      {new Date(summary.date).toLocaleDateString()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      summary.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                      summary.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {summary.sentiment}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {summary.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>{summary.facts_extracted} facts</span>
                    <span>•</span>
                    <span>{summary.key_topics.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
