'use client'

import { useRequireAuth } from '@/lib/hooks/useAuthedUser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Vibe = 'ambient' | 'lofi' | 'cinematic' | 'upbeat' | 'ethereal'

interface GenerationState {
  description: string
  vibe: Vibe
  isGenerating: boolean
  generatedAudioUrl: string | null
  predictionId: string | null
  error: string | null
  imageFile: File | null
  imagePreviewUrl: string | null
  isDescribing: boolean
}

interface RegistrationState {
  title: string
  aiTrainingAllowed: boolean
  aiTrainingPrice: number | null
  syncAllowed: boolean
  syncPrice: number | null
  commercialUseAllowed: boolean
  commercialUseRevShare: number
  isRegistering: boolean
  error: string | null
}

export default function CreatePage() {
  const router = useRouter()
  const { user, isLoading } = useRequireAuth()

  const [genState, setGenState] = useState<GenerationState>({
    description: '',
    vibe: 'ambient',
    isGenerating: false,
    generatedAudioUrl: null,
    predictionId: null,
    error: null,
    imageFile: null,
    imagePreviewUrl: null,
    isDescribing: false,
  })

  const [regState, setRegState] = useState<RegistrationState>({
    title: '',
    aiTrainingAllowed: false,
    aiTrainingPrice: null,
    syncAllowed: false,
    syncPrice: null,
    commercialUseAllowed: false,
    commercialUseRevShare: 0,
    isRegistering: false,
    error: null,
  })

  const [audioPlayerKey, setAudioPlayerKey] = useState(0)

  // Resize image client-side before uploading
  const resizeImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Resize to max 1024px
          const maxSize = 1024
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  // Handle image selection
  const handleImageSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setGenState((prev) => ({
        ...prev,
        error: 'Please select an image file',
      }))
      return
    }

    setGenState((prev) => ({
      ...prev,
      imageFile: file,
      isDescribing: true,
      error: null,
    }))

    try {
      // Resize image
      const resizedBase64 = await resizeImage(file)
      const base64Data = resizedBase64.split(',')[1] // Remove data:image/jpeg;base64, prefix

      // Show preview
      setGenState((prev) => ({
        ...prev,
        imagePreviewUrl: resizedBase64,
      }))

      // Call describe-image API
      const response = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: file.type || 'image/jpeg',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }

      const { description } = await response.json()

      setGenState((prev) => ({
        ...prev,
        description,
        isDescribing: false,
      }))
    } catch (error) {
      console.error('Image analysis error:', error)
      setGenState((prev) => ({
        ...prev,
        isDescribing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze image',
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleGenerateMusic = async () => {
    setGenState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }))

    try {
      // Create prediction
      const createResponse = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: genState.description,
          vibe: genState.vibe,
        }),
      })

      if (!createResponse.ok) {
        throw new Error('Failed to start music generation')
      }

      const { predictionId } = await createResponse.json()
      setGenState((prev) => ({ ...prev, predictionId }))

      // Poll for status
      let isComplete = false
      let audioUrl: string | null = null
      let pollCount = 0
      const maxPolls = 100 // ~300 seconds max wait

      while (!isComplete && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 3000)) // Poll every 3s
        pollCount++

        const statusResponse = await fetch(
          `/api/generate-music/status?id=${predictionId}`
        )

        if (!statusResponse.ok) {
          throw new Error('Failed to check generation status')
        }

        const statusData = await statusResponse.json()

        if (statusData.status === 'succeeded') {
          audioUrl = statusData.audioUrl
          isComplete = true
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Music generation failed')
        }
      }

      if (!isComplete) {
        throw new Error('Music generation timed out')
      }

      setGenState((prev) => ({
        ...prev,
        generatedAudioUrl: audioUrl,
        isGenerating: false,
      }))

      // Reset audio player to allow re-play
      setAudioPlayerKey((prev) => prev + 1)

      // Auto-fill title with vibe
      setRegState((prev) => ({
        ...prev,
        title: `Moment — ${prev.title || genState.vibe}`,
      }))
    } catch (error) {
      console.error('Generation error:', error)
      setGenState((prev) => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }))
    }
  }

  const handleRegisterMoment = async () => {
    if (!genState.generatedAudioUrl) {
      setRegState((prev) => ({
        ...prev,
        error: 'No audio to register',
      }))
      return
    }

    if (!regState.title.trim()) {
      setRegState((prev) => ({
        ...prev,
        error: 'Please name your moment',
      }))
      return
    }

    setRegState((prev) => ({
      ...prev,
      isRegistering: true,
      error: null,
    }))

    try {
      const userId = localStorage.getItem('user_id')

      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({
          audio_url: genState.generatedAudioUrl,
          metadata: {
            title: regState.title,
            ai_origin: 'ai_generated',
            ai_training_allowed: regState.aiTrainingAllowed,
            ai_training_price_usd: regState.aiTrainingPrice,
            sync_allowed: regState.syncAllowed,
            sync_price_usd: regState.syncPrice,
            commercial_use_allowed: regState.commercialUseAllowed,
            commercial_use_revenue_share_pct: regState.commercialUseRevShare,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }

      const result = await response.json()
      router.push(`/track/${result.trackId}`)
    } catch (error) {
      console.error('Registration error:', error)
      setRegState((prev) => ({
        ...prev,
        isRegistering: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }))
    }
  }

  const handleGenerateAnother = () => {
    setGenState({
      description: '',
      vibe: 'ambient',
      isGenerating: false,
      generatedAudioUrl: null,
      predictionId: null,
      error: null,
      imageFile: null,
      imagePreviewUrl: null,
      isDescribing: false,
    })
    setRegState({
      title: '',
      aiTrainingAllowed: false,
      aiTrainingPrice: null,
      syncAllowed: false,
      syncPrice: null,
      commercialUseAllowed: false,
      commercialUseRevShare: 0,
      isRegistering: false,
      error: null,
    })
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Create a Moment</h1>
          <p className="text-xl text-gray-300">
            Describe what you're experiencing. AI will compose a 12-second sketch. Register it on-chain as your IP.
          </p>
        </div>

        {/* Stage 1: Description & Generation */}
        {!genState.generatedAudioUrl ? (
          <div className="space-y-6 bg-gray-900/50 border border-gray-800 rounded-lg p-8">
            {/* Image Input Section */}
            <div>
              <label className="block text-sm font-semibold mb-3">
                Or snap a moment (optional)
              </label>
              <div className="flex gap-3 mb-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(file)
                    }}
                    disabled={genState.isDescribing || genState.isGenerating}
                    className="hidden"
                  />
                  <button
                    onClick={(e) => {
                      e.currentTarget.parentElement?.querySelector('input')?.click()
                    }}
                    disabled={genState.isDescribing || genState.isGenerating}
                    className="w-full px-4 py-3 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    📷 Take a Photo
                  </button>
                </label>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(file)
                    }}
                    disabled={genState.isDescribing || genState.isGenerating}
                    className="hidden"
                  />
                  <button
                    onClick={(e) => {
                      e.currentTarget.parentElement?.querySelector('input')?.click()
                    }}
                    disabled={genState.isDescribing || genState.isGenerating}
                    className="w-full px-4 py-3 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    🖼️ Choose Photo
                  </button>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Your photo is analyzed by AI to generate music. It is not stored.
              </p>

              {/* Image Preview */}
              {genState.imagePreviewUrl && (
                <div className="mt-4">
                  <img
                    src={genState.imagePreviewUrl}
                    alt="Selected moment"
                    className="w-full h-40 object-cover rounded-lg border border-gray-700"
                  />
                </div>
              )}

              {/* Describing state */}
              {genState.isDescribing && (
                <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <p className="text-sm text-purple-300">Reading your photo...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-semibold mb-3">
                What moment are you experiencing right now?
              </label>
              <textarea
                value={genState.description}
                onChange={(e) =>
                  setGenState((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="e.g., walking through rain at night, feeling contemplative and calm..."
                className="w-full h-24 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                disabled={genState.isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3">Pick a vibe:</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(['ambient', 'lofi', 'cinematic', 'upbeat', 'ethereal'] as Vibe[]).map(
                  (vibe) => (
                    <button
                      key={vibe}
                      onClick={() =>
                        setGenState((prev) => ({ ...prev, vibe }))
                      }
                      disabled={genState.isGenerating}
                      className={`px-3 py-2 rounded-full text-sm font-semibold transition-all ${
                        genState.vibe === vibe
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      } disabled:opacity-50`}
                    >
                      {vibe}
                    </button>
                  )
                )}
              </div>
            </div>

            {genState.error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-300 text-sm">
                {genState.error}
              </div>
            )}

            <button
              onClick={handleGenerateMusic}
              disabled={!genState.description.trim() || genState.isGenerating}
              className="w-full py-4 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {genState.isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  Composing your moment...
                </span>
              ) : (
                'Generate My Moment →'
              )}
            </button>
          </div>
        ) : (
          /* Stage 2: Preview & Registration */
          <div className="space-y-6">
            {/* Audio Player */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 space-y-4">
              <h2 className="text-2xl font-bold">Your Moment is Ready</h2>
              <audio
                key={audioPlayerKey}
                controls
                src={genState.generatedAudioUrl}
                className="w-full"
              />
              <p className="text-sm text-gray-400">
                AI-generated 12-second audio sketch from your moment description
              </p>
            </div>

            {/* Registration Form */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 space-y-6">
              <h2 className="text-2xl font-bold">Register This Moment</h2>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold mb-2">Moment Name *</label>
                <input
                  type="text"
                  value={regState.title}
                  onChange={(e) =>
                    setRegState((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Rainy Night"
                  disabled={regState.isRegistering}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                />
              </div>

              {/* AI Origin Disclosure */}
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                <p className="text-sm text-purple-300">
                  <span className="font-semibold">AI-Generated:</span> This moment will be registered on-chain as AI-generated, authored by you as a verified human. The unique moment description and vibe choice are your creative contribution.
                </p>
              </div>

              {/* License Terms */}
              <div className="space-y-4">
                <p className="text-sm font-semibold">License Terms (optional):</p>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={regState.aiTrainingAllowed}
                    onChange={(e) =>
                      setRegState((prev) => ({
                        ...prev,
                        aiTrainingAllowed: e.target.checked,
                      }))
                    }
                    disabled={regState.isRegistering}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold">Allow AI Training</p>
                    <p className="text-xs text-gray-400">
                      AI companies can use this for model training
                    </p>
                    {regState.aiTrainingAllowed && (
                      <input
                        type="number"
                        value={regState.aiTrainingPrice ?? ''}
                        onChange={(e) =>
                          setRegState((prev) => ({
                            ...prev,
                            aiTrainingPrice: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          }))
                        }
                        placeholder="Price in USD"
                        min="0"
                        disabled={regState.isRegistering}
                        className="mt-2 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={regState.syncAllowed}
                    onChange={(e) =>
                      setRegState((prev) => ({
                        ...prev,
                        syncAllowed: e.target.checked,
                      }))
                    }
                    disabled={regState.isRegistering}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold">Allow Sync Licensing</p>
                    <p className="text-xs text-gray-400">
                      Use in videos, films, ads, games
                    </p>
                    {regState.syncAllowed && (
                      <input
                        type="number"
                        value={regState.syncPrice ?? ''}
                        onChange={(e) =>
                          setRegState((prev) => ({
                            ...prev,
                            syncPrice: e.target.value ? parseInt(e.target.value) : null,
                          }))
                        }
                        placeholder="Price in USD"
                        min="0"
                        disabled={regState.isRegistering}
                        className="mt-2 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={regState.commercialUseAllowed}
                    onChange={(e) =>
                      setRegState((prev) => ({
                        ...prev,
                        commercialUseAllowed: e.target.checked,
                      }))
                    }
                    disabled={regState.isRegistering}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold">Allow Commercial Use</p>
                    <p className="text-xs text-gray-400">
                      Use for commercial projects
                    </p>
                    {regState.commercialUseAllowed && (
                      <input
                        type="number"
                        value={regState.commercialUseRevShare}
                        onChange={(e) =>
                          setRegState((prev) => ({
                            ...prev,
                            commercialUseRevShare: parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="Revenue share %"
                        min="0"
                        max="100"
                        disabled={regState.isRegistering}
                        className="mt-2 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                      />
                    )}
                  </div>
                </label>
              </div>

              {regState.error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-300 text-sm">
                  {regState.error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleRegisterMoment}
                  disabled={!regState.title.trim() || regState.isRegistering}
                  className="flex-1 py-4 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {regState.isRegistering ? 'Registering...' : 'Register this Moment →'}
                </button>
                <button
                  onClick={handleGenerateAnother}
                  disabled={regState.isRegistering}
                  className="flex-1 py-4 bg-gray-800 text-white font-semibold rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
