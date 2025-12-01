'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVoice, VoiceProvider } from '@humeai/voice-react'

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || ''
const HUME_CONFIG_ID = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || ''

interface VoiceWidgetProps {
  userId: string | null
  onConnectionChange?: (isConnected: boolean) => void
}

interface VoiceControlsProps {
  accessToken: string
  userId: string | null
  onConnectionChange?: (isConnected: boolean) => void
}

function VoiceControls({ accessToken, userId, onConnectionChange }: VoiceControlsProps) {
  const { connect, disconnect, status } = useVoice()

  const isConnected = status.value === 'connected'
  const isConnecting = status.value === 'connecting'

  useEffect(() => {
    onConnectionChange?.(isConnected)
  }, [isConnected, onConnectionChange])

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      await disconnect()
    } else {
      try {
        await connect({
          auth: { type: 'accessToken', value: accessToken },
          configId: HUME_CONFIG_ID,
          sessionSettings: {
            customSessionId: userId || undefined,
          },
        } as Parameters<typeof connect>[0])
      } catch (err) {
        console.error('Failed to connect:', err)
      }
    }
  }, [isConnected, connect, disconnect, accessToken, userId])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status indicator */}
      <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
        isConnected
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse'
          : 'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        <span className="text-4xl">
          {isConnected ? '🎙️' : '🔇'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={toggleConnection}
          disabled={isConnecting}
          className={`px-6 py-3 rounded-lg transition ${
            isConnected
              ? 'bg-red-500/80 hover:bg-red-500'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
          } ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'End Call' : 'Start Conversation'}
        </button>
      </div>

      {/* Status text */}
      <p className="text-gray-400 text-sm">
        {status.value === 'connecting' && 'Connecting...'}
        {status.value === 'connected' && 'Listening...'}
        {status.value === 'disconnected' && 'Click to start'}
      </p>
    </div>
  )
}

export function VoiceWidget({ userId, onConnectionChange }: VoiceWidgetProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch access token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${GATEWAY_URL}/voice/access-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setAccessToken(data.accessToken)
      } catch (err) {
        console.error('Failed to fetch access token:', err)
        setError('Failed to connect to voice service')
      }
    }

    if (GATEWAY_URL) {
      fetchToken()
    }
  }, [])

  if (!HUME_CONFIG_ID) {
    return (
      <div className="text-red-400 p-4 border border-red-400/20 rounded-lg">
        Missing NEXT_PUBLIC_HUME_CONFIG_ID environment variable
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 bg-red-500/20 rounded-xl text-red-300">
        {error}
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="p-5 text-center text-gray-500">
        Initializing voice interface...
      </div>
    )
  }

  return (
    <VoiceProvider>
      <VoiceControls
        accessToken={accessToken}
        userId={userId}
        onConnectionChange={onConnectionChange}
      />
    </VoiceProvider>
  )
}
