'use client'

import { useVoice, VoiceProvider } from '@humeai/voice-react'

interface VoiceWidgetProps {
  userId: string | null
}

function VoiceControls() {
  const { connect, disconnect, status, isMuted, mute, unmute } = useVoice()

  const isConnected = status.value === 'connected'

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
        {!isConnected ? (
          <button
            onClick={() => connect()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
          >
            Start Conversation
          </button>
        ) : (
          <>
            <button
              onClick={() => isMuted ? unmute() : mute()}
              className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition"
            >
              {isMuted ? '🔇 Unmute' : '🔊 Mute'}
            </button>
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition"
            >
              End Call
            </button>
          </>
        )}
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

export function VoiceWidget({ userId }: VoiceWidgetProps) {
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID

  if (!configId) {
    return (
      <div className="text-red-400 p-4 border border-red-400/20 rounded-lg">
        Missing NEXT_PUBLIC_HUME_CONFIG_ID environment variable
      </div>
    )
  }

  return (
    <VoiceProvider
      configId={configId}
      auth={{
        type: 'accessToken',
        value: async () => {
          // Fetch access token from our gateway
          const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/voice/access-token`)
          const { accessToken } = await res.json()
          return accessToken
        }
      }}
      sessionSettings={{
        customSessionId: userId || undefined,
      }}
    >
      <VoiceControls />
    </VoiceProvider>
  )
}
