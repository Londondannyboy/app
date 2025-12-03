import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const results: any = {}

  try {
    // Check if neon_auth schema exists
    const schemas = await sql`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name = 'neon_auth'
    `
    results.neon_auth_schema_exists = schemas.length > 0

    if (schemas.length > 0) {
      // Check neon_auth.users_sync table
      try {
        const authUsers = await sql`
          SELECT id, name, email, created_at
          FROM neon_auth.users_sync
          ORDER BY created_at DESC
          LIMIT 10
        `
        results.neon_auth_users = authUsers
      } catch (err) {
        results.neon_auth_error = String(err)
      }
    }

    // Check user_profiles table
    const profileColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
      ORDER BY ordinal_position
    `
    results.user_profiles_schema = profileColumns

    // Check users table data
    const users = await sql`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `
    results.users_data = users

    // Check all tables in public schema
    const publicTables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    results.public_tables = publicTables.map((t: any) => t.table_name)

    return NextResponse.json({
      success: true,
      ...results
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      partial_results: results
    }, { status: 500 })
  }
}
