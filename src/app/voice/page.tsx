'use client'

import { useUser } from '@stackframe/stack'
import { VoiceWidget } from '@/components/VoiceWidget'
import { GlobalHeader } from '@/components/GlobalHeader'

export default function VoicePage() {
  const user = useUser()
  const userId = user?.id || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex flex-col">
      <GlobalHeader />

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Voice Assistant
          </h1>
          <p className="text-gray-400 mb-8">
            Talk to Quest about your relocation plans
          </p>

          {user && (
            <p className="text-gray-500 text-sm mb-4">
              Signed in as {user.displayName || user.primaryEmail}
            </p>
          )}

          <div className="bg-black/30 border border-white/10 rounded-2xl p-8">
            <VoiceWidget userId={userId} />
          </div>

          {!user && (
            <p className="mt-6 text-gray-500 text-sm">
              <a href="/handler/sign-in" className="text-purple-400 hover:text-purple-300">
                Sign in
              </a>
              {' '}for a personalized experience
            </p>
          )}
        </div>
      </main>

      <footer className="border-t border-white/10 bg-black/20 py-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Relocation Quest
      </footer>
    </div>
  )
}
