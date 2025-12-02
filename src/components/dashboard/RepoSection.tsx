'use client'

import { useState, useEffect } from 'react'

interface RepoFact {
  id: string
  fact_type: string
  fact_value: string | Record<string, unknown>
  confidence: number
  source: string
  is_active: boolean
  updated_at: string
  change_history?: Array<{
    old_value: string
    new_value: string
    changed_at: string
    source: string
  }>
}

interface RepoSectionProps {
  userId: string | null
}

const FACT_CATEGORIES = {
  preferences: ['destination', 'origin', 'budget', 'timeline'],
  personal: ['family_status', 'profession', 'nationality', 'work_type'],
  interests: ['visa_interest', 'lifestyle', 'priorities'],
}

function renderValue(value: string | Record<string, unknown>): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && typeof value.value === 'string') return value.value
    return JSON.stringify(value)
  }
  return String(value)
}

export function RepoSection({ userId }: RepoSectionProps) {
  const [facts, setFacts] = useState<RepoFact[]>([])
  const [loading, setLoading] = useState(true)
  const [recentChanges, setRecentChanges] = useState<Array<{
    id: string
    fact_type: string
    old_value?: string
    new_value: string
    timestamp: Date
  }>>([])

  // Fetch all facts (the "repo")
  useEffect(() => {
    if (!userId) return

    const fetchRepo = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/facts`,
          { headers: { 'X-Stack-User-Id': userId } }
        )
        if (res.ok) {
          const data = await res.json()
          setFacts(data.facts || [])
        }
      } catch (error) {
        console.error('Failed to fetch repo:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRepo()
  }, [userId])

  // SSE for real-time updates
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('fact_extracted', (e) => {
      const data = JSON.parse(e.data)

      // Add to recent changes
      setRecentChanges(prev => [{
        id: data.id || Date.now().toString(),
        fact_type: data.fact_type,
        old_value: undefined,
        new_value: typeof data.fact_value === 'string' ? data.fact_value : JSON.stringify(data.fact_value),
        timestamp: new Date(),
      }, ...prev].slice(0, 5))

      // Update facts
      setFacts(prev => {
        const existing = prev.find(f => f.fact_type === data.fact_type)
        if (existing) {
          return prev.map(f => f.fact_type === data.fact_type ? { ...f, ...data, updated_at: new Date().toISOString() } : f)
        }
        return [...prev, { ...data, updated_at: new Date().toISOString() }]
      })
    })

    eventSource.addEventListener('fact_updated', (e) => {
      const data = JSON.parse(e.data)

      // Find old value for change log
      const oldFact = facts.find(f => f.id === data.id)

      setRecentChanges(prev => [{
        id: data.id,
        fact_type: data.fact_type,
        old_value: oldFact ? renderValue(oldFact.fact_value) : undefined,
        new_value: typeof data.fact_value === 'string' ? data.fact_value : JSON.stringify(data.fact_value),
        timestamp: new Date(),
      }, ...prev].slice(0, 5))

      setFacts(prev => prev.map(f =>
        f.id === data.id ? { ...f, ...data, updated_at: new Date().toISOString() } : f
      ))
    })

    return () => eventSource.close()
  }, [userId, facts])

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view your repo</p>
      </div>
    )
  }

  // Group facts by category
  const groupedFacts = Object.entries(FACT_CATEGORIES).map(([category, types]) => ({
    category,
    facts: facts.filter(f => types.includes(f.fact_type)),
  })).filter(g => g.facts.length > 0)

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <h2 className="font-semibold">Your Repo</h2>
        </div>
        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
          Shared Space
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Info banner */}
        <div className="text-xs text-gray-400 bg-white/5 rounded-lg p-3">
          <strong className="text-purple-400">Live updates.</strong> AI learns about you as you chat.
          You can edit or correct anything here.
        </div>

        {/* Recent Changes - Live Feed */}
        {recentChanges.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-purple-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              Recent Updates
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentChanges.map((change, idx) => (
                <div
                  key={`${change.id}-${idx}`}
                  className={`text-xs p-2 rounded bg-purple-500/10 border border-purple-500/20 transition-all ${
                    idx === 0 ? 'animate-pulse' : 'opacity-70'
                  }`}
                >
                  <span className="text-purple-400 capitalize">
                    {change.fact_type.replace(/_/g, ' ')}
                  </span>
                  {change.old_value && (
                    <>
                      <span className="text-gray-500 mx-1">:</span>
                      <span className="text-gray-400 line-through">{change.old_value}</span>
                      <span className="text-gray-500 mx-1">→</span>
                    </>
                  )}
                  <span className="text-white">{change.new_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facts by Category */}
        {loading ? (
          <div className="text-center text-gray-400 py-4 animate-pulse">Loading...</div>
        ) : groupedFacts.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p className="mb-2">No facts collected yet</p>
            <p className="text-xs">Start chatting to build your repo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedFacts.map(({ category, facts: categoryFacts }) => (
              <div key={category}>
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {categoryFacts.map(fact => (
                    <div
                      key={fact.id}
                      className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition cursor-pointer group"
                    >
                      <div className="text-xs text-gray-400 capitalize mb-0.5">
                        {fact.fact_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-white font-medium truncate">
                        {renderValue(fact.fact_value)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-500">
                          {Math.round(fact.confidence * 100)}% conf
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 text-xs text-purple-400 transition">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
          <span>{facts.length} facts collected</span>
          <span>Last updated: {facts.length > 0 ? 'just now' : 'never'}</span>
        </div>
      </div>
    </div>
  )
}
