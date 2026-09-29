'use client'

import { useAuthedUser, useRequireAuth } from '@/lib/hooks/useAuthedUser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { DemoBanner, WorldAppNote } from '@/components/DemoBanner'
import { ReplayRecordCard } from '@/components/ReplayRecordCard'
import {
  DEFAULT_REPLAY,
  DEMO_MODE,
  demoPause,
  formatReplayDate,
  pickReplay,
  type ReplayRecord,
} from '@/lib/demo'

const DURATION_OPTIONS = [
  { label: 'Snippet', seconds: 15 },
  { label: 'Short', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: 'Full', seconds: 180 },
]

const QUICK_STYLES = ['ambient', 'lo-fi', 'cinematic', 'jazz', 'folk', 'dark']

interface GenerationState {
  description: string
  style: string
  duration: number
  isGenerating: boolean
  generatedAudioUrl: string | null
  predictionId: string | null
  error: string | null
  imageFile: File | null
  imagePreviewUrl: string | null
  isDescribing: boolean
  momentDescription: string | null
  imageUrl: string | null
  suggestedStyle: string | null
  // Demo mode: the real past run whose photo description pre-filled the form, if any
  exampleReplay: ReplayRecord | null
  // Demo mode: the real past moment played back instead of a new generation
  replay: ReplayRecord | null
  replayMatched: boolean
  demoStage: string | null
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
  includeCoverArt: boolean
  // Demo mode: the flow reached its end and shows the replay's real registration
  demoComplete: boolean
  // Demo mode: registration needs World ID, and this browser is not World App
  needsWorldApp: boolean
}

// Demo mode lets anyone walk the flow; live mode keeps the original sign-in redirect.
const useGate = DEMO_MODE ? useAuthedUser : useRequireAuth

