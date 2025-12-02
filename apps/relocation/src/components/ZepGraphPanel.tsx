'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface GraphNode {
  id: string
  name: string
  type: string
  summary?: string
}

interface GraphEdge {
  uuid: string
  fact: string
  source: string
  target: string
}

interface ZepGraphPanelProps {
  userId: string | null
}

// Colors for different node types
const NODE_COLORS: Record<string, string> = {
  User: '#8B5CF6',           // Purple
  Destination: '#10B981',    // Green
  Origin: '#F59E0B',         // Amber
  CareerProfile: '#3B82F6',  // Blue
  Organization: '#6366F1',   // Indigo
  Motivation: '#EC4899',     // Pink
  FamilyUnit: '#F97316',     // Orange
  FinancialProfile: '#14B8A6', // Teal
  Preference: '#8B5CF6',     // Purple
  default: '#6B7280',        // Gray
}

const NODE_ICONS: Record<string, string> = {
  User: '👤',
  Destination: '🎯',
  Origin: '🏠',
  CareerProfile: '💼',
  Organization: '🏢',
  Motivation: '💡',
  FamilyUnit: '👨‍👩‍👧‍👦',
  FinancialProfile: '💰',
  Preference: '⭐',
  default: '📌',
}

export function ZepGraphPanel({ userId }: ZepGraphPanelProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [syncing, setSyncing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/zep-graph`,
        {
          headers: {
            'X-Stack-User-Id': userId,
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setNodes(data.nodes || [])
          setEdges(data.edges || [])
        } else {
          setError(data.error || 'Failed to load graph')
        }
      } else {
        setError('Failed to fetch graph data')
      }
    } catch (err) {
      setError('Network error loading graph')
      console.error('Failed to fetch ZEP graph:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Sync profile to ZEP
  const syncToZep = async () => {
    if (!userId) return

    setSyncing(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL}/user/profile/sync-to-zep`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Stack-User-Id': userId,
          },
          body: JSON.stringify({ app_id: 'relocation' }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          // Refresh graph after sync
          await fetchGraph()
        }
      }
    } catch (err) {
      console.error('Failed to sync to ZEP:', err)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  // Simple force-directed layout calculation
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Initialize node positions in a circle
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 3

    const nodePositions: Record<string, { x: number; y: number }> = {}

    // Find the User node (center)
    const userNode = nodes.find(n => n.type === 'User')

    nodes.forEach((node, i) => {
      if (node.type === 'User') {
        nodePositions[node.id] = { x: centerX, y: centerY }
      } else {
        const angle = (i / (nodes.length - 1)) * 2 * Math.PI
        nodePositions[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        }
      }
    })

    // Draw function
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw edges
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      edges.forEach(edge => {
        const source = nodePositions[edge.source]
        const target = nodePositions[edge.target]
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x, source.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }
      })

      // Draw nodes
      nodes.forEach(node => {
        const pos = nodePositions[node.id]
        if (!pos) return

        const color = NODE_COLORS[node.type] || NODE_COLORS.default
        const nodeRadius = node.type === 'User' ? 30 : 20

        // Node circle
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()

        // Node label
        ctx.fillStyle = 'white'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const icon = NODE_ICONS[node.type] || NODE_ICONS.default
        ctx.font = `${nodeRadius * 0.8}px sans-serif`
        ctx.fillText(icon, pos.x, pos.y)

        // Name below node
        ctx.font = '10px sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        const displayName = node.name.length > 15 ? node.name.slice(0, 12) + '...' : node.name
        ctx.fillText(displayName, pos.x, pos.y + nodeRadius + 12)
      })
    }

    draw()
  }, [nodes, edges])

  if (!userId) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">Sign in to view your knowledge graph</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Knowledge Graph</h3>
        <button
          onClick={syncToZep}
          disabled={syncing}
          className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50 transition"
        >
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Graph Container */}
      <div className="relative bg-black/30 border border-white/10 rounded-lg overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading graph...</div>
          </div>
        ) : error ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4">
            <p className="text-yellow-400 text-sm mb-2">{error}</p>
            <button
              onClick={syncToZep}
              className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
            >
              Initialize Graph
            </button>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4">
            <p className="text-gray-500 text-sm mb-2">No graph data yet</p>
            <p className="text-gray-600 text-xs mb-3">
              Start a conversation to build your knowledge graph
            </p>
            <button
              onClick={syncToZep}
              className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
            >
              Sync Now
            </button>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-64"
            style={{ display: 'block' }}
          />
        )}
      </div>

      {/* Legend */}
      {nodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(nodes.map(n => n.type))).map(type => (
            <div key={type} className="flex items-center gap-1 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NODE_COLORS[type] || NODE_COLORS.default }}
              />
              <span className="text-gray-400">{type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Facts List */}
      {edges.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500">Relationships</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {edges.slice(0, 10).map(edge => (
              <div
                key={edge.uuid}
                className="text-xs p-2 bg-white/5 rounded border border-white/10"
              >
                {edge.fact}
              </div>
            ))}
            {edges.length > 10 && (
              <p className="text-xs text-gray-500 text-center">
                +{edges.length - 10} more relationships
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} relationships</span>
      </div>
    </div>
  )
}
