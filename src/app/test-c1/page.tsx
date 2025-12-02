'use client'

import { C1Chat } from '@thesysai/genui-sdk'

export default function TestC1Page() {
  // Custom message processor for debugging
  const handleProcessMessage = async ({
    threadId,
    messages,
    responseId,
    abortController,
  }: {
    threadId: string
    messages: { id: string; role: 'user' | 'assistant'; content: string }[]
    responseId: string
    abortController: AbortController
  }) => {
    console.log('Processing message:', { threadId, messages, responseId })

    try {
      const response = await fetch('/api/c1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': 'relocation',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          threadId,
        }),
        signal: abortController.signal,
      })

      console.log('API Response:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`API error: ${response.status}`)
      }

      return response
    } catch (error) {
      console.error('Process message error:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">
          TheSys C1 Test Page (Debug Mode)
        </h1>
        <p className="text-gray-400 mb-8">
          Isolated test with custom message processor. Check console (F12) for debug logs.
        </p>

        <div className="h-[600px] bg-black rounded-lg overflow-hidden">
          <C1Chat
            processMessage={handleProcessMessage}
            agentName="Quest Test"
            formFactor="full-page"
            theme={{
              mode: 'dark' as const,
            }}
            onAction={(action) => {
              console.log('Action:', action)
            }}
          />
        </div>

        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-white font-semibold mb-2">Debug Info:</h2>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>✓ C1Chat component loaded</li>
            <li>✓ API endpoint: /api/c1/chat</li>
            <li>✓ Model: c1/anthropic/claude-sonnet-4/v-20250815</li>
            <li>✓ Check browser console for errors (F12)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
