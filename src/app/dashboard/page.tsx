'use client'

import { useUser, UserButton } from '@stackframe/stack'
import { useState, useEffect } from 'react'
import { ProfileSection } from '@/components/dashboard/ProfileSection'
import { RepoSection } from '@/components/dashboard/RepoSection'
import { TranscriptSection } from '@/components/dashboard/TranscriptSection'
import { SummarySection } from '@/components/dashboard/SummarySection'
import { ArticlesSection } from '@/components/dashboard/ArticlesSection'

export default function DashboardPage() {
  const user = useUser({ or: 'redirect' })
  const userId = user?.id || null

  // Active tab for mobile view
  const [activeTab, setActiveTab] = useState<'profile' | 'repo' | 'transcript' | 'summary' | 'articles'>('profile')

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Quest
            </a>
            <nav className="hidden md:flex items-center gap-4 ml-8">
              <a href="/chat" className="text-gray-400 hover:text-white transition">Chat</a>
              <a href="/voice" className="text-gray-400 hover:text-white transition">Voice</a>
              <span className="text-white font-medium">Dashboard</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden md:block">
              {user?.displayName || user?.primaryEmail}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-white/10 overflow-x-auto">
        {(['profile', 'repo', 'transcript', 'summary', 'articles'] as const).map(tab => (
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

          {/* Right Column - Articles */}
          <div className="col-span-3">
            <ArticlesSection userId={userId} />
          </div>
        </div>

        {/* Mobile: Single tab view */}
        <div className="md:hidden">
          {activeTab === 'profile' && <ProfileSection userId={userId} />}
          {activeTab === 'repo' && <RepoSection userId={userId} />}
          {activeTab === 'transcript' && <TranscriptSection userId={userId} />}
          {activeTab === 'summary' && <SummarySection userId={userId} />}
          {activeTab === 'articles' && <ArticlesSection userId={userId} />}
        </div>
      </div>
    </main>
  )
}
