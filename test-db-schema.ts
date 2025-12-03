import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function checkSchema() {
  console.log('=== Checking user_profiles table schema ===')

  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    ORDER BY ordinal_position
  `

  console.log('Columns:', columns)

  console.log('\n=== Checking users in neon_auth.users_sync ===')
  const users = await sql`
    SELECT id, name, email, created_at
    FROM neon_auth.users_sync
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log('Users:', users)

  console.log('\n=== Checking user_profiles ===')
  const profiles = await sql`
    SELECT * FROM user_profiles
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log('Profiles:', profiles)

  console.log('\n=== Checking user_profile_facts ===')
  const facts = await sql`
    SELECT COUNT(*) as count FROM user_profile_facts
  `
  console.log('Facts count:', facts)
}

checkSchema().then(() => {
  console.log('\nDone!')
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
