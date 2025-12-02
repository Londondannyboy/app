'use client'

import { useUser, UserButton } from '@stackframe/stack'
import { VoiceWidget } from '@/components/VoiceWidget'
import { UserFactsPanel } from '@/components/UserFactsPanel'

export default function VoicePage() {
  const user = useUser()
  const userId = user?.id || null

  return (
    <main className="flex min-h-screen">
      {/* Header with auth */}
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <a href="/" className="text-gray-400 hover:text-white transition">← Home</a>
        <a href="/chat" className="text-gray-400 hover:text-white transition">Chat</a>
        <a href="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</a>
        {user ? (
          <UserButton />
        ) : (
          <a
            href="/handler/sign-in"
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
          >
            Sign In
          </a>
        )}
      </div>

      {/* Main voice interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-8">Voice Assistant</h1>
        {user && (
          <p className="text-gray-400 mb-4">Logged in as {user.displayName || user.primaryEmail}</p>
        )}
        <VoiceWidget userId={userId} />
      </div>

      {/* Facts sidebar */}
      <aside className="w-80 bg-black/20 border-l border-white/10 p-4">
        <UserFactsPanel userId={userId} />
      </aside>
    </main>
  )
}
