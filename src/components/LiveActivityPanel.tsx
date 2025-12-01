'use client'

import { useState, useEffect } from 'react'

interface ToolCall {
  id: string
  name: string
  status: 'running' | 'completed' | 'error'
  input?: Record<string, unknown>
  output?: string
  timestamp: Date
}

interface ZepNode {
  id: string
  label: string
  type: 'user' | 'fact' | 'entity'
}

interface ZepEdge {
  source: string
  target: string
  relation: string
}

interface ProfileChange {
  id: string
  factType: string
  oldValue?: string
  newValue: string
  confidence: number
  requiresConfirmation: boolean
  confirmed?: boolean
}

interface LiveActivityPanelProps {
  userId: string | null
  onConfirmChange?: (changeId: string, confirmed: boolean) => void
}

const TOOL_ICONS: Record<string, string> = {
  search_knowledge: '🔍',
  search_zep: '🧠',
  query_countries: '🌍',
  query_jobs: '💼',
  search_articles: '📰',
  get_user_profile: '👤',
  update_profile: '✏️',
  extract_facts: '🔬',
}

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: 'Searching knowledge base',
  search_zep: 'Querying ZEP graph',
  query_countries: 'Looking up country info',
  query_jobs: 'Searching jobs',
  search_articles: 'Finding relevant articles',
  get_user_profile: 'Loading your profile',
  update_profile: 'Updating profile',
  extract_facts: 'Extracting facts',
}

export function LiveActivityPanel({ userId, onConfirmChange }: LiveActivityPanelProps) {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [zepNodes, setZepNodes] = useState<ZepNode[]>([])
  const [zepEdges, setZepEdges] = useState<ZepEdge[]>([])
  const [profileChanges, setProfileChanges] = useState<ProfileChange[]>([])
  const [isExpanded, setIsExpanded] = useState(true)

  // SSE connection for live updates
  useEffect(() => {
    if (!userId) return

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/events?user_id=${userId}`
    )

    eventSource.addEventListener('tool_start', (e) => {
      const data = JSON.parse(e.data)
      setToolCalls(prev => [...prev, {
        id: data.id,
        name: data.name,
        status: 'running',
        input: data.input,
        timestamp: new Date(),
      }])
    })

    eventSource.addEventListener('tool_end', (e) => {
      const data = JSON.parse(e.data)
      setToolCalls(prev => prev.map(t =>
        t.id === data.id ? { ...t, status: 'completed', output: data.output } : t
      ))
      // Remove completed tools after 3 seconds
      setTimeout(() => {
        setToolCalls(prev => prev.filter(t => t.id !== data.id))
      }, 3000)
    })

    eventSource.addEventListener('zep_query', (e) => {
      const data = JSON.parse(e.data)
      // Add nodes and edges from ZEP query results
      if (data.nodes) {
        setZepNodes(prev => [...prev, ...data.nodes])
      }
      if (data.edges) {
        setZepEdges(prev => [...prev, ...data.edges])
      }
    })

    eventSource.addEventListener('profile_change_pending', (e) => {
      const data = JSON.parse(e.data)
      setProfileChanges(prev => [...prev, {
        id: data.id,
        factType: data.fact_type,
        oldValue: data.old_value,
        newValue: data.new_value,
        confidence: data.confidence,
        requiresConfirmation: data.requires_confirmation,
      }])
    })

    eventSource.addEventListener('profile_change_confirmed', (e) => {
      const data = JSON.parse(e.data)
      setProfileChanges(prev => prev.filter(c => c.id !== data.id))
    })

    return () => eventSource.close()
  }, [userId])

  const handleConfirm = (changeId: string, confirmed: boolean) => {
    onConfirmChange?.(changeId, confirmed)
    setProfileChanges(prev => prev.map(c =>
      c.id === changeId ? { ...c, confirmed } : c
    ))
  }

  const activeTools = toolCalls.filter(t => t.status === 'running')
  const hasActivity = activeTools.length > 0 || zepNodes.length > 0 || profileChanges.length > 0

  if (!userId) return null

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${hasActivity ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="font-medium">Live Activity</span>
          {activeTools.length > 0 && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              {activeTools.length} running
            </span>
          )}
        </div>
        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Active Tool Calls */}
          {activeTools.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide">Tools Running</h4>
              {activeTools.map(tool => (
                <div key={tool.id} className="flex items-center gap-3 p-2 bg-purple-500/10 rounded-lg">
                  <span className="text-xl animate-pulse">
                    {TOOL_ICONS[tool.name] || '⚙️'}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {TOOL_LABELS[tool.name] || tool.name}
                    </div>
                    {tool.input && (
                      <div className="text-xs text-gray-400 truncate">
                        {JSON.stringify(tool.input).slice(0, 50)}...
                      </div>
                    )}
                  </div>
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ))}
            </div>
          )}

          {/* ZEP Graph Visualization */}
          {zepNodes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide">Knowledge Graph</h4>
              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-white/5">
                <div className="flex flex-wrap gap-2">
                  {zepNodes.slice(-6).map(node => (
                    <span
                      key={node.id}
                      className={`px-2 py-1 rounded-full text-xs ${
                        node.type === 'user' ? 'bg-green-500/20 text-green-400' :
                        node.type === 'fact' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {node.label}
                    </span>
                  ))}
                </div>
                {zepEdges.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    {zepEdges.slice(-3).map((edge, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span>{edge.source}</span>
                        <span className="text-purple-400">→ {edge.relation} →</span>
                        <span>{edge.target}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Changes Requiring Confirmation */}
          {profileChanges.filter(c => c.requiresConfirmation && !c.confirmed).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide">Confirm Changes</h4>
              {profileChanges
                .filter(c => c.requiresConfirmation && c.confirmed === undefined)
                .map(change => (
                  <div key={change.id} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="text-sm mb-2">
                      Update <span className="font-medium text-yellow-400">{change.factType.replace(/_/g, ' ')}</span>?
                    </div>
                    {change.oldValue && (
                      <div className="text-xs text-gray-400 mb-1">
                        From: <span className="line-through">{change.oldValue}</span>
                      </div>
                    )}
                    <div className="text-sm font-medium text-white mb-3">
                      To: {change.newValue}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(change.id, true)}
                        className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 rounded text-sm font-medium transition"
                      >
                        Yes, update
                      </button>
                      <button
                        onClick={() => handleConfirm(change.id, false)}
                        className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition"
                      >
                        No, keep current
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* No Activity State */}
          {!hasActivity && (
            <div className="text-center text-gray-500 text-sm py-4">
              Start chatting to see live activity
            </div>
          )}
        </div>
      )}
    </div>
  )
}
