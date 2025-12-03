'use client'

import { useState, useEffect } from 'react'

interface ProfileFact {
  id: string
  fact_type: string
  fact_value: string | Record<string, unknown>
  confidence: number
  source: string
  is_user_verified: boolean
  created_at: string
}

interface PendingSuggestion {
  id: string
  fact_type: string
  suggested_value: string
  current_value?: string
  reasoning: string
  timestamp: Date
}

interface ProfileSectionProps {
  userId: string | null
}

const FACT_ICONS: Record<string, string> = {
  destination: '🎯',
  origin: '🏠',
  nationality: '🪪',
  family_status: '👨‍👩‍👧‍👦',
  profession: '💼',
  budget: '💰',
  timeline: '📅',
}

function renderValue(value: string | Record<string, unknown>): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && typeof value.value === 'string') return value.value
    return JSON.stringify(value)
  }
  return String(value)
}

export function ProfileSection({ userId }: ProfileSectionProps) {
  const [facts, setFacts] = useState<ProfileFact[]>([])
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Fetch verified profile facts
  useEffect(() => {
    if (!userId) return

    const fetchProfile = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/verified`,
          { headers: { 'X-User-Id': userId } }
        )
        if (res.ok) {
          const data = await res.json()
          setFacts(data.facts || [])
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  // SSE for pending suggestions
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('profile_suggestion', (e) => {
      const data = JSON.parse(e.data)
      setSuggestions(prev => [...prev, {
        id: data.id,
        fact_type: data.fact_type,
        suggested_value: data.suggested_value,
        current_value: data.current_value,
        reasoning: data.reasoning,
        timestamp: new Date(),
      }])
    })

    eventSource.addEventListener('profile_verified', (e) => {
      const data = JSON.parse(e.data)
      // Add to verified facts
      setFacts(prev => {
        const existing = prev.find(f => f.fact_type === data.fact_type)
        if (existing) {
          return prev.map(f => f.fact_type === data.fact_type ? { ...f, ...data } : f)
        }
        return [...prev, data]
      })
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.id !== data.suggestion_id))
    })

    return () => eventSource.close()
  }, [userId])

  const handleAcceptSuggestion = async (suggestion: PendingSuggestion) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || '',
        },
        body: JSON.stringify({
          suggestion_id: suggestion.id,
          fact_type: suggestion.fact_type,
          value: suggestion.suggested_value,
          action: 'accept',
        }),
      })
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    } catch (error) {
      console.error('Failed to accept suggestion:', error)
    }
  }

  const handleRejectSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
  }

  const handleEditFact = async (factId: string) => {
    if (!editValue.trim()) return

    try {
      await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || '',
        },
        body: JSON.stringify({
          fact_id: factId,
          value: editValue,
        }),
      })
      setFacts(prev => prev.map(f =>
        f.id === factId ? { ...f, fact_value: editValue } : f
      ))
      setEditingId(null)
      setEditValue('')
    } catch (error) {
      console.error('Failed to update fact:', error)
    }
  }

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view your profile</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <h2 className="font-semibold">Your Profile</h2>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
          Human Controlled
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Info banner */}
        <div className="text-xs text-gray-400 bg-white/5 rounded-lg p-3">
          <strong className="text-purple-400">You're in control.</strong> AI suggests changes below,
          but only you can verify and add them to your profile.
        </div>

        {/* Pending Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
              <span>💡</span> AI Suggestions
            </h3>
            {suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{FACT_ICONS[suggestion.fact_type] || '📌'}</span>
                  <span className="text-sm font-medium capitalize">
                    {suggestion.fact_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-white font-medium mb-1">
                  {suggestion.suggested_value}
                </div>
                {suggestion.current_value && (
                  <div className="text-xs text-gray-400 mb-2">
                    Currently: <span className="line-through">{suggestion.current_value}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mb-3 italic">
                  "{suggestion.reasoning}"
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 rounded text-sm font-medium transition"
                  >
                    ✓ Add to Profile
                  </button>
                  <button
                    onClick={() => handleRejectSuggestion(suggestion.id)}
                    className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition"
                  >
                    ✗ Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verified Facts */}
        {loading ? (
          <div className="text-center text-gray-400 py-4 animate-pulse">Loading...</div>
        ) : facts.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p className="mb-2">No verified profile facts yet</p>
            <p className="text-xs">Chat with Quest to start building your profile</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
              <span>✓</span> Verified Facts
            </h3>
            {facts.map(fact => (
              <div
                key={fact.id}
                className="p-3 bg-white/5 border border-white/10 rounded-lg group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{FACT_ICONS[fact.fact_type] || '📌'}</span>
                    <span className="text-sm text-gray-400 capitalize">
                      {fact.fact_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(fact.id)
                      setEditValue(renderValue(fact.fact_value))
                    }}
                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-white transition"
                  >
                    Edit
                  </button>
                </div>

                {editingId === fact.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/50 border border-white/20 rounded text-sm focus:border-purple-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditFact(fact.id)}
                      className="px-3 py-1.5 bg-purple-500 rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-gray-600 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="text-white font-medium">
                    {renderValue(fact.fact_value)}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="text-green-400">✓ Verified</span>
                  <span>•</span>
                  <span>{new Date(fact.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
