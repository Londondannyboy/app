'use client'

interface ThinkingIndicatorProps {
  status: string | null
  activeTools: string[]
}

export function ThinkingIndicator({ status, activeTools }: ThinkingIndicatorProps) {
  if (!status && activeTools.length === 0) return null

  return (
    <div className="mb-4 p-3 bg-purple-500/10 border-l-4 border-purple-500 rounded-r-lg">
      {activeTools.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="animate-pulse">🔍</span>
          <span className="text-purple-400 text-sm">
            {activeTools.map(t => t.replace(/_/g, ' ')).join(', ')}...
          </span>
        </div>
      )}
      {status && (
        <div className="text-gray-400 text-sm italic">
          {status}
        </div>
      )}
    </div>
  )
}
