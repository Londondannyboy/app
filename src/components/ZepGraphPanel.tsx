// DEPRECATED: ZEP sync moved to voice route
// This is a stub for backward compatibility

'use client'

interface ZepGraphPanelProps {
  userId: string | null
}

export function ZepGraphPanel({ userId }: ZepGraphPanelProps) {
  if (!userId) return null

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">ZEP Knowledge Graph</h3>
      <p className="text-xs text-gray-500">Auto-synced with voice conversations</p>
    </div>
  )
}
