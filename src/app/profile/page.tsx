'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@stackframe/stack'
import { neon } from '@neondatabase/serverless'

export default function ProfilePage() {
  const user = useUser({ or: 'redirect' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    current_country: '',
    destination_countries: [] as string[],
    nationality: '',
    budget_monthly: '',
    timeline: '',
    relocation_motivation: [] as string[]
  })

  useEffect(() => {
    loadUserData()
  }, [user.id])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/user/profile/get?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUserData(data.user)
          setFormData({
            first_name: data.user.first_name || '',
            last_name: data.user.last_name || '',
            current_country: data.user.current_country || '',
            destination_countries: data.user.destination_countries || [],
            nationality: data.user.nationality || '',
            budget_monthly: data.user.budget_monthly?.toString() || '',
            timeline: data.user.timeline || '',
            relocation_motivation: data.user.relocation_motivation || []
          })
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/user/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          current_country: formData.current_country,
          destination_countries: formData.destination_countries,
          nationality: formData.nationality,
          budget_monthly: formData.budget_monthly ? parseInt(formData.budget_monthly) : null,
          timeline: formData.timeline,
          relocation_motivation: formData.relocation_motivation
        })
      })

      if (res.ok) {
        alert('Profile updated successfully!')
        loadUserData()
      } else {
        alert('Failed to update profile')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
          <p className="text-gray-300 mb-8">Manage your account information</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-white/20 pb-2">
                Account Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Email (from Stack Auth)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.primaryEmail || ''}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Relocation Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-white/20 pb-2">
                Relocation Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Current Country
                  </label>
                  <input
                    type="text"
                    value={formData.current_country}
                    onChange={(e) => setFormData({ ...formData, current_country: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Monthly Budget (USD)
                </label>
                <input
                  type="number"
                  value={formData.budget_monthly}
                  onChange={(e) => setFormData({ ...formData, budget_monthly: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Timeline
                </label>
                <select
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select timeline</option>
                  <option value="0-3 months">0-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6-12 months">6-12 months</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="2+ years">2+ years</option>
                  <option value="Just exploring">Just exploring</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Danger Zone */}
          <div className="mt-8 pt-8 border-t border-red-500/20">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
            <button
              onClick={() => user.signOut()}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
