'use client'

import { useState, useEffect } from 'react'

interface Fact {
  id: string
  fact_type: string
  fact_value: string | Record<string, unknown>
  confidence: number
  source: string
  created_at: string
  isNew?: boolean
}

// Helper to safely render fact values (can be string or JSONB object)
function renderFactValue(value: string | Record<string, unknown>): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    // If object has a 'value' key, use that
    if ('value' in value && typeof value.value === 'string') return value.value
    // Otherwise stringify
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
}

export function UserFactsPanel({ userId }: UserFactsPanelProps) {
  const [facts, setFacts] = useState<Fact[]>([])
  const [loading, setLoading] = useState(false)

  // SSE connection for real-time updates
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('fact_extracted', (e) => {
      const fact = JSON.parse(e.data)
      setFacts(prev => {
        // Check if fact already exists (by type)
        const existing = prev.find(f => f.fact_type === fact.fact_type)
        if (existing) {
          // Update existing
          return prev.map(f => f.fact_type === fact.fact_type ? {...f, ...fact, isNew: true} : f)
        }
        // Add new with animation
        return [...prev, {...fact, isNew: true}]
      })

      // Remove isNew flag after animation
      setTimeout(() => {
        setFacts(prev => prev.map(f => ({...f, isNew: false})))
      }, 2000)
    })

    eventSource.addEventListener('fact_updated', (e) => {
      const fact = JSON.parse(e.data)
      setFacts(prev => prev.map(f => f.id === fact.id ? {...f, ...fact, isNew: true} : f))
    })

    eventSource.onerror = () => {
      // Fallback to polling if SSE fails
      console.log('SSE connection failed, falling back to polling')
    }

    return () => eventSource.close()
  }, [userId])

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

  if (!userId) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Sign in to save your preferences</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Your Profile</h2>

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
            className={`p-3 rounded-lg bg-white/5 border border-white/10 transition-all ${
              fact.isNew ? 'ring-2 ring-purple-500 animate-pulse' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{FACT_ICONS[fact.fact_type] || '📌'}</span>
              <span className="text-sm text-gray-400 capitalize">
                {fact.fact_type.replace(/_/g, ' ')}
              </span>
            </div>
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
          </div>
        ))}
      </div>
    </div>
  )
}
