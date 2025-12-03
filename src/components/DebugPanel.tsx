'use client'

import { useState, useEffect } from 'react'

interface DebugEvent {
  id: string
  timestamp: Date
  type: 'success' | 'error' | 'info' | 'api_call'
  message: string
  details?: any
}

interface DebugPanelProps {
  userId: string | null
  show?: boolean
}

export function DebugPanel({ userId, show = true }: DebugPanelProps) {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'api_call'>('all')

  // Listen for debug events from window
  useEffect(() => {
    const handleDebugEvent = (e: CustomEvent) => {
      const event: DebugEvent = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: e.detail.type || 'info',
        message: e.detail.message,
        details: e.detail.details
      }
      setEvents(prev => [event, ...prev].slice(0, 50)) // Keep last 50
    }

    window.addEventListener('debug-event' as any, handleDebugEvent)
    return () => window.removeEventListener('debug-event' as any, handleDebugEvent)
  }, [])

  // Auto-add events for API calls
  useEffect(() => {
    if (!userId) return

    // Test database connection
    fetch('/api/user/profile/facts', { headers: { 'X-User-Id': userId } })
      .then(res => {
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('debug-event', {
            detail: { type: 'success', message: '✅ Database connected', details: 'Facts API responding' }
          }))
        } else {
          window.dispatchEvent(new CustomEvent('debug-event', {
            detail: { type: 'error', message: '❌ Database error', details: `Status: ${res.status}` }
          }))
        }
      })
      .catch(err => {
        window.dispatchEvent(new CustomEvent('debug-event', {
          detail: { type: 'error', message: '❌ API call failed', details: err.message }
        }))
      })
  }, [userId])

  const filteredEvents = events.filter(e => filter === 'all' || e.type === filter)

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition ${
          events.some(e => e.type === 'error')
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-purple-500 text-white'
        }`}
      >
        🔍 Debug {events.length > 0 && `(${events.length})`}
      </button>

      {isExpanded && (
        <div className="mt-2 w-96 max-h-96 bg-black/95 border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2 bg-purple-500/20 border-b border-white/10 flex items-center justify-between">
            <span className="font-medium text-sm">Live System Events</span>
            <div className="flex gap-1">
              {(['all', 'success', 'error', 'api_call'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    filter === f ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="overflow-y-auto max-h-80 p-2 space-y-1">
            {filteredEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-xs">
                No events yet. Voice conversations and API calls will appear here.
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-2 rounded text-xs ${
                    event.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
                    event.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                    event.type === 'api_call' ? 'bg-blue-500/10 border border-blue-500/20' :
                    'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">{event.message}</span>
                    <span className="text-gray-500 text-xs">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {event.details && (
                    <pre className="text-gray-400 text-xs mt-1 overflow-x-auto">
                      {typeof event.details === 'string'
                        ? event.details
                        : JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-black/50 border-t border-white/10 flex justify-between text-xs">
            <span className="text-gray-500">
              {filteredEvents.length} events
            </span>
            <button
              onClick={() => setEvents([])}
              className="text-red-400 hover:text-red-300 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to log debug events
export function logDebugEvent(type: 'success' | 'error' | 'info' | 'api_call', message: string, details?: any) {
  window.dispatchEvent(new CustomEvent('debug-event', {
    detail: { type, message, details }
  }))
}
