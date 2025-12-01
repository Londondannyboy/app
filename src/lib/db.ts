import { neon } from '@neondatabase/serverless'

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return sql
}

// Types for database tables
export interface UserProfileFact {
  id: number
  user_profile_id: string
  fact_type: string
  fact_value: Record<string, unknown>
  source: string
  confidence: number
  session_id: string | null
  extracted_from_message: string | null
  is_user_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Country {
  id: number
  name: string
  code: string | null
  slug: string | null
  flag_emoji: string | null
  region: string | null
  continent: string | null
  capital: string | null
  currency_code: string | null
  visa_types: string | null
  work_permit_requirements: string | null
  tax_overview: string | null
  language: string | null
  processing_time: string | null
  relocation_motivations: string[] | null
  relocation_tags: string[] | null
  facts: Record<string, unknown> | null
}

export interface Job {
  id: number
  title: string
  company_name: string | null
  location: string | null
  salary_min: number | null
  salary_max: number | null
  currency: string | null
  description: string | null
  url: string | null
  remote_type: string | null
}

// Query helpers
export async function getUserFacts(userId: string) {
  const sql = getDb()
  const facts = await sql`
    SELECT f.* FROM user_profile_facts f
    JOIN user_profiles p ON f.user_profile_id = p.id
    WHERE p.stack_auth_id = ${userId}
    AND f.is_active = true
    ORDER BY f.created_at DESC
  `
  return facts as UserProfileFact[]
}

export async function getOrCreateUserProfile(stackAuthId: string) {
  const sql = getDb()

  // Try to find existing profile
  const existing = await sql`
    SELECT id FROM user_profiles WHERE stack_auth_id = ${stackAuthId}
  `

  if (existing.length > 0) {
    return existing[0].id as string
  }

  // Create new profile
  const created = await sql`
    INSERT INTO user_profiles (stack_auth_id, created_at, updated_at)
    VALUES (${stackAuthId}, NOW(), NOW())
    RETURNING id
  `

  return created[0].id as string
}

export async function saveFact(
  userProfileId: string,
  factType: string,
  factValue: Record<string, unknown>,
  source: string = 'chat',
  confidence: number = 0.8,
  sessionId?: string,
  extractedFromMessage?: string
) {
  const sql = getDb()

  await sql`
    INSERT INTO user_profile_facts (
      user_profile_id, fact_type, fact_value, source, confidence,
      session_id, extracted_from_message, created_at, updated_at
    )
    VALUES (
      ${userProfileId}::uuid, ${factType}, ${JSON.stringify(factValue)}::jsonb,
      ${source}, ${confidence}, ${sessionId || null}, ${extractedFromMessage || null},
      NOW(), NOW()
    )
  `
}

export async function searchCountries(query: string, limit: number = 5) {
  const sql = getDb()

  const results = await sql`
    SELECT id, name, slug, flag_emoji, region, continent, capital,
           visa_types, work_permit_requirements, tax_overview, language
    FROM countries
    WHERE status = 'published'
    AND (
      name ILIKE ${'%' + query + '%'}
      OR region ILIKE ${'%' + query + '%'}
      OR continent ILIKE ${'%' + query + '%'}
      OR visa_types ILIKE ${'%' + query + '%'}
    )
    LIMIT ${limit}
  `

  return results as Country[]
}

export async function searchJobs(query: string, location?: string, limit: number = 10) {
  const sql = getDb()

  let results
  if (location) {
    results = await sql`
      SELECT id, title, company_name, location, salary_min, salary_max,
             currency, description, url, remote_type
      FROM jobs
      WHERE (
        title ILIKE ${'%' + query + '%'}
        OR description ILIKE ${'%' + query + '%'}
      )
      AND location ILIKE ${'%' + location + '%'}
      LIMIT ${limit}
    `
  } else {
    results = await sql`
      SELECT id, title, company_name, location, salary_min, salary_max,
             currency, description, url, remote_type
      FROM jobs
      WHERE title ILIKE ${'%' + query + '%'}
         OR description ILIKE ${'%' + query + '%'}
      LIMIT ${limit}
    `
  }

  return results as Job[]
}
