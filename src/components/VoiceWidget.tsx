'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Lazy load HumeVoiceUI to avoid SSR issues
const HumeVoiceUI = dynamic(() => import('./HumeVoiceUI'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="w-40 h-40 rounded-full bg-gray-700 animate-pulse" />
      <p className="text-gray-500">Loading voice interface...</p>
    </div>
  ),
})

interface HumeVariables {
  first_name?: string
  current_country?: string
  destination_countries?: string
  budget?: string
  timeline?: string
}

interface VoiceWidgetProps {
  userId: string | null
}

export function VoiceWidget({ userId }: VoiceWidgetProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [configId, setConfigId] = useState<string | null>(null)
  const [variables, setVariables] = useState<HumeVariables>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch('/api/voice/access-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setAccessToken(data.accessToken)
        setConfigId(data.configId || process.env.NEXT_PUBLIC_HUME_CONFIG_ID || '')
        setVariables(data.variables || {})

        console.log('🎙️ Token fetched:', {
          hasToken: !!data.accessToken,
          configId: data.configId,
          variables: data.variables,
        })
      } catch (err) {
        console.error('Failed to fetch token:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize voice')
      } finally {
        setLoading(false)
      }
    }

    fetchToken()
  }, [userId])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="w-40 h-40 rounded-full bg-gray-700 animate-pulse" />
        <p className="text-gray-500">Initializing...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/20 rounded-xl text-center">
        <p className="text-red-300 font-medium mb-2">Voice Error</p>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null)
            setLoading(true)
            setAccessToken(null)
          }}
          className="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-sm transition"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!accessToken || !configId) {
    return (
      <div className="p-6 bg-yellow-500/20 rounded-xl text-center">
        <p className="text-yellow-300 font-medium">Voice not configured</p>
        <p className="text-yellow-400/70 text-sm mt-1">Missing credentials</p>
      </div>
    )
  }

  return (
    <HumeVoiceUI
      accessToken={accessToken}
      configId={configId}
      userId={userId}
      variables={variables}
    />
  )
}
