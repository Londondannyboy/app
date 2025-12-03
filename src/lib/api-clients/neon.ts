import { neon } from '@neondatabase/serverless'
import type { User, UserFact, PendingConfirmation, Article } from '@/lib/types'

// Lazy initialization - only create connection when actually used
let _sql: ReturnType<typeof neon> | null = null
function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _sql = neon(process.env.DATABASE_URL, { fullResults: false })
  }
  return _sql
}

/**
 * Get or create user by neon_auth_id (Stack Auth user ID)
 * Returns the full user record
 */
export async function getOrCreateUser(neonAuthId: string): Promise<User> {
  const sql = getSql()

  // Try to find existing user
  const existing = await sql`
    SELECT * FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as User[]

  if (existing.length > 0) {
    return existing[0]
  }

  // Create new user (will be synced from neon_auth.users_sync via trigger)
  // But if trigger didn't fire, manually create
  const created = await sql`
    INSERT INTO users (neon_auth_id, email, name, created_at, updated_at)
    SELECT id, email, name, created_at, NOW()
    FROM neon_auth.users_sync
    WHERE id = ${neonAuthId}
    RETURNING *
  ` as User[]

  return created[0]
}

/**
 * Get user by neon_auth_id
 */
export async function getUser(neonAuthId: string): Promise<User | null> {
  const sql = getSql()
  const users = await sql`
    SELECT * FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as User[]

  return users.length > 0 ? users[0] : null
}

/**
 * Update user profile fields
 */
export async function updateUserProfile(
  neonAuthId: string,
  updates: {
    first_name?: string
    last_name?: string
    current_country?: string
    destination_countries?: string[]
    nationality?: string
    budget_monthly?: number
    timeline?: string
    relocation_motivation?: string[]
  }
): Promise<void> {
  const sql = getSql()

  const setClauses: string[] = []
  const values: any[] = []

  if (updates.first_name !== undefined) {
    setClauses.push(`first_name = $${values.length + 1}`)
    values.push(updates.first_name)
  }
  if (updates.last_name !== undefined) {
    setClauses.push(`last_name = $${values.length + 1}`)
    values.push(updates.last_name)
  }
  if (updates.current_country !== undefined) {
    setClauses.push(`current_country = $${values.length + 1}`)
    values.push(updates.current_country)
  }
  if (updates.destination_countries !== undefined) {
    setClauses.push(`destination_countries = $${values.length + 1}`)
    values.push(updates.destination_countries)
  }
  if (updates.nationality !== undefined) {
    setClauses.push(`nationality = $${values.length + 1}`)
    values.push(updates.nationality)
  }
  if (updates.budget_monthly !== undefined) {
    setClauses.push(`budget_monthly = $${values.length + 1}`)
    values.push(updates.budget_monthly)
  }
  if (updates.timeline !== undefined) {
    setClauses.push(`timeline = $${values.length + 1}`)
    values.push(updates.timeline)
  }
  if (updates.relocation_motivation !== undefined) {
    setClauses.push(`relocation_motivation = $${values.length + 1}`)
    values.push(updates.relocation_motivation)
  }

  if (setClauses.length === 0) return

  values.push(neonAuthId)

  await sql`
    UPDATE users
    SET ${sql.unsafe(setClauses.join(', '))}, updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `
}

/**
 * Add a fact to user's facts array
 */
export async function addUserFact(
  neonAuthId: string,
  fact: Omit<UserFact, 'extracted_at'>
): Promise<void> {
  const sql = getSql()

  const factWithTime = {
    ...fact,
    extracted_at: new Date().toISOString()
  }

  await sql`
    UPDATE users
    SET
      facts = facts || ${JSON.stringify(factWithTime)}::jsonb,
      updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `
}

/**
 * Get user's facts
 */
export async function getUserFacts(neonAuthId: string): Promise<UserFact[]> {
  const sql = getSql()
  const users = await sql`
    SELECT facts FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as Array<{ facts: UserFact[] }>

  return users.length > 0 ? (users[0].facts || []) : []
}

/**
 * Add a pending confirmation to user's pending_confirmations array
 */
export async function addPendingConfirmation(
  neonAuthId: string,
  confirmation: Omit<PendingConfirmation, 'id' | 'created_at'>
): Promise<void> {
  const sql = getSql()

  const confirmationWithMeta = {
    ...confirmation,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  }

  await sql`
    UPDATE users
    SET
      pending_confirmations = pending_confirmations || ${JSON.stringify(confirmationWithMeta)}::jsonb,
      updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `
}

/**
 * Get user's pending confirmations
 */
export async function getPendingConfirmations(neonAuthId: string): Promise<PendingConfirmation[]> {
  const sql = getSql()
  const users = await sql`
    SELECT pending_confirmations FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as Array<{ pending_confirmations: PendingConfirmation[] }>

  return users.length > 0 ? (users[0].pending_confirmations || []) : []
}

/**
 * Approve a pending confirmation - moves it to facts and removes from pending
 */
