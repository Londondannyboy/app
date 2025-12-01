'use client'

import { VoiceWidget } from '@/components/VoiceWidget'
import { UserFactsPanel } from '@/components/UserFactsPanel'
import { useState } from 'react'

export default function VoicePage() {
  const [userId] = useState<string | null>(null) // Will come from auth

  return (
    <main className="flex min-h-screen">
      {/* Main voice interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-8">Voice Assistant</h1>
        <VoiceWidget userId={userId} />
      </div>

      {/* Facts sidebar */}
      <aside className="w-80 bg-black/20 border-l border-white/10 p-4">
        <UserFactsPanel userId={userId} />
      </aside>
    </main>
  )
}
