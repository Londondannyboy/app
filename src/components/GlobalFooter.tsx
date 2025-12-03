'use client'

import Link from 'next/link'

export function GlobalFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
              Relocation Quest
            </h3>
            <p className="text-sm text-gray-400">
              Your AI-powered relocation assistant
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/voice" className="text-sm text-gray-400 hover:text-white transition">
                  Voice Assistant
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-sm text-gray-400 hover:text-white transition">
                  Chat
                </Link>
              </li>
              <li>
                <Link href="/articles" className="text-sm text-gray-400 hover:text-white transition">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-400 hover:text-white transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Connect</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://twitter.com/relocationquest" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition">
                  Twitter
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/company/relocationquest" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="mailto:hello@relocation.quest" className="text-sm text-gray-400 hover:text-white transition">
                  Email Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Relocation Quest. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-2 md:mt-0">
            Powered by AI • Built with ❤️
          </p>
        </div>
      </div>
    </footer>
  )
}
