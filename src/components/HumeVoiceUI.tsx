'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useVoice, VoiceProvider, VoiceReadyState } from '@humeai/voice-react'
import { getApiUrl } from '@/lib/api'

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

// Tool call handler - calls our API endpoints when Hume requests a tool
async function handleToolCall(
  toolCall: any,
  send: {
    success: (content: unknown) => any
    error: (e: { error: string; code: string; level: string; content: string }) => any
  },
  userId: string | null
): Promise<any> {
  const toolName = toolCall.name
  const parameters = toolCall.parameters ? JSON.parse(toolCall.parameters) : {}

  console.log(`🔧 Tool call received: ${toolName}`, { parameters, userId })

  try {
    let apiUrl: string
    let body: Record<string, any> = { custom_session_id: userId }

    switch (toolName) {
      case 'get_user_profile':
        apiUrl = getApiUrl('/hume/tools/get-user-profile')
        break
      case 'search_knowledge':
        apiUrl = getApiUrl('/hume/tools/search-knowledge')
        body.parameters = parameters
        break
      case 'search_articles':
        apiUrl = getApiUrl('/hume/tools/search-articles')
        body.parameters = parameters
        break
      default:
        console.warn(`Unknown tool: ${toolName}`)
        return send.error({
          error: 'Unknown tool',
          code: 'unknown_tool',
          level: 'warn',
          content: `Tool "${toolName}" is not recognized.`
        })
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const result = await response.json()
    console.log(`✅ Tool response for ${toolName}:`, result.content?.substring(0, 100))

    return send.success(result.content || 'No content returned')

  } catch (error) {
    console.error(`Tool call error for ${toolName}:`, error)
    return send.error({
      error: 'Tool execution failed',
      code: 'execution_error',
      level: 'error',
      content: `Failed to execute tool "${toolName}". Please try again.`
    })
  }
}

function VoiceControls({
  accessToken,
  configId,
  userId,
  userContext,
  onConnectionChange,
}: HumeVoiceUIProps) {
  const { connect, disconnect, readyState, isMuted, mute, unmute, messages } = useVoice()
  const savedMessagesRef = useRef<Set<string>>(new Set())

  const isConnected = readyState === VoiceReadyState.OPEN
  const isConnecting = readyState === VoiceReadyState.CONNECTING

  useEffect(() => {
    onConnectionChange?.(isConnected)
  }, [isConnected, onConnectionChange])

  // Variables are now passed at connect time, no need for post-connection update

  // Save transcripts to database
  const saveTranscripts = useCallback(async () => {
    if (!userId || messages.length === 0) return

    const messagesToSave = messages.filter(msg => {
      if (msg.type !== 'user_message' && msg.type !== 'assistant_message') return false
      const content = (msg as any).message?.content
      if (!content) return false
      // Don't save if already saved
      const msgId = `${msg.type}-${content.substring(0, 50)}`
      if (savedMessagesRef.current.has(msgId)) return false
      savedMessagesRef.current.add(msgId)
      return true
    })

    if (messagesToSave.length === 0) return

    try {
      await fetch(getApiUrl('/user/transcripts/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          messages: messagesToSave.map(msg => ({
            role: msg.type === 'user_message' ? 'user' : 'assistant',
            content: (msg as any).message?.content || '',
            timestamp: new Date().toISOString(),
            source: 'voice'
          }))
        })
      })
      console.log(`💾 Saved ${messagesToSave.length} transcript messages`)
    } catch (err) {
      console.error('Failed to save transcripts:', err)
    }
  }, [userId, messages])

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      // Save transcripts before disconnecting
      await saveTranscripts()
      savedMessagesRef.current.clear()
      await disconnect()
    } else if (!isConnecting) {
      // Only connect if not already connecting
      try {
        // Build session settings with variables for system prompt
        const variables: Record<string, string> = {}
        if (userContext?.name) variables.first_name = userContext.name
        if (userContext?.current_country) variables.current_country = userContext.current_country
        if (userContext?.destination_countries?.length) {
          variables.destination_countries = userContext.destination_countries.join(', ')
        }
        if (userContext?.nationality) variables.nationality = userContext.nationality
        if (userContext?.timeline) variables.timeline = userContext.timeline

        console.log('🎙️ Connecting to Hume with variables:', variables)

        // Pass auth, configId, and sessionSettings to connect()
        const connectOptions: any = {
          auth: { type: 'accessToken', value: accessToken },
          configId,
        }

        if (Object.keys(variables).length > 0) {
          connectOptions.sessionSettings = {
            type: 'session_settings',
            variables,
            customSessionId: userId || undefined,
          }
        }

        await connect(connectOptions)
      } catch (err) {
        console.error('Failed to connect:', err)
      }
    }
  }, [isConnected, isConnecting, connect, disconnect, accessToken, configId, userId, userContext, saveTranscripts])

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
        {isConnecting && 'Connecting...'}
        {isConnected && (isMuted ? 'Muted' : 'Listening...')}
        {readyState === VoiceReadyState.IDLE && 'Click to start'}
        {readyState === VoiceReadyState.CLOSED && 'Disconnected'}
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
  // Handle tool calls from Hume - bridges WebSocket to our REST APIs
  const onToolCall = useCallback(
    async (toolCall: any, send: any) => {
      return handleToolCall(toolCall, send, props.userId)
    },
    [props.userId]
  )

  return (
    <VoiceProvider onToolCall={onToolCall}>
      <VoiceControls {...props} />
    </VoiceProvider>
  )
}