export default function CreatePage() {
  const router = useRouter()
  const { user, isLoading } = useGate()

  const [genState, setGenState] = useState<GenerationState>({
    description: '',
    style: '',
    duration: 30,
    isGenerating: false,
    generatedAudioUrl: null,
    predictionId: null,
    error: null,
    imageFile: null,
    imagePreviewUrl: null,
    isDescribing: false,
    momentDescription: null,
    imageUrl: null,
    suggestedStyle: null,
    exampleReplay: null,
    replay: null,
    replayMatched: false,
    demoStage: null,
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
    includeCoverArt: false,
    demoComplete: false,
    needsWorldApp: false,
  })

  const [audioPlayerKey, setAudioPlayerKey] = useState(0)

  // Demo mode: registration is paused, so the flow ends on the replay's real registration and
  // nothing is sent. Live mode: the original publish + IPFS + Story registration.
  const proceedWithRegistration = async (userId?: string) => {
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

    if (DEMO_MODE) {
      await demoPause(1200)
      setRegState((prev) => ({ ...prev, isRegistering: false, demoComplete: true }))
      return
    }

    try {
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId ?? '',
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
            cover_image_url: regState.includeCoverArt ? genState.imageUrl : null,
            moment_description: genState.momentDescription,
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


  // Handle World ID verification for seamless registration flow
  const handleVerifyForRegistration = async () => {
    try {
      if (!MiniKit.isInstalled() && !DEMO_MODE) {
        setRegState((prev) => ({
          ...prev,
          error: 'World App not detected. Please open this app in World App.',
        }))
        return
      }
      if (!MiniKit.isInstalled()) {
        // Outside World App there is no World ID. Explain that, then finish the demo anyway.
        if (!regState.title.trim()) {
          setRegState((prev) => ({ ...prev, error: 'Please name your moment' }))
          return
        }
        setRegState((prev) => ({ ...prev, needsWorldApp: true, demoComplete: true, error: null }))
        return
      }

      // Fetch a nonce from the backend
      const nonceResponse = await fetch('/api/nonce')
      if (!nonceResponse.ok) {
        setRegState((prev) => ({
          ...prev,
          error: 'Failed to generate verification nonce. Please try again.',
        }))
        return
      }

      const { nonce } = await nonceResponse.json()

      // Call MiniKit walletAuth with nonce for SIWE flow
      const walletResult = await MiniKit.walletAuth({
        nonce,
        statement: 'Sign in to verify your humanity and register music on the protocol.',
      })

      if (!walletResult.data || !('address' in walletResult.data)) {
        setRegState((prev) => ({
          ...prev,
          error: 'Wallet authentication failed. Please try again.',
        }))
        return
      }

      const { address, message, signature } = walletResult.data
      const orbVerified = MiniKit.user?.verificationStatus?.isOrbVerified || false

      // Send wallet auth proof to backend for verification
      const verifyResponse = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature,
          orb_verified: orbVerified,
          username: MiniKit.user?.username || 'creator',
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        setRegState((prev) => ({
          ...prev,
          error: errorData.error || 'Server verification failed.',
        }))
        return
      }

      const verifyData = await verifyResponse.json()

      // Store user data in localStorage and cookies
      localStorage.setItem('user_id', verifyData.userId)
      const userData = {
        world_wallet_address: verifyData.walletAddress,
        world_username: verifyData.username,
        orb_verified: verifyData.orbVerified,
      }
      localStorage.setItem('user_data', JSON.stringify(userData))
      document.cookie = `user_id=${encodeURIComponent(verifyData.userId)}; path=/; max-age=${7 * 24 * 60 * 60}`
      document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}`

      // Proceed immediately with registration using the verified data
      await proceedWithRegistration(verifyData.userId)
    } catch (error) {
      console.error('Verification error:', error)
      setRegState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred during verification.',
      }))
    }
  }

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
      // Resize image (demo mode: it stays in the browser as a preview; nothing is uploaded)
      const resizedBase64 = await resizeImage(file)

      // Show preview
      setGenState((prev) => ({
        ...prev,
        imagePreviewUrl: resizedBase64,
      }))

      if (DEMO_MODE) {
        // Demo mode: photo analysis (Claude) is paused. Pre-fill with the description ekos wrote
        // for a DIFFERENT photo during a real run, and say so right under the box.
        await demoPause(900)
        const example = DEFAULT_REPLAY

        setGenState((prev) => ({
          ...prev,
          description: example.photoDescription || '',
          style: example.style,
          momentDescription: example.photoDescription,
          suggestedStyle: example.style,
          exampleReplay: example,
          isDescribing: false,
        }))
      } else {
        const base64Data = resizedBase64.split(',')[1] // Remove data:image/jpeg;base64, prefix

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

        const { musicDescription, momentDescription, suggestedStyle, imageUrl } = await response.json()

        setGenState((prev) => ({
          ...prev,
          description: musicDescription,
          style: suggestedStyle,
          momentDescription,
          imageUrl,
          suggestedStyle,
          isDescribing: false,
        }))
      }

      // Auto-enable cover art toggle if image was uploaded
      setRegState((prev) => ({
        ...prev,
        includeCoverArt: true,
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
      <div className="flex items-center justify-center min-h-screen bg-[#fdfff8]">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    )
  }

  // Live mode keeps the original behaviour: signed-out visitors are redirected home.
  if (!DEMO_MODE && !user) {
    return null
  }

  const handleGenerateMusic = async () => {
    if (!genState.style.trim()) {
      setGenState((prev) => ({
        ...prev,
        error: 'Please select or enter a music style',
      }))
      return
    }

    setGenState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }))

    try {
      if (DEMO_MODE) {
        // Demo mode: music generation (Replicate) is paused. Walk through the real flow's stages,
        // clearly labelled, then play back a real moment made in the closest style.
        for (const stage of ['Demo: reading your description…', 'Demo: composing…', 'Demo: finding a real moment in your style…']) {
          setGenState((prev) => ({ ...prev, demoStage: stage }))
          await demoPause(900)
        }
        const { replay, matched } = pickReplay(genState.style)

        setGenState((prev) => ({
          ...prev,
          generatedAudioUrl: replay.audioUrl,
          replay,
          replayMatched: matched,
          demoStage: null,
          isGenerating: false,
        }))
      } else {
        // Create prediction
        const createResponse = await fetch('/api/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: genState.description,
            style: genState.style,
            duration: genState.duration,
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
      }

      // Reset audio player to allow re-play
      setAudioPlayerKey((prev) => prev + 1)

      // Auto-fill title with style
      setRegState((prev) => ({
        ...prev,
        title: `Moment — ${prev.title || genState.style}`,
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
    if (!user?.orb_verified) {
      // Trigger verification modal - it will proceed with registration after verification
      await handleVerifyForRegistration()
      return
    }

    // Already verified, proceed with registration
    const userId = user?.id
    if (!userId) {
      setRegState((prev) => ({
        ...prev,
        error: 'User not authenticated',
      }))
      return
    }

    await proceedWithRegistration(userId)
  }

  const handleGenerateAnother = () => {
    setGenState({
      description: '',
      style: '',
      duration: 30,
      isGenerating: false,
      generatedAudioUrl: null,
      predictionId: null,
      error: null,
      imageFile: null,
      imagePreviewUrl: null,
      isDescribing: false,
      momentDescription: null,
      imageUrl: null,
      suggestedStyle: null,
      exampleReplay: null,
      replay: null,
      replayMatched: false,
      demoStage: null,
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
      includeCoverArt: false,
      demoComplete: false,
      needsWorldApp: false,
    })
  }

  return (
    <div className="min-h-screen bg-[#fdfff8] text-[#1b1b1b] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {DEMO_MODE && <DemoBanner />}

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Create a Moment</h1>
          <p className="text-xl text-[#1b1b1b80]">
            Describe what you're experiencing. Choose your duration. AI will compose your Moment and register it on-chain as your IP.
          </p>
        </div>

        {/* Stage 1: Description & Generation */}
        {!genState.generatedAudioUrl ? (
          <div className="space-y-6 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8">
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
                    className="w-full px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] text-[#1b1b1b] text-sm font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
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
                    className="w-full px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] text-[#1b1b1b] text-sm font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
                  >
                    🖼️ Choose Photo
                  </button>
                </label>
              </div>
              <p className="text-xs text-[#1b1b1b80]">
                {DEMO_MODE
                  ? 'Demo mode: your photo stays on your device. It is not uploaded or analysed.'
                  : 'Your photo is analyzed by AI to generate music. It is not stored.'}
              </p>

              {/* Image Preview */}
              {genState.imagePreviewUrl && (
                <div className="mt-4">
                  <img
                    src={genState.imagePreviewUrl}
                    alt="Selected moment"
                    className="w-full h-40 object-cover rounded-lg border border-[#1b1b1b]"
                  />
                </div>
              )}

              {/* Describing state */}
              {genState.isDescribing && (
                <div className="mt-4 p-4 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce"></div>
                    <p className="text-sm text-[#1b1b1b]">
                      {DEMO_MODE ? 'Demo: loading an example description…' : 'Reading your photo...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#1b1b1b] pt-6">
              <label className="block text-sm font-semibold mb-3">
                What moment are you experiencing right now?
              </label>
              <textarea
                value={genState.description}
                onChange={(e) =>
                  setGenState((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="e.g., walking through rain at night, feeling contemplative and calm..."
                className="w-full h-24 px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#484947] focus:outline-none focus:border-[#1b1b1b]"
                disabled={genState.isGenerating}
              />
              {genState.exampleReplay &&
                genState.description === genState.exampleReplay.photoDescription && (
                  <p className="mt-2 text-xs leading-relaxed text-[#1b1b1b] border-l-2 border-[#1b1b1b] pl-3">
                    <span className="font-semibold">Example from a real run, not your photo.</span>{' '}
                    This is how ekos described a different photo — {genState.exampleReplay.photoGloss} —
                    on {formatReplayDate(genState.exampleReplay.createdAt)}. Photo analysis was paused
                    after the hackathon, so your photo was not read. Edit it or write your own.
                  </p>
                )}
            </div>

            {/* Style Input */}
            <div>
              <label className="block text-sm font-semibold mb-3">
                What style of music?
                {genState.suggestedStyle && (DEMO_MODE ? genState.style === genState.suggestedStyle : true) && (
                  <span className="text-xs text-[#1b1b1b] ml-2">
                    {DEMO_MODE ? 'from the same real-run example' : '✨ AI suggested'}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={genState.style}
                onChange={(e) =>
                  setGenState((prev) => ({ ...prev, style: e.target.value }))
                }
                placeholder="e.g., hyperpop, dark ambient, jazz fusion, lo-fi..."
                className="w-full px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#484947] focus:outline-none focus:border-[#1b1b1b] mb-4"
                disabled={genState.isGenerating}
              />

              {/* Quick Style Picks */}
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_STYLES.map((qStyle) => (
                  <button
                    key={qStyle}
                    onClick={() =>
                      setGenState((prev) => ({ ...prev, style: qStyle }))
                    }
                    disabled={genState.isGenerating}
                    className={`px-3 py-2 rounded-full text-xs font-semibold transition ${
                      genState.style.toLowerCase() === qStyle.toLowerCase()
                        ? 'bg-[#1b1b1b] text-[#fdfff8] rounded-lg hover:opacity-80'
                        : 'bg-[#fdfff8] text-[#1b1b1b80] border border-[#1b1b1b] hover:opacity-80'
                    } disabled:opacity-50`}
                  >
                    {qStyle}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-sm font-semibold mb-3">Duration:</label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() =>
                      setGenState((prev) => ({ ...prev, duration: opt.seconds }))
                    }
                    disabled={genState.isGenerating}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      genState.duration === opt.seconds
                        ? 'bg-[#1b1b1b] text-[#fdfff8] hover:opacity-80'
                        : 'bg-[#fdfff8] text-[#1b1b1b80] border border-[#1b1b1b] hover:opacity-80'
                    } disabled:opacity-50`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {genState.error && (
              <div className="bg-[#ff2e00]/10 border border-[#ff2e00] rounded-lg p-4 text-[#ff2e00] text-sm">
                {genState.error}
              </div>
            )}

            <button
              onClick={handleGenerateMusic}
              disabled={!genState.description.trim() || !genState.style.trim() || genState.isGenerating}
              className="w-full py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {genState.isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#fdfff8] rounded-full animate-bounce"></div>
                  {DEMO_MODE ? genState.demoStage || 'Demo: composing…' : 'Composing your moment...'}
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
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8 space-y-4">
              {genState.replay ? (
                <>
                  <p className="text-xs font-mono uppercase text-[#1b1b1b80]">Replay · real past result</p>
                  <h2 className="text-2xl font-bold">A real moment from when ekos was live</h2>
                </>
              ) : (
                <h2 className="text-2xl font-bold">Your Moment is Ready</h2>
              )}
              {genState.replay && (
                <p className="text-sm leading-relaxed text-[#1b1b1b]">
                  This was <span className="font-semibold">not made from your input</span>{' '}— live
                  generation is paused. You asked for &ldquo;{genState.style}&rdquo;;{' '}
                  {genState.replayMatched
                    ? 'the closest real example is'
                    : 'none of the saved examples is close, so here is'}{' '}
                  &ldquo;{genState.replay.title}&rdquo;, composed by ekos on{' '}
                  {formatReplayDate(genState.replay.createdAt)}{' '}for someone else&apos;s photo.
                </p>
              )}
              {genState.replay?.coverUrl && (
                <img
                  src={genState.replay.coverUrl}
                  alt={`The photo behind ${genState.replay.title}`}
                  className="w-full h-48 object-cover rounded-lg border border-[#1b1b1b]"
                />
              )}
              <audio
                key={audioPlayerKey}
                controls
                src={genState.generatedAudioUrl}
                className="w-full"
              />
              {!genState.replay && (
                <p className="text-sm text-[#1b1b1b80]">
                  AI-generated audio Moment from your description
                </p>
              )}
              {genState.replay?.photoDescription && (
                <p className="text-sm text-[#1b1b1b80]">
                  What ekos saw in that photo: {genState.replay.photoDescription}
                </p>
              )}
            </div>

            {/* Registration Form */}
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8 space-y-6">
              <h2 className="text-2xl font-bold">Register This Moment</h2>

              {/* Cover Art Section */}
              {(DEMO_MODE ? genState.imagePreviewUrl : genState.imageUrl && genState.imagePreviewUrl) && (
                <div className="space-y-3">
                  <img
                    src={genState.imagePreviewUrl ?? undefined}
                    alt="Moment cover"
                    className="w-full h-48 object-cover rounded-lg border border-[#1b1b1b]"
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regState.includeCoverArt}
                      onChange={(e) =>
                        setRegState((prev) => ({
                          ...prev,
                          includeCoverArt: e.target.checked,
                        }))
                      }
                      disabled={regState.isRegistering}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold">
                      {DEMO_MODE ? 'Use your photo as cover art (it stays on your device)' : 'Use this photo as cover art'}
                    </span>
                  </label>
                </div>
              )}

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
                  className="w-full px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#484947] focus:outline-none focus:border-[#1b1b1b] disabled:opacity-50"
                />
              </div>

              {/* AI Origin Disclosure */}
              <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-4">
                <p className="text-sm text-[#1b1b1b]">
                  <span className="font-semibold">AI-Generated:</span>{' '}
                  {DEMO_MODE
                    ? "In the live build, a moment like this was registered on-chain as AI-generated, authored by its creator as a verified human. The moment description and vibe choice were the creator's contribution."
                    : 'This moment will be registered on-chain as AI-generated, authored by you as a verified human. The unique moment description and vibe choice are your creative contribution.'}
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
                    <p className="text-xs text-[#1b1b1b80]">
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
                        className="mt-2 w-full px-3 py-2 bg-[#fdfff8] border border-[#1b1b1b] rounded text-sm text-[#1b1b1b]"
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
                    <p className="text-xs text-[#1b1b1b80]">
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
                        className="mt-2 w-full px-3 py-2 bg-[#fdfff8] border border-[#1b1b1b] rounded text-sm text-[#1b1b1b]"
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
                    <p className="text-xs text-[#1b1b1b80]">
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
                        className="mt-2 w-full px-3 py-2 bg-[#fdfff8] border border-[#1b1b1b] rounded text-sm text-[#1b1b1b]"
                      />
                    )}
                  </div>
                </label>
              </div>

              {regState.error && (
                <div className="bg-[#ff2e00]/10 border border-[#ff2e00] rounded-lg p-4 text-[#ff2e00] text-sm">
                  {regState.error}
                </div>
              )}

              {regState.demoComplete && genState.replay && (
                <div className="space-y-4">
                  {regState.needsWorldApp && <WorldAppNote action="Registering" />}
                  <ReplayRecordCard
                    replay={genState.replay}
                    heading="Here's the registration this moment really got"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!regState.demoComplete && (
                  <button
                    onClick={handleRegisterMoment}
                    disabled={!regState.title.trim() || regState.isRegistering}
                    className="flex-1 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
                  >
                    {regState.isRegistering ? (DEMO_MODE ? 'Demo: registering…' : 'Registering...') : 'Register this Moment →'}
                  </button>
                )}
                <button
                  onClick={handleGenerateAnother}
                  disabled={regState.isRegistering}
                  className="flex-1 py-4 bg-[#fdfff8] border border-[#1b1b1b] text-[#1b1b1b] font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
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
