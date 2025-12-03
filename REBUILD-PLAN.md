# Fresh Rebuild Plan: Delete Old Code & Build Clean

## 🗑️ What's Broken (Delete & Rebuild Fresh):

### 1. ❌ Articles Section (`src/components/dashboard/ArticlesSection.tsx`)
**Problem**: References `process.env.NEXT_PUBLIC_GATEWAY_URL` (external API that doesn't exist)
**Lines to delete**: 38, 73, 113 (all external API calls)
**Rebuild**:
- Fetch from `/api/articles/recommended` (new route)
- Filter by user's `destination_countries` from database
- Simple REST API, no SSE complexity

### 2. ❌ Transcript Section (`src/components/dashboard/TranscriptSection.tsx`)
**Problem**: References `process.env.NEXT_PUBLIC_GATEWAY_URL` (external API that doesn't exist)
**Lines to delete**: 73 (fetch from external gateway)
**Rebuild**:
- Store transcripts in database (new `transcripts` table or `users.transcripts` JSONB)
- Fetch from `/api/user/transcripts` (new route)
- Voice route adds transcript messages after responses

### 3. ❌ Any other references to `NEXT_PUBLIC_GATEWAY_URL`
**Action**: Search and delete all references

---

## ✅ Fresh Implementation Plan:

### Step 1: Create Transcripts Storage

**New DB column** (use existing `users` table):
```sql
ALTER TABLE users ADD COLUMN transcripts JSONB DEFAULT '[]'::jsonb;
```

**Schema**:
```typescript
interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  source: 'voice' | 'chat'
}
```

**Add to Neon client** (`src/lib/api-clients/neon.ts`):
```typescript
export async function addTranscript(
  neonAuthId: string,
  message: TranscriptMessage
): Promise<void> {
  const sql = getSql()
  await sql`
    UPDATE users
    SET
      transcripts = transcripts || ${JSON.stringify(message)}::jsonb,
      updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `
}

export async function getTranscripts(
  neonAuthId: string,
  limit: number = 50
): Promise<TranscriptMessage[]> {
  const sql = getSql()
  const users = await sql`
    SELECT transcripts FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as Array<{ transcripts: TranscriptMessage[] }>

  const allTranscripts = users.length > 0 ? (users[0].transcripts || []) : []
  return allTranscripts.slice(-limit) // Return last N messages
}
```

### Step 2: Add Transcript Storage to Voice Route

**In** `src/app/api/voice/chat/completions/route.ts`:

After line 110 (after storing to SuperMemory), add:
```typescript
// Store transcript
addTranscript(userId, {
  id: `${Date.now()}-user`,
  role: 'user',
  content: userMessage,
  timestamp: new Date().toISOString(),
  source: 'voice'
}).catch(err => console.error('Transcript store error (user):', err))

addTranscript(userId, {
  id: `${Date.now()}-assistant`,
  role: 'assistant',
  content: response,
  timestamp: new Date().toISOString(),
  source: 'voice'
}).catch(err => console.error('Transcript store error (assistant):', err))
```

### Step 3: Create Transcript API Route

**New file**: `src/app/api/user/transcripts/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTranscripts } from '@/lib/api-clients'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const transcripts = await getTranscripts(userId, limit)

    return NextResponse.json({
      success: true,
      messages: transcripts
    })
  } catch (error) {
    console.error('Error fetching transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    )
  }
}
```

### Step 4: Rebuild Transcript Section (Fresh & Clean)

**Replace entire file** `src/components/dashboard/TranscriptSection.tsx`:
```typescript
'use client'

import { useState, useEffect, useRef } from 'react'

interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  source: 'voice' | 'chat'
}

interface TranscriptSectionProps {
  userId: string | null
}

