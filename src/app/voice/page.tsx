'use client'

import { useUser, UserButton } from '@stackframe/stack'
import { VoiceWidget } from '@/components/VoiceWidget'
import { RepoSection } from '@/components/dashboard/RepoSection'
import { ArticlesSection } from '@/components/dashboard/ArticlesSection'
import { TranscriptSection } from '@/components/dashboard/TranscriptSection'

export default function VoicePage() {
  const user = useUser()
  const userId = user?.id || null

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header with auth */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
        <a href="/" className="text-gray-400 hover:text-white transition">Home</a>
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
        <div className="max-w-2xl w-full">
          <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Relocation Assistant
          </h1>
          <p className="text-gray-400 mb-8 text-center">
            Talk to your AI assistant about relocating
          </p>

          {user && (
            <p className="text-gray-500 text-sm mb-4 text-center">
              Welcome, {user.displayName || user.primaryEmail}
            </p>
          )}

          <VoiceWidget userId={userId} />

          {/* Transcripts below voice widget */}
          {user && (
            <div className="mt-8">
              <TranscriptSection userId={userId} />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar with facts and articles */}
      <aside className="w-96 bg-black/30 border-l border-white/10 p-4 overflow-y-auto max-h-screen">
        {user ? (
          <div className="space-y-6">
            {/* User Facts / Repo */}
            <RepoSection userId={userId} />

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Recommended Articles */}
            <ArticlesSection userId={userId} />
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-4">Sign in to see your personalized content</p>
            <a
              href="/handler/sign-in"
              className="inline-block px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition"
            >
              Sign In
            </a>
          </div>
        )}
      </aside>
    </main>
  )
}