export async function approveConfirmation(
  neonAuthId: string,
  confirmationId: string
): Promise<void> {
  const sql = getSql()

  // Get the user
  const user = await getUser(neonAuthId)
  if (!user) return

  // Find the confirmation
  const confirmation = user.pending_confirmations.find(c => c.id === confirmationId)
  if (!confirmation) return

  // Add as fact
  await addUserFact(neonAuthId, {
    fact_type: confirmation.fact_type,
    fact_value: confirmation.new_value,
    source: 'user_edit',
    confidence: 1.0
  })

  // Remove from pending
  const updatedPending = user.pending_confirmations.filter(c => c.id !== confirmationId)
  await sql`
    UPDATE users
    SET pending_confirmations = ${JSON.stringify(updatedPending)}::jsonb, updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `
}

/**
 * Reject a pending confirmation - just removes it
 */
export async function rejectConfirmation(
  neonAuthId: string,
  confirmationId: string
): Promise<void> {
  const sql = getSql()

  const user = await getUser(neonAuthId)
  if (!user) return

  const updatedPending = user.pending_confirmations.filter(c => c.id !== confirmationId)
  await sql`
    UPDATE users
    SET pending_confirmations = ${JSON.stringify(updatedPending)}::jsonb, updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `
}

/**
 * Search articles by keywords (for context)
 * Filters by app to only return relevant articles
 */
export async function searchArticles(
  query: string,
  appFilter: 'relocation' | 'placement' = 'relocation',
  limit: number = 5
): Promise<Article[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT
      id, title, slug, excerpt, content, country, country_code,
      article_mode, featured_asset_url, hero_asset_url,
      video_playback_id, published_at, payload, video_narrative,
      app, status
    FROM articles
    WHERE status = 'published'
    AND app = ${appFilter}
    AND (
      title ILIKE ${'%' + query + '%'}
      OR excerpt ILIKE ${'%' + query + '%'}
      OR content ILIKE ${'%' + query + '%'}
      OR country_code ILIKE ${'%' + query + '%'}
    )
    ORDER BY published_at DESC
    LIMIT ${limit}
  ` as Article[]

  return rows
}

/**
 * Get articles by country (for context)
 */
export async function getArticlesByCountry(
  country: string,
  appFilter: 'relocation' | 'placement' = 'relocation',
  limit: number = 10
): Promise<Article[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT
      id, title, slug, excerpt, country, country_name,
      flag_emoji, article_mode, featured_asset_url,
      published_at
    FROM articles
    WHERE status = 'published'
    AND app = ${appFilter}
    AND country ILIKE ${country}
    ORDER BY published_at DESC
    LIMIT ${limit}
  ` as Article[]

  return rows
}

/**
 * Add a transcript message to user's transcripts array
 */
export async function addTranscript(
  neonAuthId: string,
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    source: 'voice' | 'chat'
  }
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

/**
 * Get user's transcript messages
 */
export async function getTranscripts(
  neonAuthId: string,
  limit: number = 50
): Promise<Array<{
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  source: 'voice' | 'chat'
}>> {
  const sql = getSql()
  const users = await sql`
    SELECT transcripts FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as Array<{ transcripts: any[] }>

  const allTranscripts = users.length > 0 ? (users[0].transcripts || []) : []
  return allTranscripts.slice(-limit) // Return last N messages
}

/**
 * Sync profile fields from facts array
 * Extracts values from facts and updates profile columns
 */
export async function syncProfileFieldsFromFacts(neonAuthId: string): Promise<void> {
  const sql = getSql()

  // Get user's facts
  const users = await sql`
    SELECT facts FROM users WHERE neon_auth_id = ${neonAuthId}
  ` as Array<{ facts: UserFact[] }>

  if (users.length === 0) return

  const facts = users[0].facts || []

  // Extract profile data from facts
  const destinationFacts = facts.filter(f => f.fact_type === 'destination')
  const destinations = destinationFacts.map(f => f.fact_value)

  const originFact = facts.find(f => f.fact_type === 'origin')
  const nationalityFact = facts.find(f => f.fact_type === 'nationality')
  const timelineFact = facts.find(f => f.fact_type === 'timeline')

  // Update profile fields
  await sql`
    UPDATE users
    SET
      destination_countries = CASE
        WHEN ${destinations.length > 0}::boolean THEN ${destinations}
        ELSE destination_countries
      END,
      current_country = CASE
        WHEN ${!!originFact}::boolean THEN ${originFact?.fact_value}
        ELSE current_country
      END,
      nationality = CASE
        WHEN ${!!nationalityFact}::boolean THEN ${nationalityFact?.fact_value}
        ELSE nationality
      END,
      timeline = CASE
        WHEN ${!!timelineFact}::boolean THEN ${timelineFact?.fact_value}
        ELSE timeline
      END,
      updated_at = NOW()
    WHERE neon_auth_id = ${neonAuthId}
  `

  console.log(`✅ Synced profile fields from ${facts.length} facts`)
}
