export interface User {
  id: string
  neon_auth_id: string
  email: string
  first_name: string | null
  last_name: string | null
  current_country: string | null
  destination_countries: string[] | null
  nationality: string | null
  budget_monthly: number | null
  timeline: string | null
  relocation_motivation: string[] | null
  facts: UserFact[]
  pending_confirmations: PendingConfirmation[]
  created_at: string
  updated_at: string
}

export interface UserFact {
  fact_type: string
  fact_value: string
  source: 'voice' | 'user_edit' | 'chat'
  confidence: number
  extracted_at: string
}

export interface PendingConfirmation {
  id: string
  fact_type: string
  old_value: string | null
  new_value: string
  source: string
  confidence: number
  user_message: string
  ai_response: string
  created_at: string
}

// HITL (Human-in-the-Loop) event types
export interface HITLEvent {
  id: string
  user_id: string
  event_type: 'profile_suggestion' | 'article_recommendation' | 'fact_correction'
  data: ProfileSuggestion | ArticleRecommendation | FactCorrection
  created_at: string
  requires_confirmation: boolean
  confirmed?: boolean
  confirmed_at?: string
}

export interface ProfileSuggestion {
  fact_type: string
  current_value?: string
  suggested_value: string
  confidence: number
  source: string  // e.g., "voice conversation at 2024-12-02T15:30:00Z"
}

export interface ArticleRecommendation {
  article_id: number
  article_title: string
  article_slug: string
  reason: string
}

export interface FactCorrection {
  fact_id: number
  fact_type: string
  incorrect_value: string
  corrected_value: string
}
