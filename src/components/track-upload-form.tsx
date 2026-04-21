'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

interface TrackFormData {
  // Step 1: Basics
  title: string
  artist_name: string
  genre: string
  release_date: string
  duration_seconds: number
  isrc: string
  audio_file: File | null

  // Step 2: Splits (royalty splits)
  splits: Array<{ recipient: string; percentage: number }>

  // Step 3: License Terms
  ai_training_allowed: boolean
  ai_training_price_usd: number | null
  sync_allowed: boolean
  sync_price_usd: number | null
  commercial_use_allowed: boolean
  commercial_use_revenue_share_pct: number
}

interface TrackUploadFormProps {
  userId: string
  username?: string
}

export function TrackUploadForm({ userId, username }: TrackUploadFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<TrackFormData>({
    title: '',
    artist_name: username || '',
    genre: '',
    release_date: '',
    duration_seconds: 0,
    isrc: '',
    audio_file: null,
    splits: [],
    ai_training_allowed: false,
    ai_training_price_usd: null,
    sync_allowed: false,
    sync_price_usd: null,
    commercial_use_allowed: false,
    commercial_use_revenue_share_pct: 0,
  })

  const handleInputChange = (field: keyof TrackFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleInputChange('audio_file', file)
    }
  }

  const validateStep = (currentStep: number): boolean => {
    setError(null)

    switch (currentStep) {
      case 1:
        if (!formData.title.trim()) {
          setError('Track title is required')
          return false
        }
        if (!formData.audio_file) {
          setError('Audio file is required')
          return false
        }
        if (formData.audio_file.size > 20 * 1024 * 1024) {
          setError('Audio file must be under 20MB')
          return false
        }
        return true
      case 2:
        // Splits are optional
        for (const split of formData.splits) {
          if (!split.recipient.startsWith('0x')) {
            setError('Invalid wallet address in splits')
            return false
          }
          if (split.percentage < 0 || split.percentage > 100) {
            setError('Split percentage must be between 0-100')
            return false
          }
        }
        return true
      case 3:
        // License terms validation
        if (formData.ai_training_allowed && !formData.ai_training_price_usd) {
          setError('Set a price for AI training license')
          return false
        }
        if (formData.sync_allowed && !formData.sync_price_usd) {
          setError('Set a price for sync license')
          return false
        }
        if (
          formData.commercial_use_allowed &&
          (formData.commercial_use_revenue_share_pct < 0 ||
            formData.commercial_use_revenue_share_pct > 100)
        ) {
          setError('Commercial use revenue share must be 0-100%')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handlePrevious = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Prepare form data
      const submitFormData = new FormData()
      submitFormData.append('audio_file', formData.audio_file!)
      submitFormData.append(
        'metadata',
        JSON.stringify({
          title: formData.title,
          artist_name: formData.artist_name,
          genre: formData.genre,
          release_date: formData.release_date,
          duration_seconds: formData.duration_seconds,
          isrc: formData.isrc,
          splits: formData.splits,
          ai_training_allowed: formData.ai_training_allowed,
          ai_training_price_usd: formData.ai_training_price_usd,
          sync_allowed: formData.sync_allowed,
          sync_price_usd: formData.sync_price_usd,
          commercial_use_allowed: formData.commercial_use_allowed,
          commercial_use_revenue_share_pct: formData.commercial_use_revenue_share_pct,
        })
      )

      // Submit to registration endpoint
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        body: submitFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }

      const result = await response.json()
      console.log('[track-form] Registration successful:', result)

      // Redirect to track detail page
      router.push(`/track/${result.trackId}`)
    } catch (err) {
      console.error('[track-form] Submit error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                s <= step
                  ? 'bg-white text-black'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-sm text-gray-400">
          <span>Step {step} of 4</span>
          <span>•</span>
          <span>
            {step === 1 && 'Track Basics'}
            {step === 2 && 'Royalty Splits'}
            {step === 3 && 'License Terms'}
            {step === 4 && 'Review & Confirm'}
          </span>
        </div>
      </div>

      <Card className="p-8 bg-gray-900 border-gray-800">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Track Basics */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Track Basics</h2>

            <div>
              <Label htmlFor="title">Track Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Midnight Dreams"
                className="mt-2 bg-gray-800 border-gray-700"
              />
            </div>

            <div>
              <Label htmlFor="artist">Artist Name</Label>
              <Input
                id="artist"
                value={formData.artist_name}
                onChange={(e) => handleInputChange('artist_name', e.target.value)}
                placeholder="Your name"
                className="mt-2 bg-gray-800 border-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={formData.genre}
                  onChange={(e) => handleInputChange('genre', e.target.value)}
                  placeholder="e.g., Electronic"
                  className="mt-2 bg-gray-800 border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="release_date">Release Date</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => handleInputChange('release_date', e.target.value)}
                  className="mt-2 bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_seconds}
                  onChange={(e) => handleInputChange('duration_seconds', parseInt(e.target.value) || 0)}
                  placeholder="180"
                  className="mt-2 bg-gray-800 border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="isrc">ISRC Code</Label>
                <Input
                  id="isrc"
                  value={formData.isrc}
                  onChange={(e) => handleInputChange('isrc', e.target.value)}
                  placeholder="Optional"
                  className="mt-2 bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="audio">Audio File * (max 20MB)</Label>
              <input
                id="audio"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-gray-100"
              />
              {formData.audio_file && (
                <p className="mt-2 text-sm text-gray-400">
                  Selected: {formData.audio_file.name} ({(formData.audio_file.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Royalty Splits */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Royalty Splits</h2>
            <p className="text-gray-400">
              Optionally add collaborators and their revenue share percentages.
            </p>

            {formData.splits.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded p-6 text-center text-gray-400">
                No splits added yet. You'll receive 100% of royalties.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.splits.map((split, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-gray-800 rounded">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">{split.recipient}</p>
                      <p className="font-semibold">{split.percentage}%</p>
                    </div>
                    <button
                      onClick={() => {
                        const newSplits = formData.splits.filter((_, i) => i !== idx)
                        handleInputChange('splits', newSplits)
                      }}
                      className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  // In a real app, this would open a dialog to add a new split
                  // For now, we'll keep it simple
                  const recipient = prompt('Wallet address (0x...):')
                  const percentage = prompt('Percentage (0-100):')
                  if (recipient && percentage) {
                    const newSplits = [
                      ...formData.splits,
                      {
                        recipient,
                        percentage: parseInt(percentage),
                      },
                    ]
                    handleInputChange('splits', newSplits)
                  }
                }}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded hover:bg-white/20 text-sm font-semibold"
              >
                + Add Collaborator
              </button>
            </div>
          </div>
        )}

        {/* Step 3: License Terms */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">License Terms</h2>
            <p className="text-gray-400">
              Define how others can use your music. All terms are machine-readable and enforced by smart contracts.
            </p>

            {/* AI Training */}
            <div className="bg-gray-800/50 border border-gray-700 rounded p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ai_training"
                  checked={formData.ai_training_allowed}
                  onChange={(e) => handleInputChange('ai_training_allowed', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="ai_training" className="font-semibold">
                  Allow AI Training
                </label>
              </div>
              {formData.ai_training_allowed && (
                <div>
                  <Label htmlFor="ai_price">License Fee (USD)</Label>
                  <Input
                    id="ai_price"
                    type="number"
                    value={formData.ai_training_price_usd || ''}
                    onChange={(e) => handleInputChange('ai_training_price_usd', parseFloat(e.target.value) || null)}
                    placeholder="0.00"
                    className="mt-2 bg-gray-700 border-gray-600"
                  />
                </div>
              )}
            </div>

            {/* Sync Licensing */}
            <div className="bg-gray-800/50 border border-gray-700 rounded p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sync"
                  checked={formData.sync_allowed}
                  onChange={(e) => handleInputChange('sync_allowed', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="sync" className="font-semibold">
                  Allow Sync to Visual Media
                </label>
              </div>
              {formData.sync_allowed && (
                <div>
                  <Label htmlFor="sync_price">License Fee (USD)</Label>
                  <Input
                    id="sync_price"
                    type="number"
                    value={formData.sync_price_usd || ''}
                    onChange={(e) => handleInputChange('sync_price_usd', parseFloat(e.target.value) || null)}
                    placeholder="0.00"
                    className="mt-2 bg-gray-700 border-gray-600"
                  />
                </div>
              )}
            </div>

            {/* Commercial Use */}
            <div className="bg-gray-800/50 border border-gray-700 rounded p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="commercial"
                  checked={formData.commercial_use_allowed}
                  onChange={(e) => handleInputChange('commercial_use_allowed', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="commercial" className="font-semibold">
                  Allow Commercial Use
                </label>
              </div>
              {formData.commercial_use_allowed && (
                <div>
                  <Label htmlFor="rev_share">Your Revenue Share (%)</Label>
                  <Input
                    id="rev_share"
                    type="number"
                    value={formData.commercial_use_revenue_share_pct}
                    onChange={(e) =>
                      handleInputChange('commercial_use_revenue_share_pct', parseInt(e.target.value) || 0)
                    }
                    placeholder="50"
                    min="0"
                    max="100"
                    className="mt-2 bg-gray-700 border-gray-600"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    You'll receive this % of revenue from commercial uses
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Review & Register</h2>

            <div className="space-y-4 text-sm">
              <div className="bg-gray-800/50 border border-gray-700 rounded p-4">
                <p className="text-gray-400 mb-1">Track</p>
                <p className="font-semibold text-lg">{formData.title}</p>
                <p className="text-gray-400 text-sm">{formData.artist_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded p-4">
                  <p className="text-gray-400 mb-1 text-xs">Genre</p>
                  <p className="font-semibold">{formData.genre || 'Not specified'}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded p-4">
                  <p className="text-gray-400 mb-1 text-xs">Duration</p>
                  <p className="font-semibold">{formData.duration_seconds}s</p>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded p-4">
                <p className="text-gray-400 mb-2 text-xs">License Terms</p>
                <div className="space-y-1 text-sm">
                  {formData.ai_training_allowed && (
                    <div className="flex justify-between">
                      <span>AI Training License</span>
                      <span className="text-green-400">${formData.ai_training_price_usd}</span>
                    </div>
                  )}
                  {formData.sync_allowed && (
                    <div className="flex justify-between">
                      <span>Sync License</span>
                      <span className="text-green-400">${formData.sync_price_usd}</span>
                    </div>
                  )}
                  {formData.commercial_use_allowed && (
                    <div className="flex justify-between">
                      <span>Commercial Revenue Share</span>
                      <span className="text-green-400">{formData.commercial_use_revenue_share_pct}%</span>
                    </div>
                  )}
                  {!formData.ai_training_allowed && !formData.sync_allowed && !formData.commercial_use_allowed && (
                    <p className="text-gray-400 text-xs">No commercial licenses enabled</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4 text-sm text-blue-300">
              <p className="font-semibold mb-1">Registration Process</p>
              <p>
                Clicking register will upload your audio to IPFS, create license metadata, and register your work as an IP Asset on Story Protocol Aeneid testnet.
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3 justify-between">
          <button
            onClick={handlePrevious}
            disabled={step === 1 || isLoading}
            className="px-6 py-2 border border-gray-600 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="px-6 py-2 bg-white text-black font-semibold rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registering...' : 'Register on Story Protocol'}
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}
