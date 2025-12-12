'use client'

import { useState, useEffect } from 'react'

interface PendingConfirmation {
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

interface HITLConfirmationsProps {
  userId: string | null
}

export function HITLConfirmations({ userId }: HITLConfirmationsProps) {
  const [confirmations, setConfirmations] = useState<PendingConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchConfirmations = async () => {
      try {
        const res = await fetch('/api/user/profile/pending-confirmations', {
          headers: { 'X-User-Id': userId }
        })
        if (res.ok) {
          const data = await res.json()
          setConfirmations(data.confirmations || [])
        }
      } catch (error) {
        console.error('Failed to fetch confirmations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfirmations()
    const interval = setInterval(fetchConfirmations, 5000)
    return () => clearInterval(interval)
  }, [userId])

  const handleConfirm = async (confirmationId: string) => {
    console.log('Confirming:', confirmationId)
    setProcessing(confirmationId)
    try {
      const res = await fetch('/api/user/profile/confirm-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId || '' },
        body: JSON.stringify({ confirmationId, action: 'approve' })
      })
      console.log('Confirm response:', res.status)
      if (res.ok) {
        setConfirmations(prev => prev.filter(c => c.id !== confirmationId))
      } else {
        const err = await res.text()
        console.error('Confirm failed:', err)
      }
    } catch (error) {
      console.error('Error confirming:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (confirmationId: string) => {
    console.log('Rejecting:', confirmationId)
    setProcessing(confirmationId)
    try {
      const res = await fetch('/api/user/profile/confirm-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId || '' },
        body: JSON.stringify({ confirmationId, action: 'reject' })
      })
      console.log('Reject response:', res.status)
      if (res.ok) {
        setConfirmations(prev => prev.filter(c => c.id !== confirmationId))
      } else {
        const err = await res.text()
        console.error('Reject failed:', err)
      }
    } catch (error) {
      console.error('Error rejecting:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleDismiss = (confirmationId: string) => {
    // Just hide locally without calling API
    setConfirmations(prev => prev.filter(c => c.id !== confirmationId))
  }

  if (!userId || confirmations.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {confirmations.map(confirmation => (
        <div
          key={confirmation.id}
          className="bg-gray-900 border border-yellow-500/50 rounded-lg p-3 shadow-xl"
        >
          {/* Header with dismiss */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-xs text-yellow-400 font-medium">Update detected</p>
                <p className="text-sm text-white capitalize">{(confirmation.fact_type || '').replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(confirmation.id)}
              className="text-gray-500 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Values */}
          <div className="text-xs space-y-1 mb-3 pl-7">
            {confirmation.old_value && (
              <p><span className="text-gray-500">Was:</span> <span className="text-gray-400 line-through">{confirmation.old_value}</span></p>
            )}
            <p><span className="text-gray-500">New:</span> <span className="text-white font-medium">{confirmation.new_value}</span></p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pl-7">
            <button
              onClick={() => handleConfirm(confirmation.id)}
              disabled={processing === confirmation.id}
              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              {processing === confirmation.id ? '...' : 'Save'}
            </button>
            <button
              onClick={() => handleReject(confirmation.id)}
              disabled={processing === confirmation.id}
              className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              {processing === confirmation.id ? '...' : 'Dismiss'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
