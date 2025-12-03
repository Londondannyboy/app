'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@stackframe/stack'

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Portugal', 'Netherlands', 'Sweden',
  'Norway', 'Denmark', 'Japan', 'South Korea', 'Singapore', 'New Zealand',
  'Ireland', 'Switzerland', 'Austria', 'Belgium', 'Other'
]

const MOTIVATIONS = [
  'Career Opportunities',
  'Better Quality of Life',
  'Lower Cost of Living',
  'Climate & Weather',
  'Safety & Security',
  'Healthcare',
  'Education',
  'Family',
  'Adventure',
  'Retirement'
]

export default function OnboardingPage() {
  const user = useUser({ or: 'redirect' })
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    current_country: '',
    nationality: '',
    destination_countries: [] as string[],
    relocation_motivation: [] as string[],
    timeline: '',
    budget_monthly: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/user/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify({
          current_country: formData.current_country,
          nationality: formData.nationality,
          destination_countries: formData.destination_countries,
          relocation_motivation: formData.relocation_motivation,
          timeline: formData.timeline,
          budget_monthly: formData.budget_monthly ? parseInt(formData.budget_monthly) : null
        })
      })

      if (res.ok) {
        router.push('/dashboard')
      } else {
        alert('Failed to save profile. Please try again.')
      }
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDestination = (country: string) => {
    setFormData(prev => ({
      ...prev,
      destination_countries: prev.destination_countries.includes(country)
        ? prev.destination_countries.filter(c => c !== country)
        : [...prev.destination_countries, country]
    }))
  }

  const toggleMotivation = (motivation: string) => {
    setFormData(prev => ({
      ...prev,
      relocation_motivation: prev.relocation_motivation.includes(motivation)
        ? prev.relocation_motivation.filter(m => m !== motivation)
        : [...prev.relocation_motivation, motivation]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user.displayName}! 👋</h1>
        <p className="text-gray-300 mb-8">Let's set up your relocation profile</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Country */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Where are you currently located? *
            </label>
            <select
              required
              value={formData.current_country}
              onChange={(e) => setFormData({ ...formData, current_country: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select country</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              What's your nationality? *
            </label>
            <select
              required
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select nationality</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Destination Countries */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Where would you like to relocate? (select up to 3) *
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-lg">
              {COUNTRIES.map(country => (
                <button
                  key={country}
                  type="button"
                  onClick={() => toggleDestination(country)}
                  disabled={!formData.destination_countries.includes(country) && formData.destination_countries.length >= 3}
                  className={`px-3 py-2 rounded text-sm transition ${
                    formData.destination_countries.includes(country)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-50'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          {/* Motivation */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              What's motivating your relocation? (select all that apply) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVATIONS.map(motivation => (
                <button
                  key={motivation}
                  type="button"
                  onClick={() => toggleMotivation(motivation)}
                  className={`px-3 py-2 rounded text-sm transition ${
                    formData.relocation_motivation.includes(motivation)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {motivation}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              What's your timeline? *
            </label>
            <select
              required
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

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Monthly budget (USD)
            </label>
            <input
              type="number"
              placeholder="e.g., 3000"
              value={formData.budget_monthly}
              onChange={(e) => setFormData({ ...formData, budget_monthly: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || formData.destination_countries.length === 0 || formData.relocation_motivation.length === 0}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Complete Setup →'}
          </button>
        </form>
      </div>
    </div>
  )
}
