'use client'

import { useChat } from '@ai-sdk/react'
import { C1Component, ThemeProvider } from '@thesysai/genui-sdk'
import { useState } from 'react'
import '@crayonai/react-ui/styles/index.css'

export default function TestC1Page() {
  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  })

  const handleC1Action = ({ llmFriendlyMessage, humanFriendlyMessage }: any) => {
    console.log('C1 Action:', { llmFriendlyMessage, humanFriendlyMessage })
    // Handle actions from generated UI
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <h1 className="text-2xl font-bold text-white">TheSys C1 Test (Correct Pattern)</h1>
          <p className="text-gray-400 text-sm mt-1">
            Using useChat + C1Component + Vercel AI SDK
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">
                  Try asking: "Show me articles about Cyprus" or "Find tech jobs in Portugal"
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-purple-500/20 ml-12'
                    : 'bg-gray-800 mr-12'
                }`}
              >
                {message.role === 'user' ? (
                  <div className="text-white">{message.content}</div>
                ) : (
                  <C1Component
                    isStreaming={isLoading}
                    c1Response={message.content}
                    onAction={handleC1Action}
                  />
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="bg-gray-800 mr-12 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask about relocating, jobs, or countries..."
                className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-white disabled:opacity-50 hover:opacity-90 transition"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ThemeProvider>
  )
}
