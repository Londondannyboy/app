import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/api-clients/neon'

/**
 * POST /api/voice/access-token
 *
 * Generates a Hume AI access token for voice conversations.
 * Uses Basic auth with API key as username and Secret key as password.
 * Also returns user profile data to inject as session variables.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body

    const apiKey = process.env.HUME_API_KEY
    const secretKey = process.env.HUME_SECRET_KEY

    if (!apiKey || !secretKey) {
      console.error('Missing Hume credentials')
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 500 }
      )
    }

    // Use Basic auth with API key as username and Secret key as password
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')

    const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hume token error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to get voice access token' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Fetch user profile data to build Hume variables
    let variables: Record<string, string> = {}
    if (user_id) {
      try {
        const user = await getUser(user_id)
        if (user) {
          // Build variables matching Hume prompt placeholders
          // Hume requires ALL variables to have values - provide fallbacks
          variables = {
            first_name: user.first_name || 'there',
            current_country: user.current_country || 'your current location',
            destination_countries: user.destination_countries?.join(', ') || 'various destinations',
            budget: user.budget_monthly ? `${user.budget_monthly} per month` : 'not yet specified',
            timeline: user.timeline || 'flexible',
          }
        }
      } catch (err) {
        console.error('Failed to fetch user for context:', err)
      }
    }

    console.log('✅ Generated Hume access token', {
      user_id,
      expires_in: data.expires_in,
      hasVariables: Object.keys(variables).length > 0,
    })

    return NextResponse.json({
      accessToken: data.access_token,
      configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID,
      userId: user_id,
      variables,
    })

  } catch (error) {
    console.error('Access token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
