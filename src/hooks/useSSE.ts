'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface UseSSEOptions {
  userId: string | null
  onEvent?: (eventType: string, data: unknown) => void
  events?: string[]
  maxRetries?: number
  retryDelay?: number
}

interface SSEState {
  connected: boolean
  reconnecting: boolean
  retryCount: number
}

export function useSSE({
  userId,
  onEvent,
  events = [],
  maxRetries = 5,
  retryDelay = 3000,
}: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [state, setState] = useState<SSEState>({
    connected: false,
    reconnecting: false,
    retryCount: 0,
  })

  const connect = useCallback(() => {
    if (!userId) return

    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL
    if (!gatewayUrl) {
      console.warn('NEXT_PUBLIC_GATEWAY_URL not set')
      return
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `${gatewayUrl}/dashboard/events?user_id=${userId}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[SSE] Connected')
      retryCountRef.current = 0
      setState({ connected: true, reconnecting: false, retryCount: 0 })
    }

    eventSource.onerror = (error) => {
      console.warn('[SSE] Connection error:', error)
      setState(prev => ({ ...prev, connected: false }))

      // Close the errored connection
      eventSource.close()
      eventSourceRef.current = null

      // Attempt reconnection
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        setState(prev => ({
          ...prev,
          reconnecting: true,
          retryCount: retryCountRef.current,
        }))

        console.log(`[SSE] Reconnecting in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`)

        retryTimeoutRef.current = setTimeout(() => {
          connect()
        }, retryDelay * retryCountRef.current) // Exponential backoff
      } else {
        console.error('[SSE] Max retries reached, giving up')
        setState(prev => ({ ...prev, reconnecting: false }))
      }
    }

    // Add heartbeat listener to keep connection alive
    eventSource.addEventListener('heartbeat', () => {
      // Connection is alive
    })

    // Add custom event listeners
    events.forEach(eventType => {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          onEvent?.(eventType, data)
        } catch (err) {
          console.warn(`[SSE] Failed to parse ${eventType} event:`, err)
        }
      })
    })
  }, [userId, events, onEvent, maxRetries, retryDelay])

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setState({ connected: false, reconnecting: false, retryCount: 0 })
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    ...state,
    reconnect: connect,
    disconnect,
  }
}
