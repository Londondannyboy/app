import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/debug/test-all?user_id=xxx
 *
 * Comprehensive test of all functionality
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const results: any = {
    user_id: userId,
    timestamp: new Date().toISOString()
  }

  try {
    // 1. Check if user exists in neon_auth.users_sync
    const authUsers = await sql`
      SELECT id, email, name FROM neon_auth.users_sync
      WHERE id = ${userId}
    `
    results.neon_auth_user = authUsers.length > 0 ? authUsers[0] : null

    // 2. Check if user exists in users table
    const users = await sql`
      SELECT * FROM users WHERE neon_auth_id = ${userId}
    `
    results.user_record = users.length > 0 ? users[0] : null

    // 3. Check ZEP API connection
    try {
      const zepRes = await fetch('https://api.getzep.com/api/v2/graph/search', {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${process.env.ZEP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          graph_id: 'relocation',
          query: 'Malta',
          scope: 'edges',
          limit: 5
        })
      })

      if (zepRes.ok) {
        const zepData = await zepRes.json()
        results.zep_test = {
          status: 'success',
          malta_results: zepData.edges?.length || 0
        }
      } else {
        results.zep_test = {
          status: 'error',
          code: zepRes.status,
          message: await zepRes.text()
        }
      }
    } catch (err) {
      results.zep_test = {
        status: 'error',
        message: String(err)
      }
    }

    // 4. Check for Malta articles
    const maltaArticles = await sql`
      SELECT id, title, country_code, excerpt
      FROM articles
      WHERE status = 'published'
      AND (
        country_code ILIKE '%malta%'
        OR title ILIKE '%malta%'
        OR content ILIKE '%malta%'
      )
      LIMIT 5
    `
    results.malta_articles = maltaArticles

    // 5. Check environment variables
    results.env_vars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      ZEP_API_KEY: !!process.env.ZEP_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      SUPERMEMORY_API_KEY: !!process.env.SUPERMEMORY_API_KEY
    }

    // 6. Test voice endpoint logic
    if (results.user_record) {
      results.voice_context = {
        has_first_name: !!results.user_record.first_name,
        has_profile_data: !!(
          results.user_record.current_country ||
          results.user_record.destination_countries?.length > 0
        ),
        has_facts: results.user_record.facts?.length > 0,
        facts_count: results.user_record.facts?.length || 0
      }
    }

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
