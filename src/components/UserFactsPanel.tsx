'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSSE } from '@/hooks/useSSE'

interface Fact {
  id: string
  fact_type: string
  fact_value: string | Record<string, unknown>
  confidence: number
  source: string
  created_at: string
  isNew?: boolean
}

interface PendingChange {
  id: string
  fact_type: string
  old_value?: string
  suggested_value: string
  reasoning?: string
  timestamp: Date
}

// Helper to safely render fact values (can be string or JSONB object)
function renderFactValue(value: string | Record<string, unknown>): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && typeof value.value === 'string') return value.value
    return JSON.stringify(value)
  }
  return String(value)
}

interface UserFactsPanelProps {
  userId: string | null
}

const FACT_ICONS: Record<string, string> = {
  destination: '🎯',
  origin: '🏠',
  family: '👨‍👩‍👧‍👦',
  children: '👶',
  profession: '💼',
  employer: '🏢',
  work_type: '💻',
  budget: '💰',
  timeline: '📅',
  visa_interest: '📋',
  nationality: '🌍',
}

export function UserFactsPanel({ userId }: UserFactsPanelProps) {
  const [facts, setFacts] = useState<Fact[]>([])
  const [loading, setLoading] = useState(false)
  const [editingFact, setEditingFact] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])

  // Handle SSE events
  const handleSSEEvent = useCallback((eventType: string, data: unknown) => {
    const eventData = data as Record<string, unknown>

    if (eventType === 'fact_extracted') {
      // Check if this is a change to an existing fact (human-in-the-loop)
      const existingFact = facts.find(f => f.fact_type === eventData.fact_type)

      if (existingFact) {
        // Add to pending changes for confirmation
        const newValue = typeof eventData.fact_value === 'string'
          ? eventData.fact_value
          : renderFactValue(eventData.fact_value as Record<string, unknown>)

        const oldValue = renderFactValue(existingFact.fact_value)

        // Only add to pending if values are different
        if (oldValue !== newValue) {
          setPendingChanges(prev => {
            // Don't duplicate pending changes
            const exists = prev.some(p => p.fact_type === eventData.fact_type && p.suggested_value === newValue)
            if (exists) return prev

            return [...prev, {
              id: (eventData.id as string) || Date.now().toString(),
              fact_type: eventData.fact_type as string,
              old_value: oldValue,
              suggested_value: newValue,
              reasoning: `AI detected you mentioned "${newValue}" for ${(eventData.fact_type as string).replace(/_/g, ' ')}`,
              timestamp: new Date(),
            }]
          })
          return
        }
      }

      // New fact - add directly with animation
      setFacts(prev => {
        const existing = prev.find(f => f.fact_type === eventData.fact_type)
        if (existing) {
          return prev.map(f => f.fact_type === eventData.fact_type ? {...f, ...eventData, isNew: true} as Fact : f)
        }
        return [...prev, {...eventData, isNew: true} as Fact]
      })

      setTimeout(() => {
        setFacts(prev => prev.map(f => ({...f, isNew: false})))
      }, 2000)
    } else if (eventType === 'fact_updated') {
      setFacts(prev => prev.map(f => f.id === eventData.id ? {...f, ...eventData, isNew: true} as Fact : f))
    } else if (eventType === 'profile_suggestion') {
      // Direct suggestion from AI
      setPendingChanges(prev => [...prev, {
        id: eventData.id as string,
        fact_type: eventData.fact_type as string,
        old_value: eventData.current_value as string | undefined,
        suggested_value: eventData.suggested_value as string,
        reasoning: eventData.reasoning as string,
        timestamp: new Date(),
      }])
    }
  }, [facts])

  const { connected, reconnecting } = useSSE({
    userId,
    onEvent: handleSSEEvent,
    events: ['fact_extracted', 'fact_updated', 'profile_suggestion'],
  })

  // Initial fetch
  useEffect(() => {
    if (!userId) return

    const fetchFacts = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/facts`,
          {
            headers: {
              'X-Stack-User-Id': userId,
            },
          }
        )
        const data = await res.json()
        setFacts(data.facts || [])
      } catch (error) {
        console.error('Failed to fetch facts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFacts()
  }, [userId])

  // Handle edit
  const handleEdit = (fact: Fact) => {
    setEditingFact(fact.id)
    setEditValue(renderFactValue(fact.fact_value))
  }

  const handleSave = async (fact: Fact) => {
    if (!userId) return
    setSaving(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Stack-User-Id': userId,
          },
          body: JSON.stringify({
            fact_id: fact.id,
            fact_type: fact.fact_type,
            value: editValue,
          }),
        }
      )

      if (res.ok) {
        setFacts(prev =>
          prev.map(f =>
            f.id === fact.id
              ? { ...f, fact_value: { value: editValue }, isNew: true }
              : f
          )
        )
        setTimeout(() => {
          setFacts(prev => prev.map(f => ({...f, isNew: false})))
        }, 2000)
      } else {
        console.error('Failed to save:', await res.text())
      }
    } catch (error) {
      console.error('Failed to update fact:', error)
    } finally {
      setSaving(false)
      setEditingFact(null)
      setEditValue('')
    }
  }

  const handleCancel = () => {
    setEditingFact(null)
    setEditValue('')
  }

  // Handle pending change confirmation
  const handleAcceptChange = async (change: PendingChange) => {
    if (!userId) return

    try {
      // Find existing fact
      const existingFact = facts.find(f => f.fact_type === change.fact_type)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Stack-User-Id': userId,
          },
          body: JSON.stringify({
            fact_id: existingFact?.id || '',
            fact_type: change.fact_type,
            value: change.suggested_value,
          }),
        }
      )

      if (res.ok) {
        // Update local state
        setFacts(prev => {
          const existing = prev.find(f => f.fact_type === change.fact_type)
          if (existing) {
            return prev.map(f =>
              f.fact_type === change.fact_type
                ? { ...f, fact_value: { value: change.suggested_value }, isNew: true }
                : f
            )
          }
          return [...prev, {
            id: change.id,
            fact_type: change.fact_type,
            fact_value: { value: change.suggested_value },
            confidence: 1.0,
            source: 'user_verified',
            created_at: new Date().toISOString(),
            isNew: true,
          }]
        })

        setTimeout(() => {
          setFacts(prev => prev.map(f => ({...f, isNew: false})))
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to accept change:', error)
    }

    // Remove from pending
    setPendingChanges(prev => prev.filter(p => p.id !== change.id))
  }

  const handleRejectChange = (change: PendingChange) => {
    setPendingChanges(prev => prev.filter(p => p.id !== change.id))
  }

  if (!userId) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Sign in to save your preferences</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Profile</h2>
        {reconnecting ? (
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Reconnecting" />
        ) : connected ? (
          <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
        ) : (
          <span className="w-2 h-2 bg-gray-500 rounded-full" title="Disconnected" />
        )}
      </div>

      {/* Pending Changes - Human in the Loop */}
      {pendingChanges.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            Confirm Changes
          </h3>
          {pendingChanges.map(change => (
            <div
              key={change.id}
              className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse"
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{FACT_ICONS[change.fact_type] || '📌'}</span>
                <span className="text-sm text-yellow-400 capitalize">
                  {change.fact_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="text-sm mb-2">
                {change.old_value && (
                  <span className="text-gray-400 line-through mr-2">{change.old_value}</span>
                )}
                <span className="text-white font-medium">→ {change.suggested_value}</span>
              </div>

              {change.reasoning && (
                <p className="text-xs text-gray-400 mb-2">{change.reasoning}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptChange(change)}
                  className="flex-1 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleRejectChange(change)}
                  className="flex-1 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-gray-400 text-sm animate-pulse">
          Loading...
        </div>
      )}

      {!loading && facts.length === 0 && (
        <div className="text-gray-500 text-sm">
          Start chatting to build your profile
        </div>
      )}

      <div className="space-y-3">
        {facts.map((fact) => (
          <div
            key={fact.id}
            className={`p-3 rounded-lg bg-white/5 border border-white/10 transition-all group ${
              fact.isNew ? 'ring-2 ring-purple-500 animate-pulse' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span>{FACT_ICONS[fact.fact_type] || '📌'}</span>
                <span className="text-sm text-gray-400 capitalize">
                  {fact.fact_type.replace(/_/g, ' ')}
                </span>
              </div>
              {editingFact !== fact.id && (
                <button
                  onClick={() => handleEdit(fact)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  Edit
                </button>
              )}
            </div>

            {editingFact === fact.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-black/50 border border-purple-500/50 rounded focus:outline-none focus:border-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(fact)
                    if (e.key === 'Escape') handleCancel()
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(fact)}
                    disabled={saving}
                    className="flex-1 px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50 transition"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-white font-medium">
                  {renderFactValue(fact.fact_value)}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${fact.confidence * 40}px` }}
                    />
                    <span>{Math.round(fact.confidence * 100)}%</span>
                  </div>
                  <span>•</span>
                  <span>{fact.source}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
