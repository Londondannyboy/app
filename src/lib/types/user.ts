export interface UserProfile {
  id: string
  stack_user_id: string
  email?: string
  display_name?: string
  created_at: string
  updated_at: string
}

export interface UserFact {
  id: number
  user_profile_id: number
  fact_type: FactType
  fact_value: FactValue | string  // Can be string for backward compat
  source: FactSource
  confidence: number
  is_user_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FactValue {
  value: string
  normalized?: string  // e.g., "USA" normalized to "United States"
  metadata?: Record<string, any>
}

export type FactType =
  | 'name'
  | 'destination'
  | 'origin'
  | 'budget'
  | 'timeline'
  | 'family_size'
  | 'work_type'
  | 'visa_interest'
  | 'nationality'
  | 'profession'
  | 'language'

export type FactSource =
  | 'voice'
  | 'user_edit'
  | 'user_verified'
  | 'inferred'
  | 'imported'

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
  fact_type: FactType
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
  fact_type: FactType
  incorrect_value: string
  corrected_value: string
}
