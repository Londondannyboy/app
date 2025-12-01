'use client'

interface ToolCallInfo {
  name: string
  status: 'running' | 'completed'
  result?: string
}

interface ThinkingIndicatorProps {
  status: string | null
  activeTools: string[]
  toolResults?: Record<string, string>
  zepQuery?: string
  neonQuery?: string
}

const TOOL_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  search_knowledge: { icon: '🧠', label: 'Searching ZEP knowledge graph', color: 'purple' },
  search_zep: { icon: '🔮', label: 'Querying ZEP memory', color: 'purple' },
  get_user_profile: { icon: '👤', label: 'Loading your profile', color: 'blue' },
  update_profile: { icon: '✏️', label: 'Updating your profile', color: 'green' },
  extract_facts: { icon: '🔬', label: 'Extracting facts from conversation', color: 'yellow' },
  query_countries: { icon: '🌍', label: 'Looking up country information', color: 'cyan' },
  query_jobs: { icon: '💼', label: 'Searching job listings', color: 'orange' },
  search_articles: { icon: '📰', label: 'Finding relevant articles', color: 'pink' },
  query_deals: { icon: '🎫', label: 'Checking available deals', color: 'green' },
  search_neon: { icon: '💾', label: 'Querying Neon database', color: 'blue' },
}

export function ThinkingIndicator({
  status,
  activeTools,
  toolResults = {},
  zepQuery,
  neonQuery,
}: ThinkingIndicatorProps) {
  if (!status && activeTools.length === 0 && !zepQuery && !neonQuery) return null

  const getToolInfo = (tool: string) => {
    return TOOL_DISPLAY[tool] || { icon: '⚙️', label: tool.replace(/_/g, ' '), color: 'gray' }
  }

  return (
    <div className="mb-4 space-y-2">
      {/* Main thinking status */}
      {status && (
        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border-l-4 border-purple-500 rounded-r-lg">
          <span className="animate-pulse">💭</span>
          <span className="text-purple-300 text-sm italic">{status}</span>
        </div>
      )}

      {/* Active tool calls */}
      {activeTools.length > 0 && (
        <div className="space-y-1">
          {activeTools.map((tool, idx) => {
            const info = getToolInfo(tool)
            const result = toolResults[tool]

            return (
              <div
                key={`${tool}-${idx}`}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  result
                    ? 'bg-green-500/10 border border-green-500/20'
                    : `bg-${info.color}-500/10 border border-${info.color}-500/20`
                }`}
              >
                <span className={result ? '' : 'animate-pulse'}>{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{info.label}</span>
                  {result && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      ✓ {result}
                    </div>
                  )}
                </div>
                {!result && (
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ZEP Query indicator */}
      {zepQuery && (
        <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="animate-pulse">🔮</span>
          <div className="flex-1">
            <span className="text-xs text-blue-400">ZEP Graph Query</span>
            <div className="text-sm text-white">{zepQuery}</div>
          </div>
        </div>
      )}

      {/* Neon Query indicator */}
      {neonQuery && (
        <div className="flex items-center gap-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <span className="animate-pulse">💾</span>
          <div className="flex-1">
            <span className="text-xs text-cyan-400">Neon Database</span>
            <div className="text-sm text-white">{neonQuery}</div>
          </div>
        </div>
      )}
    </div>
  )
}
