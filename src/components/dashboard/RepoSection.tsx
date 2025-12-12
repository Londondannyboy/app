'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSSE } from '@/hooks/useSSE'

interface RepoFact {
  id: number | string  // Backend returns integer, but handle string for safety
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

// Validated options for each fact type
const FACT_OPTIONS: Record<string, string[]> = {
  destination: ['Cyprus', 'Malta', 'Slovenia', 'Portugal', 'Spain', 'Greece', 'Italy', 'Croatia', 'Estonia', 'Czech Republic', 'Hungary', 'Poland', 'Germany', 'Netherlands', 'France', 'UK', 'Ireland', 'UAE', 'Singapore', 'Thailand', 'Mexico', 'Costa Rica', 'Other'],
  origin: ['United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Ireland', 'New Zealand', 'South Africa', 'India', 'Other'],
  budget: ['Under €1,000/month', '€1,000-2,000/month', '€2,000-3,000/month', '€3,000-5,000/month', '€5,000-10,000/month', 'Over €10,000/month'],
  timeline: ['ASAP', '1-3 months', '3-6 months', '6-12 months', '1-2 years', 'No rush / exploring'],
  family_status: ['Single', 'In a relationship', 'Married', 'Married with children', 'Single parent', 'Retired couple'],
  profession: ['Software Developer', 'Designer', 'Marketing', 'Finance', 'Consultant', 'Entrepreneur', 'Freelancer', 'Remote Worker', 'Digital Nomad', 'Executive', 'Healthcare', 'Education', 'Other'],
  nationality: ['British', 'American', 'Canadian', 'Australian', 'German', 'French', 'Dutch', 'Irish', 'New Zealander', 'South African', 'Indian', 'Other'],
  work_type: ['Fully Remote', 'Hybrid', 'On-site', 'Self-employed', 'Retired', 'Looking for work'],
  visa_interest: ['Digital Nomad Visa', 'Golden Visa', 'Work Permit', 'Freelance Visa', 'Retirement Visa', 'Student Visa', 'Startup Visa', 'Not sure yet'],
  lifestyle: ['Urban city life', 'Beach / coastal', 'Mountain / countryside', 'Suburban', 'Island life', 'Flexible / traveling'],
  priorities: ['Low cost of living', 'Quality healthcare', 'Good weather', 'English-speaking', 'Low taxes', 'Safety', 'Expat community', 'Work opportunities', 'Nature / outdoor activities', 'Culture / food'],
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
  const [editingFact, setEditingFact] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleEdit = (fact: RepoFact) => {
    setEditingFact(String(fact.id))
    setEditValue(renderValue(fact.fact_value))
  }

  const handleSave = async (fact: RepoFact) => {
    if (!userId) return
    if (!editValue) {
      alert('Please select a value')
      return
    }
    setSaving(true)

    try {
      const payload = {
        fact_id: String(fact.id),
        fact_type: fact.fact_type,
        value: editValue,
      }
      console.log('Saving fact:', payload)

      const res = await fetch(
        `/api/user/profile/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      console.log('Save response:', data)

      if (res.ok && data.success) {
        // Update local state - use String comparison for safety since id types can vary
        const factIdStr = String(fact.id)
        setFacts(prev =>
          prev.map(f =>
            String(f.id) === factIdStr
              ? { ...f, fact_value: { value: editValue }, updated_at: new Date().toISOString() }
              : f
          )
        )
        setRecentChanges(prev => [{
          id: factIdStr,
          fact_type: fact.fact_type,
          old_value: renderValue(fact.fact_value),
          new_value: editValue,
          timestamp: new Date(),
        }, ...prev].slice(0, 5))
        console.log('Fact updated successfully in local state')
      } else {
        console.error('Save failed:', data)
        alert(`Failed to save: ${data.detail || data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to update fact:', error)
      alert('Network error - please try again')
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

  // Fetch all facts (the "repo")
  useEffect(() => {
    if (!userId) return

    const fetchRepo = async () => {
      try {
        const res = await fetch(
          `/api/user/profile/facts`,
          { headers: { 'X-User-Id': userId } }
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

  // SSE event handler for real-time updates
  const handleSSEEvent = useCallback((eventType: string, data: unknown) => {
    const eventData = data as Record<string, unknown>

    if (eventType === 'fact_extracted') {
      // Add to recent changes
      setRecentChanges(prev => [{
        id: eventData.id ? String(eventData.id) : Date.now().toString(),
        fact_type: eventData.fact_type as string,
        old_value: undefined,
        new_value: typeof eventData.fact_value === 'string'
          ? eventData.fact_value
          : JSON.stringify(eventData.fact_value),
        timestamp: new Date(),
      }, ...prev].slice(0, 5))

      // Update facts
      setFacts(prev => {
        const existing = prev.find(f => f.fact_type === eventData.fact_type)
        if (existing) {
          return prev.map(f =>
            f.fact_type === eventData.fact_type
              ? { ...f, ...eventData, updated_at: new Date().toISOString() } as RepoFact
              : f
          )
        }
        return [...prev, { ...eventData, updated_at: new Date().toISOString() } as RepoFact]
      })
    } else if (eventType === 'fact_updated') {
      // Find old value for change log - use String comparison for type safety
      const eventIdStr = String(eventData.id)
      setFacts(prev => {
        const oldFact = prev.find(f => String(f.id) === eventIdStr)

        setRecentChanges(changes => [{
          id: eventIdStr,
          fact_type: eventData.fact_type as string,
          old_value: oldFact ? renderValue(oldFact.fact_value) : undefined,
          new_value: typeof eventData.fact_value === 'string'
            ? eventData.fact_value
            : JSON.stringify(eventData.fact_value),
          timestamp: new Date(),
        }, ...changes].slice(0, 5))

        return prev.map(f =>
          String(f.id) === eventIdStr
            ? { ...f, ...eventData, updated_at: new Date().toISOString() } as RepoFact
            : f
        )
      })
    }
  }, [])

  const { connected, reconnecting } = useSSE({
    userId,
    onEvent: handleSSEEvent,
    events: ['fact_extracted', 'fact_updated'],
  })

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
          {reconnecting ? (
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Reconnecting..." />
          ) : connected ? (
            <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
          ) : (
            <span className="w-2 h-2 bg-gray-500 rounded-full" title="Disconnected" />
          )}
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
                    {(change.fact_type || '').replace(/_/g, ' ')}
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
                      className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition group"
                    >
                      <div className="text-xs text-gray-400 capitalize mb-0.5">
                        {(fact.fact_type || '').replace(/_/g, ' ')}
                      </div>

                      {editingFact === String(fact.id) ? (
                        <div className="space-y-2">
                          {FACT_OPTIONS[fact.fact_type] ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-black/50 border border-purple-500/50 rounded focus:outline-none focus:border-purple-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') handleCancel()
                              }}
                            >
                              <option value="">Select...</option>
                              {FACT_OPTIONS[fact.fact_type].map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-black/50 border border-purple-500/50 rounded focus:outline-none focus:border-purple-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(fact)
                                if (e.key === 'Escape') handleCancel()
                              }}
                            />
                          )}
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSave(fact)}
                              disabled={saving || !editValue}
                              className="flex-1 px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-white font-medium truncate">
                            {renderValue(fact.fact_value)}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-gray-500">
                              {Math.round(fact.confidence * 100)}% conf
                            </div>
                            <button
                              onClick={() => handleEdit(fact)}
                              className="opacity-0 group-hover:opacity-100 text-xs text-purple-400 transition hover:text-purple-300"
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      )}
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
