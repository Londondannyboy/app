'use client'

import { useEffect, useCallback } from 'react'
import { useVoice, VoiceProvider } from '@humeai/voice-react'

interface UserContext {
  name?: string
  current_country?: string
  destination_countries?: string[]
  nationality?: string
  timeline?: string
}

interface HumeVoiceUIProps {
  accessToken: string
  configId: string
  userId: string | null
  userContext?: UserContext | null
  onConnectionChange?: (isConnected: boolean) => void
}

function VoiceControls({
  accessToken,
  configId,
  userId,
  userContext,
  onConnectionChange,
}: HumeVoiceUIProps) {
  const { connect, disconnect, status, isMuted, mute, unmute, messages } = useVoice()

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
        // Build session settings with user context for personalization
        const sessionSettings: Record<string, any> = {
          customSessionId: userId || undefined,
        }

        // Inject user context as variables for system prompt personalization
        if (userContext) {
          sessionSettings.variables = {
            user_name: userContext.name || 'friend',
            current_country: userContext.current_country || 'unknown',
            destinations: userContext.destination_countries?.join(', ') || 'not specified',
            nationality: userContext.nationality || 'not specified',
            timeline: userContext.timeline || 'not specified',
          }
        }

        await connect({
          auth: { type: 'accessToken', value: accessToken },
          configId: configId,
          sessionSettings,
        } as Parameters<typeof connect>[0])
      } catch (err) {
        console.error('Failed to connect:', err)
      }
    }
  }, [isConnected, connect, disconnect, accessToken, configId, userId, userContext])

  // Get last few messages for display
  const recentMessages = messages.slice(-3)

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Orb indicator */}
      <div
        className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
          isConnected
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50'
            : isConnecting
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
            : 'bg-gradient-to-r from-purple-500 to-pink-500'
        }`}
      >
        <span className="text-5xl">
          {isConnected ? '🎙️' : isConnecting ? '⏳' : '🔇'}
        </span>
      </div>

      {/* Status text */}
      <p className="text-gray-400 text-sm h-5">
        {status.value === 'connecting' && 'Connecting...'}
        {status.value === 'connected' && (isMuted ? 'Muted' : 'Listening...')}
        {status.value === 'disconnected' && 'Click to start'}
        {status.value === 'error' && 'Connection error'}
      </p>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={toggleConnection}
          disabled={isConnecting}
          className={`px-8 py-4 rounded-xl font-medium transition-all ${
            isConnected
              ? 'bg-red-500/80 hover:bg-red-500'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 hover:scale-105'
          } ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'End Call' : 'Start Conversation'}
        </button>

        {isConnected && (
          <button
            onClick={() => (isMuted ? unmute() : mute())}
            className={`px-6 py-4 rounded-xl transition-all ${
              isMuted
                ? 'bg-yellow-500/80 hover:bg-yellow-500'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
        )}
      </div>

      {/* Recent messages */}
      {isConnected && recentMessages.length > 0 && (
        <div className="mt-4 w-full max-w-md space-y-2">
          {recentMessages.map((msg, idx) => {
            // Safely extract message content as string
            let content = ''
            if (msg.type === 'user_message' || msg.type === 'assistant_message') {
              const msgContent = (msg as any).message?.content
              if (typeof msgContent === 'string') {
                content = msgContent
              } else if (msgContent && typeof msgContent === 'object') {
                content = JSON.stringify(msgContent)
              }
            }

            if (!content) return null

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg text-sm ${
                  msg.type === 'user_message'
                    ? 'bg-purple-500/20 text-purple-200 ml-8'
                    : 'bg-white/10 text-gray-300 mr-8'
                }`}
              >
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HumeVoiceUI(props: HumeVoiceUIProps) {
  return (
    <VoiceProvider>
      <VoiceControls {...props} />
    </VoiceProvider>
  )
}
