import { neon } from '@neondatabase/serverless'
import type { UserProfile, UserFact, Article } from '@quest/types'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Get or create user profile by Stack Auth user ID
 */
export async function getOrCreateProfile(stackUserId: string): Promise<number> {
  // Try to find existing profile
  const existing = await sql`
    SELECT id FROM user_profiles
    WHERE stack_user_id = ${stackUserId}
  `

  if (existing.length > 0) {
    return existing[0].id
  }

  // Create new profile
  const result = await sql`
    INSERT INTO user_profiles (stack_user_id, created_at, updated_at)
    VALUES (${stackUserId}, NOW(), NOW())
    RETURNING id
  `

  return result[0].id
}

/**
 * Get all active facts for a user (their "repo")
 */
export async function getUserFacts(stackUserId: string): Promise<UserFact[]> {
  const rows = await sql`
    SELECT
      f.id, f.user_profile_id, f.fact_type, f.fact_value,
      f.source, f.confidence, f.is_user_verified, f.is_active,
      f.created_at, f.updated_at
    FROM user_facts f
    JOIN user_profiles p ON p.id = f.user_profile_id
    WHERE p.stack_user_id = ${stackUserId}
    AND f.is_active = true
    ORDER BY f.updated_at DESC
  `

  return rows as UserFact[]
}

/**
 * Store a new fact from voice conversation
 */
export async function storeFact(
  profileId: number,
  factType: string,
  factValue: any,
  source: string,
  confidence: number
): Promise<number> {
  const result = await sql`
    INSERT INTO user_facts (
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
  `

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
  await sql`
    UPDATE user_facts
    SET
      fact_value = ${JSON.stringify(factValue)},
      source = ${source},
      updated_at = NOW()
    WHERE id = ${factId}
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
  const rows = await sql`
    SELECT
      id, title, slug, excerpt, content, country, country_name,
      flag_emoji, article_mode, featured_asset_url, hero_asset_url,
      video_playback_id, published_at, payload, video_narrative,
      app, status
    FROM articles
    WHERE status = 'published'
    AND app = ${appFilter}
    AND (
      title ILIKE ${'%' + query + '%'}
      OR excerpt ILIKE ${'%' + query + '%'}
      OR content ILIKE ${'%' + query + '%'}
      OR country ILIKE ${'%' + query + '%'}
    )
    ORDER BY published_at DESC
    LIMIT ${limit}
  `

  return rows as Article[]
}

/**
 * Get articles by country (for context)
 */
export async function getArticlesByCountry(
  country: string,
  appFilter: 'relocation' | 'placement' = 'relocation',
  limit: number = 10
): Promise<Article[]> {
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
  `

  return rows as Article[]
}