export function TranscriptSection({ userId }: TranscriptSectionProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'voice' | 'chat'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch transcripts
  useEffect(() => {
    if (!userId) return

    const fetchTranscripts = async () => {
      try {
        const res = await fetch(`/api/user/transcripts?limit=50`, {
          headers: { 'X-User-Id': userId }
        })
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Failed to fetch transcripts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTranscripts()

    // Poll every 10 seconds for new messages
    const interval = setInterval(fetchTranscripts, 10000)
    return () => clearInterval(interval)
  }, [userId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [messages.length])

  const filteredMessages = messages.filter(m =>
    filter === 'all' || m.source === filter
  )

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view transcript</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h2 className="font-semibold">Conversation History</h2>
        </div>
        <div className="flex gap-1">
          {['all', 'voice', 'chat'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-400 animate-pulse">Loading...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-xs mt-2">Start a conversation to see transcripts</p>
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-purple-500/10 border border-purple-500/20 ml-8'
                  : 'bg-white/5 border border-white/10 mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.source === 'voice' && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                    🎙️ voice
                  </span>
                )}
              </div>
              <p className="text-sm text-white/90">{msg.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-500">
        {filteredMessages.length} messages
      </div>
    </div>
  )
}
```

### Step 5: Create Article Recommendations API

**New file**: `src/app/api/articles/recommended/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, searchArticles } from '@/lib/api-clients'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get user's destination countries
    const user = await getOrCreateUser(userId)
    const destinations = user.destination_countries || []

    if (destinations.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        message: 'No destination preferences set'
      })
    }

    // Search articles for each destination
    const allArticles = []
    for (const destination of destinations.slice(0, 3)) { // Limit to 3 countries
      const results = await searchArticles(destination, 'relocation', 5)
      allArticles.push(...results)
    }

    // Dedupe and limit to 10
    const uniqueArticles = Array.from(
      new Map(allArticles.map(a => [a.slug, a])).values()
    ).slice(0, 10)

    return NextResponse.json({
      success: true,
      articles: uniqueArticles,
      destinations
    })
  } catch (error) {
    console.error('Error fetching recommended articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
```

### Step 6: Rebuild Articles Section (Fresh & Clean)

**Replace entire file** `src/components/dashboard/ArticlesSection.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: number
  title: string
  slug: string
  type: 'country_guide' | 'article' | 'deal' | 'job'
  excerpt?: string
  country_code?: string
}

interface ArticlesSectionProps {
  userId: string | null
}

const TYPE_STYLES: Record<string, { icon: string; color: string }> = {
  country_guide: { icon: '🌍', color: 'purple' },
  article: { icon: '📰', color: 'blue' },
  deal: { icon: '🎫', color: 'green' },
  job: { icon: '💼', color: 'orange' },
}

export function ArticlesSection({ userId }: ArticlesSectionProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [destinations, setDestinations] = useState<string[]>([])

  // Fetch recommended articles
  useEffect(() => {
    if (!userId) return

    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles/recommended', {
          headers: { 'X-User-Id': userId }
        })
        if (res.ok) {
          const data = await res.json()
          setArticles(data.articles || [])
          setDestinations(data.destinations || [])
        }
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [userId])

  if (!userId) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
        <p className="text-gray-400">Sign in to view recommendations</p>
      </div>
    )
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <h2 className="font-semibold">Recommended for You</h2>
        </div>
        {destinations.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Based on: {destinations.join(', ')}
          </p>
        )}
      </div>

      {/* Articles */}
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-4 animate-pulse">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p>No recommendations yet</p>
            <p className="text-xs mt-2">Tell us where you want to move!</p>
          </div>
        ) : (
          articles.map(article => {
            const style = TYPE_STYLES[article.type] || TYPE_STYLES.article
            return (
              <a
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="block p-3 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-purple-400 transition truncate">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded bg-${style.color}-500/20 text-${style.color}-400`}>
                        {article.type.replace('_', ' ')}
                      </span>
                      {article.country_code && (
                        <span className="text-xs text-gray-500">
                          {article.country_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-500">
        {articles.length} articles
      </div>
    </div>
  )
}
```

---

## 🗑️ Code Cleanup (Delete Old Code):

1. Search for all references to `NEXT_PUBLIC_GATEWAY_URL` and delete
2. Remove unused SSE hooks if they only connect to external gateway
3. Delete any "FastAPI gateway" references in comments/docs

---

## ✅ Summary:

- ✅ **Transcripts**: Store in database, fetch from `/api/user/transcripts`, display in clean component
- ✅ **Articles**: Fetch from `/api/articles/recommended` based on user's destinations
- ✅ **No external dependencies**: Everything uses Next.js API + Neon database
- ✅ **Simple & clean**: No SSE complexity, just REST API polling
- ✅ **Delete old broken code**: Remove all `NEXT_PUBLIC_GATEWAY_URL` references

This is a **complete fresh rebuild** - delete the old broken code and start clean!
