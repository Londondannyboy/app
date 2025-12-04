import { NextRequest, NextResponse } from 'next/server'
import { getUser, getUserFacts } from '@/lib/api-clients/neon'

/**
 * POST /api/hume/tools/get-user-profile
 *
 * Hume EVI Tool endpoint - called when EVI needs user profile data.
 * This replaces the need for a Custom Language Model.
 *
 * Configure in Hume Dashboard:
 * - Tool Name: get_user_profile
 * - Description: Get user profile and preferences from database
 * - URL: https://new-omega-amber.vercel.app/api/hume/tools/get-user-profile
 */
export async function POST(request: NextRequest) {
  console.log('🔧 Hume Tool called: get_user_profile')

  try {
    const body = await request.json()

    // Hume sends the custom_session_id (which is the user's neon_auth_id)
    const userId = body.custom_session_id || body.parameters?.user_id

    console.log('Tool request:', { userId, body })

    if (!userId) {
      return NextResponse.json({
        content: 'No user identified. Please ask the user to sign in.',
        type: 'tool_response'
      })
    }

    // Fetch user from Neon
    const user = await getUser(userId)

    if (!user) {
      return NextResponse.json({
        content: 'User not found in database. This appears to be a new user.',
        type: 'tool_response'
      })
    }

    // Fetch user's conversation facts
    const facts = await getUserFacts(userId)

    // Build a natural language response for the LLM
    const profileParts: string[] = []

    if (user.first_name) {
      profileParts.push(`The user's name is ${user.first_name}.`)
    }

    if (user.current_country) {
      profileParts.push(`They currently live in ${user.current_country}.`)
    }

    if (user.destination_countries && user.destination_countries.length > 0) {
      profileParts.push(`They are interested in relocating to: ${user.destination_countries.join(', ')}.`)
    }

    if (user.nationality) {
      profileParts.push(`Their nationality is ${user.nationality}.`)
    }

    if (user.timeline) {
      profileParts.push(`Their timeline for relocating is: ${user.timeline}.`)
    }

    if (user.budget_monthly) {
      profileParts.push(`Their monthly budget is approximately ${user.budget_monthly}.`)
    }

    // Add facts from conversations
    if (facts && facts.length > 0) {
      const factsList = facts.map(f => `${f.fact_type}: ${f.fact_value}`).join(', ')
      profileParts.push(`Additional information learned from conversations: ${factsList}.`)
    }

    const content = profileParts.length > 0
      ? `User Profile Information:\n${profileParts.join('\n')}`
      : 'No profile information available yet for this user.'

    console.log('✅ Tool response:', content.substring(0, 200))

    return NextResponse.json({
      content,
      type: 'tool_response'
    })

  } catch (error) {
    console.error('Tool error:', error)
    return NextResponse.json({
      content: 'Error retrieving user profile. Please try again.',
      type: 'tool_response'
    })
  }
}
