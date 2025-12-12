'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'

interface HumeVariables {
  first_name?: string
  current_country?: string
  destination_countries?: string
  budget?: string
  timeline?: string
}

interface HumeVoiceUIProps {
  accessToken: string
  configId: string
  userId: string | null
  variables?: HumeVariables
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function VoiceChatControls({
  accessToken,
  configId,
  userId,
  variables,
}: {
  accessToken: string
  configId?: string
  userId?: string | null
  variables?: HumeVariables
}) {
  const { status, connect, disconnect, isMuted, mute, unmute, messages } = useVoice()
  const [displayMessages, setDisplayMessages] = useState<Message[]>([])
  const messagesRef = useRef<HTMLDivElement>(null)

  const isConnected = status.value === 'connected'
  const isConnecting = status.value === 'connecting'

  // Transform Hume messages to display format
  useEffect(() => {
    const transformed: Message[] = []
    for (const msg of messages) {
      if (msg.type === 'user_message' || msg.type === 'assistant_message') {
        const content = (msg as { message?: { content?: string } }).message?.content
        if (content) {
          transformed.push({
            role: msg.type === 'user_message' ? 'user' : 'assistant',
            content,
          })
        }
      }
    }
    setDisplayMessages(transformed)

    // Auto-scroll to bottom
    if (messagesRef.current) {
      setTimeout(() => {
        messagesRef.current?.scrollTo({
          top: messagesRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 100)
    }
  }, [messages])

  const handleConnect = useCallback(async () => {
    try {
      // Filter out undefined values from variables
      const filteredVariables = variables
        ? Object.fromEntries(
            Object.entries(variables).filter(([, v]) => v !== undefined && v !== '')
          ) as Record<string, string>
        : undefined

      console.log('🎙️ Connecting to Hume...')
      console.log('🎙️ userId:', userId)
      console.log('🎙️ variables:', JSON.stringify(filteredVariables, null, 2))

      // Build sessionSettings - type IS required by Hume SDK
      const hasSettings = userId || (filteredVariables && Object.keys(filteredVariables).length > 0)

      const sessionSettings = hasSettings ? {
        type: 'session_settings' as const,
        ...(userId && { customSessionId: userId }),
        ...(filteredVariables && Object.keys(filteredVariables).length > 0 && {
          variables: filteredVariables,
        }),
      } : undefined

      console.log('🎙️ sessionSettings:', JSON.stringify(sessionSettings, null, 2))

      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId || undefined,
        sessionSettings,
      })

      console.log('🎙️ Connected successfully!')
    } catch (e) {
      console.error('🎙️ Connect error:', e)
    }
  }, [connect, accessToken, configId, userId, variables])

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
        {isConnecting && 'Connecting...'}
        {isConnected && (isMuted ? 'Muted' : 'Listening...')}
        {status.value === 'disconnected' && 'Click to start'}
      </p>

      {/* Controls */}
      <div className="flex gap-4">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`px-8 py-4 rounded-xl font-medium transition-all bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 hover:scale-105 ${
              isConnecting ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            {isConnecting ? 'Connecting...' : 'Start Conversation'}
          </button>
        ) : (
          <>
            <button
              onClick={disconnect}
              className="px-8 py-4 rounded-xl font-medium transition-all bg-red-500/80 hover:bg-red-500"
            >
              End Call
            </button>
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
          </>
        )}
      </div>

      {/* Messages display */}
      {isConnected && displayMessages.length > 0 && (
        <div ref={messagesRef} className="mt-4 w-full max-w-md space-y-2 max-h-60 overflow-y-auto">
          {displayMessages.slice(-5).map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-purple-500/20 text-purple-200 ml-8'
                  : 'bg-white/10 text-gray-300 mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HumeVoiceUI(props: HumeVoiceUIProps) {
  return (
    <VoiceProvider>
      <VoiceChatControls
        accessToken={props.accessToken}
        configId={props.configId}
        userId={props.userId}
        variables={props.variables}
      />
    </VoiceProvider>
  )
}
