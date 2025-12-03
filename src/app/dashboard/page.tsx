'use client'

import { useUser } from '@stackframe/stack'
import { useState } from 'react'
import { ProfileSection } from '@/components/dashboard/ProfileSection'
import { RepoSection } from '@/components/dashboard/RepoSection'
import { TranscriptSection } from '@/components/dashboard/TranscriptSection'
import { SummarySection } from '@/components/dashboard/SummarySection'
import { ArticlesSection } from '@/components/dashboard/ArticlesSection'
import { ZepGraphPanel } from '@/components/ZepGraphPanel'
import { HITLConfirmations } from '@/components/HITLConfirmations'
import { GlobalHeader } from '@/components/GlobalHeader'
import { GlobalFooter } from '@/components/GlobalFooter'
import { DebugPanel } from '@/components/DebugPanel'

export default function DashboardPage() {
  const user = useUser({ or: 'redirect' })
  const userId = user?.id || null

  // Active tab for mobile view
  const [activeTab, setActiveTab] = useState<'profile' | 'repo' | 'graph' | 'transcript' | 'summary' | 'articles'>('profile')

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <GlobalHeader />
      <HITLConfirmations userId={userId} />

      <main className="flex-1">

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-white/10 overflow-x-auto">
        {(['profile', 'repo', 'graph', 'transcript', 'summary', 'articles'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-4">
          {/* Left Column - Profile & Repo */}
          <div className="col-span-4 space-y-4">
            <ProfileSection userId={userId} />
            <RepoSection userId={userId} />
          </div>

          {/* Center Column - Chat/Transcript & Summary */}
          <div className="col-span-5 space-y-4">
            <TranscriptSection userId={userId} />
            <SummarySection userId={userId} />
          </div>

          {/* Right Column - Graph & Articles */}
          <div className="col-span-3 space-y-4">
            {/* Knowledge Graph */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <ZepGraphPanel userId={userId} />
            </div>
            <ArticlesSection userId={userId} />
          </div>
        </div>

        {/* Mobile: Single tab view */}
        <div className="md:hidden">
          {activeTab === 'profile' && <ProfileSection userId={userId} />}
          {activeTab === 'repo' && <RepoSection userId={userId} />}
          {activeTab === 'graph' && (
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <ZepGraphPanel userId={userId} />
            </div>
          )}
          {activeTab === 'transcript' && <TranscriptSection userId={userId} />}
          {activeTab === 'summary' && <SummarySection userId={userId} />}
          {activeTab === 'articles' && <ArticlesSection userId={userId} />}
        </div>
      </div>
    </main>

    <DebugPanel userId={userId} show={true} />
    <GlobalFooter />
  </div>
  )
}
