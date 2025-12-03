import { neon } from '@neondatabase/serverless'
import type { UserProfile, UserFact, Article } from '@/lib/types'

// Lazy initialization - only create connection when actually used
let _sql: ReturnType<typeof neon> | null = null
function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    // Configure to return arrays directly instead of FullQueryResults
    _sql = neon(process.env.DATABASE_URL, { fullResults: false })
  }
  return _sql
}

/**
 * Get or create user profile by Stack Auth user ID
 */
export async function getOrCreateProfile(stackUserId: string): Promise<number> {
  const sql = getSql()
  // Try to find existing profile
  const existing = await sql`
    SELECT id FROM user_profiles
    WHERE stack_user_id = ${stackUserId}
  ` as Array<{ id: number }>

  if (existing.length > 0) {
    return existing[0].id
  }

  // Create new profile
  const result = await sql`
    INSERT INTO user_profiles (stack_user_id, created_at, updated_at)
    VALUES (${stackUserId}, NOW(), NOW())
    RETURNING id
  ` as Array<{ id: number }>

  return result[0].id
}

/**
 * Get all active facts for a user (their "repo")
 */
export async function getUserFacts(userId: string): Promise<UserFact[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT
      f.id, f.user_profile_id, f.fact_type, f.fact_value,
      f.source, f.confidence, f.is_user_verified, f.is_active,
      f.created_at, f.updated_at
    FROM user_profile_facts f
    JOIN user_profiles p ON p.id = f.user_profile_id
    WHERE p.user_id = ${userId}
    AND f.is_active = true
    ORDER BY f.updated_at DESC
  ` as UserFact[]

  return rows
}

/**
 * Store a new fact from voice conversation
 */
export async function storeFact(
  profileId: string,
  factType: string,
  factValue: any,
  source: string,
  confidence: number
): Promise<number> {
  const sql = getSql()
  const result = await sql`
    INSERT INTO user_profile_facts (
      user_profile_id, fact_type, fact_value,
      source, confidence, is_active,
      created_at, updated_at
    )
    VALUES (
      ${profileId}, ${factType}, ${JSON.stringify(factValue)},
      ${source}, ${confidence}, true,
      NOW(), NOW()
    )
    RETURNING id
  ` as Array<{ id: number }>

  return result[0].id
}

/**
 * Update existing fact
 */
export async function updateFact(
  factId: number,
  factValue: any,
  source: string
): Promise<void> {
  const sql = getSql()
  await sql`
    UPDATE user_facts
    SET
      fact_value = ${JSON.stringify(factValue)},
      source = ${source},
      updated_at = NOW()
    WHERE id = ${factId}
  ` as any[]
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
