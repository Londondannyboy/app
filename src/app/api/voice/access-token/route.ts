import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/api-clients/neon'

/**
 * POST /api/voice/access-token
 *
 * Generates a Hume AI access token for voice conversations.
 * Also returns user profile data to inject as session context.
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

    // Call Hume API to get access token
    const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: secretKey,
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

    // Fetch user profile data to inject as context
    let userContext = null
    if (user_id) {
      try {
        const user = await getUser(user_id)
        if (user) {
          userContext = {
            name: user.first_name || undefined,
            current_country: user.current_country || undefined,
            destination_countries: user.destination_countries || [],
            nationality: user.nationality || undefined,
            timeline: user.timeline || undefined,
          }
        }
      } catch (err) {
        console.error('Failed to fetch user for context:', err)
      }
    }

    console.log('✅ Generated Hume access token', {
      user_id,
      expires_in: data.expires_in,
      hasUserContext: !!userContext,
    })

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      userContext,
    })

  } catch (error) {
    console.error('Access token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
