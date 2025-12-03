// DEPRECATED: Use RepoSection from dashboard instead
// This is a stub for backward compatibility

'use client'

import { RepoSection } from './dashboard/RepoSection'

interface UserFactsPanelProps {
  userId: string | null
}

export function UserFactsPanel({ userId }: UserFactsPanelProps) {
  return <RepoSection userId={userId} />
}
