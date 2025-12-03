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
    setProcessing(confirmationId)
    try {
      const res = await fetch('/api/user/profile/confirm-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId || '' },
        body: JSON.stringify({ confirmation_id: confirmationId, approved: true })
      })
      if (res.ok) setConfirmations(prev => prev.filter(c => c.id !== confirmationId))
    } catch (error) {
      console.error('Error confirming:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (confirmationId: string) => {
    setProcessing(confirmationId)
    try {
      const res = await fetch('/api/user/profile/confirm-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId || '' },
        body: JSON.stringify({ confirmation_id: confirmationId, approved: false })
      })
      if (res.ok) setConfirmations(prev => prev.filter(c => c.id !== confirmationId))
    } catch (error) {
      console.error('Error rejecting:', error)
    } finally {
      setProcessing(null)
    }
  }

  if (!userId || confirmations.length === 0) return null

  return (
    <div className="fixed top-20 right-4 w-96 max-h-96 overflow-y-auto z-40 space-y-2">
      {confirmations.map(confirmation => (
        <div key={confirmation.id} className="bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl p-4 shadow-lg backdrop-blur-sm animate-pulse">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-medium text-white text-sm">Confirm Change</h3>
                <p className="text-xs text-gray-400 capitalize">{confirmation.fact_type.replace('_', ' ')}</p>
              </div>
            </div>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
              {Math.round(confirmation.confidence * 100)}% sure
            </span>
          </div>
          <div className="space-y-2 mb-3">
            {confirmation.old_value && (
              <div className="text-xs">
                <span className="text-gray-500">Current: </span>
                <span className="text-white line-through">{confirmation.old_value}</span>
              </div>
            )}
            <div className="text-xs">
              <span className="text-gray-500">New: </span>
              <span className="text-white font-medium">{confirmation.new_value}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleConfirm(confirmation.id)} disabled={processing === confirmation.id}
              className="flex-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm font-medium disabled:opacity-50">
              {processing === confirmation.id ? 'Confirming...' : '✓ Confirm'}
            </button>
            <button onClick={() => handleReject(confirmation.id)} disabled={processing === confirmation.id}
              className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm font-medium disabled:opacity-50">
              {processing === confirmation.id ? 'Rejecting...' : '✗ Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
