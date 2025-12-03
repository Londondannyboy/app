'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@stackframe/stack'

interface Confirmation {
  id: number
  fact_type: string
  old_value: { value?: string } | null
  new_value: { value: string }
  source: string
  confidence: number
  user_message: string
  ai_response: string
  created_at: string
}

export function HITLConfirmations() {
  const user = useUser()
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return

    async function fetchConfirmations() {
      try {
        const response = await fetch('/api/user/profile/pending-confirmations', {
          headers: {
            'x-user-id': user.id
          }
        })
        const data = await response.json()
        setConfirmations(data.confirmations || [])
      } catch (error) {
        console.error('Error fetching confirmations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfirmations()

    // Poll every 10 seconds for new confirmations
    const interval = setInterval(fetchConfirmations, 10000)
    return () => clearInterval(interval)
  }, [user])

  async function handleAction(confirmationId: number, action: 'approve' | 'reject') {
    if (!user || processing) return

    setProcessing(confirmationId)
    try {
      const response = await fetch('/api/user/profile/confirm-fact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ confirmationId, action })
      })

      if (response.ok) {
        // Remove from list
        setConfirmations(prev => prev.filter(c => c.id !== confirmationId))
      } else {
        console.error('Failed to process confirmation')
      }
    } catch (error) {
      console.error('Error processing confirmation:', error)
    } finally {
      setProcessing(null)
    }
  }

  if (!user || loading || confirmations.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
      {confirmations.map((confirmation) => (
        <div
          key={confirmation.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Confirm {confirmation.fact_type}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                From your conversation
              </p>
            </div>
            <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
              Pending
            </span>
          </div>

          <div className="space-y-2 text-sm">
            {confirmation.old_value?.value && (
              <div>
                <span className="text-gray-500">Current: </span>
                <span className="text-gray-700 line-through">
                  {confirmation.old_value.value}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500">
                {confirmation.old_value ? 'New: ' : 'Detected: '}
              </span>
              <span className="text-gray-900 font-medium">
                {confirmation.new_value.value}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(confirmation.id, 'approve')}
                disabled={processing === confirmation.id}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
              >
                {processing === confirmation.id ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => handleAction(confirmation.id, 'reject')}
                disabled={processing === confirmation.id}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
