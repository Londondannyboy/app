export interface Article {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  country: string | null
  country_code: string | null
  article_mode: 'topic' | 'guide' | 'video'
  featured_asset_url: string | null
  hero_asset_url: string | null
  video_playback_id: string | null
  published_at: string | null
  payload: ArticlePayload | null
  video_narrative: VideoNarrative | null
  app: 'relocation' | 'placement'
  status: 'draft' | 'published' | 'archived'
}

export interface ArticlePayload {
  faq?: FAQ[]
  callouts?: Callout[]
  stat_highlight?: StatHighlight
  timeline?: TimelineEvent[]
  sources?: Source[]
}

export interface FAQ {
  question: string
  answer: string
}

export interface Callout {
  type: 'warning' | 'tip' | 'info' | 'success'
  title: string
  content: string
}

export interface StatHighlight {
  value: string
  label: string
  context: string
}

export interface TimelineEvent {
  date: string
  title: string
  description: string
}

export interface Source {
  title: string
  url: string
}

export interface VideoNarrative {
  playback_id?: string
  acts?: Record<string, Act>
}

export interface Act {
  start: number  // seconds
  end: number
  title: string
  description?: string
}
