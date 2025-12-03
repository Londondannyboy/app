'use client'

import { useUser, UserButton } from '@stackframe/stack'
import Link from 'next/link'

export function GlobalHeader() {
  const user = useUser()

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Relocation Quest
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/voice" className="text-gray-400 hover:text-white transition text-sm">
              Voice Assistant
            </Link>
            <Link href="/chat" className="text-gray-400 hover:text-white transition text-sm">
              Chat
            </Link>
            {user && (
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">
                Dashboard
              </Link>
            )}
            <Link href="/articles" className="text-gray-400 hover:text-white transition text-sm">
              Articles
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-400 hidden md:block">
                {user.displayName || user.primaryEmail}
              </span>
              <UserButton />
            </>
          ) : (
            <Link
              href="/handler/sign-in"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition text-sm font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
