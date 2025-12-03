// DEPRECATED: HITL functionality moved to database
// This is a stub for backward compatibility

'use client'

interface LiveActivityPanelProps {
  userId: string | null
  onConfirmChange?: (changeId: string, confirmed: boolean) => void
}

export function LiveActivityPanel({ userId }: LiveActivityPanelProps) {
  if (!userId) return null

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">Live Activity</h3>
      <p className="text-xs text-gray-500">No pending confirmations</p>
    </div>
  )
}
