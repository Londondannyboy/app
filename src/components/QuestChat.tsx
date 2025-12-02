'use client'

import { C1Chat } from '@thesysai/genui-sdk'
import { useUser } from '@stackframe/stack'

interface QuestChatProps {
  appId?: 'relocation' | 'placement'
}

export function QuestChat({ appId = 'relocation' }: QuestChatProps) {
  const user = useUser()

  const appConfig = {
    relocation: {
      name: 'Quest Relocation',
      logo: '🌍',
      placeholder: 'Ask about relocating, finding jobs, or comparing countries...',
      welcome: 'Welcome to Quest Relocation! I can help you discover your ideal country, find jobs, and plan your move. Try asking about articles, job opportunities, or country comparisons.'
    },
    placement: {
      name: 'Placement Quest',
      logo: '💼',
      placeholder: 'Ask about PE deals, placement agents, or market trends...',
      welcome: 'Welcome to Placement Quest! I can help you track deals, discover agents, and analyze PE trends.'
    }
  }[appId]

  return (
    <div className="h-full w-full">
      <C1Chat
        apiUrl="/api/c1/chat"
        agentName={appConfig.name}
        formFactor="full-page"
        theme={{
          mode: 'dark' as const,
        }}
        onAction={async (action) => {
          // Handle custom actions from generated UI
          console.log('Action triggered:', action)

          // Examples of actions we might handle:
          // - bookmark_article
          // - save_job
          // - apply_job
          // - compare_countries

          // For now, log them - we'll implement handlers later
        }}
      />
    </div>
  )
}
