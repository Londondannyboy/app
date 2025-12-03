import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/user/profile/confirm-fact
 *
 * Approve or reject a pending HITL confirmation
 *
 * Body: { confirmationId: number, action: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const { confirmationId, action } = await request.json()

    if (!confirmationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid confirmationId or action' },
        { status: 400 }
      )
    }

    // Get user profile
    const profiles = await sql`
      SELECT id FROM user_profiles WHERE user_id = ${userId}
    `

    if (profiles.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const profileId = profiles[0].id

    // Get the confirmation
    const confirmations = await sql`
      SELECT
        id, fact_type, old_value, new_value,
        source, confidence, user_profile_id
      FROM user_fact_confirmations
      WHERE id = ${confirmationId}
      AND user_profile_id = ${profileId}
      AND status = 'pending'
    `

    if (confirmations.length === 0) {
      return NextResponse.json(
        { error: 'Confirmation not found or already processed' },
        { status: 404 }
      )
    }

    const confirmation = confirmations[0]

    if (action === 'approve') {
      // Update the confirmation status
      await sql`
        UPDATE user_fact_confirmations
        SET status = 'approved', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = ${confirmationId}
      `

      // Check if fact already exists
      const existingFacts = await sql`
        SELECT id FROM user_profile_facts
        WHERE user_profile_id = ${profileId}
        AND fact_type = ${confirmation.fact_type}
        AND is_active = true
      `

      if (existingFacts.length > 0) {
        // Update existing fact
        await sql`
          UPDATE user_profile_facts
          SET
            fact_value = ${confirmation.new_value},
            source = ${confirmation.source},
            confidence = ${confirmation.confidence},
            is_user_verified = true,
            verified_at = NOW(),
            updated_at = NOW()
          WHERE id = ${existingFacts[0].id}
        `
      } else {
        // Create new fact
        await sql`
          INSERT INTO user_profile_facts (
            user_profile_id, fact_type, fact_value,
            source, confidence, is_user_verified,
            is_active, created_at, updated_at, verified_at
          ) VALUES (
            ${profileId}, ${confirmation.fact_type}, ${confirmation.new_value},
            ${confirmation.source}, ${confirmation.confidence}, true,
            true, NOW(), NOW(), NOW()
          )
        `
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        message: 'Fact confirmed and saved to your profile'
      })
    } else {
      // Reject the confirmation
      await sql`
        UPDATE user_fact_confirmations
        SET status = 'rejected', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = ${confirmationId}
      `

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Confirmation rejected'
      })
    }
  } catch (error) {
    console.error('Error processing confirmation:', error)
    return NextResponse.json(
      { error: 'Failed to process confirmation' },
      { status: 500 }
    )
  }
}
