'use client'

import { useState, useEffect, useCallback, Component, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { getApiUrl } from '@/lib/api'

const HUME_CONFIG_ID = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || ''

interface VoiceWidgetProps {
  userId: string | null
  onConnectionChange?: (isConnected: boolean) => void
}

// Error boundary to catch Hume SDK errors
class VoiceErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('VoiceWidget error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 bg-red-500/20 rounded-xl text-red-300 text-center">
          <p className="font-medium mb-2">Voice interface error</p>
          <p className="text-sm text-red-400">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-sm transition"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Lazy load the Hume components to avoid SSR issues
const HumeVoiceUI = dynamic(
  () => import('./HumeVoiceUI').catch((err) => {
    console.error('Failed to load HumeVoiceUI:', err)
    // Return a fallback component on error
    return {
      default: () => (
        <div className="p-5 bg-red-500/20 rounded-xl text-red-300 text-center">
          <p className="font-medium mb-2">Failed to load voice interface</p>
          <p className="text-sm text-red-400">Please refresh the page</p>
        </div>
      ),
    }
  }),
  {
    ssr: false,
    loading: () => (
      <div className="p-5 text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading voice interface...
      </div>
    ),
  }
)

interface UserContext {
  name?: string
  current_country?: string
  destination_countries?: string[]
  nationality?: string
  timeline?: string
}

export function VoiceWidget({ userId, onConnectionChange }: VoiceWidgetProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(false)

  // Ensure client-side only
  useEffect(() => {
    setIsClient(true)

    // Set a timeout to show a warning if loading takes too long
    const timer = setTimeout(() => {
      setLoadTimeout(true)
    }, 10000) // 10 seconds

    return () => clearTimeout(timer)
  }, [])

  // Fetch access token on mount
  useEffect(() => {
    if (!isClient) return

    const fetchToken = async () => {
      try {
        const response = await fetch(getApiUrl('/voice/access-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setAccessToken(data.accessToken)
        if (data.userContext) {
          setUserContext(data.userContext)
        }
      } catch (err) {
        console.error('Failed to fetch access token:', err)
        setError('Failed to connect to voice service')
      }
    }

    fetchToken()
  }, [isClient, userId])

  if (!isClient) {
    return (
      <div className="p-5 text-center text-gray-500">
        Loading...
      </div>
    )
  }

  if (!HUME_CONFIG_ID) {
    return (
      <div className="text-yellow-400 p-4 border border-yellow-400/20 rounded-lg text-center">
        <p className="font-medium">Voice not configured</p>
        <p className="text-sm text-yellow-500 mt-1">Missing HUME_CONFIG_ID</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 bg-red-500/20 rounded-xl text-red-300 text-center">
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null)
            setAccessToken(null)
          }}
          className="mt-3 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-sm transition"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="p-5 text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Initializing voice interface...
        {loadTimeout && (
          <p className="text-xs text-yellow-400 mt-2">
            Taking longer than expected...
            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline hover:text-yellow-300"
            >
              Refresh
            </button>
          </p>
        )}
      </div>
    )
  }

  return (
    <VoiceErrorBoundary
      fallback={
        <div className="p-5 bg-red-500/20 rounded-xl text-red-300">
          Voice interface failed to load
        </div>
      }
    >
      <HumeVoiceUI
        accessToken={accessToken}
        configId={HUME_CONFIG_ID}
        userId={userId}
        userContext={userContext}
        onConnectionChange={onConnectionChange}
      />
    </VoiceErrorBoundary>
  )
}
