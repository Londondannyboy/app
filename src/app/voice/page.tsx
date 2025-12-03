'use client'

import { useUser, UserButton } from '@stackframe/stack'
import { VoiceWidget } from '@/components/VoiceWidget'
import { UserFactsPanel } from '@/components/UserFactsPanel'
import { ArticlesPanel } from '@/components/ArticlesPanel'
import { ZepGraphPanel } from '@/components/ZepGraphPanel'
import { LiveActivityPanel } from '@/components/LiveActivityPanel'
import { HITLConfirmations } from '@/components/HITLConfirmations'

export default function VoicePage() {
  const user = useUser()
  const userId = user?.id || null

  return (
    <main className="flex min-h-screen">
      {/* Header with auth */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
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

      {/* HITL Floating Confirmations */}
      <HITLConfirmations />

      {/* Sidebar with facts, graph, and articles */}
      <aside className="w-96 bg-black/20 border-l border-white/10 p-4 overflow-y-auto max-h-screen">
        {/* Live Activity Panel - Shows HITL confirmations and agent actions */}
        <div className="mb-6">
          <LiveActivityPanel
            userId={userId}
            onConfirmChange={async (changeId, confirmed) => {
              // Send confirmation to backend
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/dashboard/profile/confirm-change`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ change_id: changeId, confirmed, user_id: userId })
                })
                if (!res.ok) console.error('Failed to confirm change')
              } catch (e) {
                console.error('Error confirming change:', e)
              }
            }}
          />
        </div>

        {/* User Facts */}
        <div className="mb-6">
          <UserFactsPanel userId={userId} />
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-6" />

        {/* ZEP Knowledge Graph */}
        <div className="mb-6">
          <ZepGraphPanel userId={userId} />
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-6" />

        {/* Articles */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Articles</h2>
          <ArticlesPanel userId={userId} />
        </div>
      </aside>
    </main>
  )
}
