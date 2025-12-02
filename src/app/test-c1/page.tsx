'use client'

import { C1Chat } from '@thesysai/genui-sdk'

export default function TestC1Page() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">
          TheSys C1 Test Page
        </h1>
        <p className="text-gray-400 mb-8">
          Isolated test of C1Chat component. Try asking: "Show me articles about Cyprus"
        </p>

        <div className="h-[600px] bg-black rounded-lg overflow-hidden">
          <C1Chat
            apiUrl="/api/c1/chat"
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
