'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const DURATION_OPTIONS = [
  { label: 'Snippet', seconds: 15 },
  { label: 'Short', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: 'Full', seconds: 180 },
]

const QUICK_STYLES = ['ambient', 'lo-fi', 'cinematic', 'jazz', 'folk', 'dark']

/** What /api/grants hands back: a grant plus its derived status. */
interface GrantSummary {
  id: string
  grantor_display_name: string
  is_test: boolean
  status: 'active' | 'pending' | 'expired' | 'revoked'
  terms_version: string
  may_train: boolean
  may_condition: boolean
  may_invoke_style: boolean
  may_distribute_commercially: boolean
  use_tier: string
  rate_instrument: string
  revocable: boolean
  revocation_notice_days: number
  output_survival_rule: string
  attribution_text: string | null
  scope_specificity_text: string
}

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
  /** Whose terms this generation runs under. Required — nothing generates ungated. */
  /** Which engine makes the audio: the hosted model, or the in-browser palette. */
  engine: 'replicate_stable_audio' | 'palette'
  /** Palette engine only: the local file, which never leaves the browser. */
  audioFile: File | null
  paletteVoices: string[] | null
  grantId: string | null
  /** The ledger row for this attempt, authorized or denied. */
  receiptId: string | null
  denialReason: string | null
}

interface RegistrationState {
  title: string
  isRegistering: boolean
  error: string | null
  includeCoverArt: boolean
}

export default function CreatePage() {
  const router = useRouter()

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
    engine: 'replicate_stable_audio',
    audioFile: null,
    paletteVoices: null,
    grantId: null,
    receiptId: null,
    denialReason: null,
  })

  const [regState, setRegState] = useState<RegistrationState>({
    title: '',
    isRegistering: false,
    error: null,
    includeCoverArt: false,
  })

  const [audioPlayerKey, setAudioPlayerKey] = useState(0)
  const [grants, setGrants] = useState<GrantSummary[]>([])
  const [showTerms, setShowTerms] = useState(false)
  const [receiptJson, setReceiptJson] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/grants')
      .then((r) => (r.ok ? r.json() : { grants: [] }))
      .then((d) => setGrants(d.grants || []))
      .catch(() => setGrants([]))
  }, [])

  const chosenGrant = grants.find((g) => g.id === genState.grantId) || null

  // Fetch the receipt behind whatever just happened — authorized or denied. Seeing the record
  // is the point of having one.
  const viewReceipt = async () => {
    if (!genState.receiptId) return
    if (receiptJson) {
      setReceiptJson(null)
      return
    }
    const res = await fetch(`/api/receipts/${genState.receiptId}`)
    const data = await res.json().catch(() => null)
    setReceiptJson(data ? JSON.stringify(data, null, 2) : 'Could not load receipt')
  }

  // Publish the generated moment. Identity comes from the auth session (cookie),
  // so no user id is passed here — the /create route is gated by the proxy.
  const publishMoment = async () => {
    if (!genState.generatedAudioUrl) {
      setRegState((prev) => ({ ...prev, error: 'No audio to publish' }))
      return
    }
    if (!regState.title.trim()) {
      setRegState((prev) => ({ ...prev, error: 'Please name your moment' }))
      return
    }

    setRegState((prev) => ({ ...prev, isRegistering: true, error: null }))

    try {
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: genState.generatedAudioUrl,
          metadata: {
            title: regState.title,
            ai_origin: 'ai_generated',
            duration_seconds: genState.duration,
            genre: genState.style,
            cover_image_url: regState.includeCoverArt ? genState.imageUrl : null,
            moment_description: genState.momentDescription,
            receipt_id: genState.receiptId,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          router.push('/login?redirect=/create')
          return
        }
        throw new Error(errorData.error || 'Publishing failed')
      }

      const result = await response.json()
      router.push(`/track/${result.trackId}`)
    } catch (error) {
      console.error('Publish error:', error)
      setRegState((prev) => ({
        ...prev,
        isRegistering: false,
        error: error instanceof Error ? error.message : 'An error occurred',
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

  // Handle image selection → AI description
  const handleImageSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setGenState((prev) => ({ ...prev, error: 'Please select an image file' }))
      return
    }

    setGenState((prev) => ({ ...prev, imageFile: file, isDescribing: true, error: null }))

    try {
      const resizedBase64 = await resizeImage(file)
      const base64Data = resizedBase64.split(',')[1]

      setGenState((prev) => ({ ...prev, imagePreviewUrl: resizedBase64 }))

      // resizeImage() always re-encodes to JPEG, so the declared mimeType must be JPEG too
      // (sending the original file.type, e.g. image/png, makes Claude reject the base64 mismatch).
      const response = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mimeType: 'image/jpeg' }),
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

      setRegState((prev) => ({ ...prev, includeCoverArt: true }))
    } catch (error) {
      console.error('Image analysis error:', error)
      setGenState((prev) => ({
        ...prev,
        isDescribing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze image',
      }))
    }
  }

  // The palette path: authorize, render in this browser, then report the spec that did it.
  // The file is never uploaded — only the ~800 bytes describing which instruments it pointed at.
  const handleGeneratePalette = async () => {
    if (!genState.grantId) {
      setGenState((prev) => ({ ...prev, error: 'Choose whose terms this runs under' }))
      return
    }
    if (!genState.audioFile) {
      setGenState((prev) => ({ ...prev, error: 'Choose an audio file first' }))
      return
    }

    setReceiptJson(null)
    setGenState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
      receiptId: null,
      denialReason: null,
      paletteVoices: null,
    }))

    let receiptId: string | null = null
    try {
      const authRes = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: genState.description || 'palette render',
          style: genState.style || 'from a recording',
          duration: genState.duration,
          grant_id: genState.grantId,
          engine: 'palette',
          use_tier: 'personal',
        }),
      })
      const authBody = await authRes.json().catch(() => ({}))
      if (!authRes.ok) {
        if (authRes.status === 401) {
          router.push('/login?redirect=/create')
          return
        }
        setGenState((prev) => ({
          ...prev,
          isGenerating: false,
          error: authBody.error || 'Could not start',
          receiptId: authBody.receiptId || null,
          denialReason: authBody.denialReason || null,
        }))
        return
      }
      receiptId = authBody.receiptId
      setGenState((prev) => ({ ...prev, receiptId }))

      // Loaded only now, so the ~112 KB engine is not in the initial bundle.
      const { runPalette } = await import('@/lib/palette/run')
      const result = await runPalette(genState.audioFile, genState.duration)

      const done = await fetch(`/api/receipts/${receiptId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'succeeded',
          spec: result.spec,
          output_sha256: result.outputSha256,
          source_sha256: result.sourceSha256,
          source_name: result.sourceName,
          source_bytes: result.sourceBytes,
        }),
      })
      if (!done.ok) {
        const body = await done.json().catch(() => ({}))
        throw new Error(body.error || 'Could not record the render')
      }

      setGenState((prev) => ({
        ...prev,
        isGenerating: false,
        generatedAudioUrl: URL.createObjectURL(result.wav),
        paletteVoices: result.voiceNames,
      }))
      setAudioPlayerKey((prev) => prev + 1)
      setRegState((prev) => ({
        ...prev,
        title: prev.title || `Moment — ${genState.audioFile?.name?.replace(/\.[^.]+$/, '') || 'from a recording'}`,
      }))
    } catch (error) {
      // Tell the server the attempt failed, so the receipt closes honestly rather than
      // sitting open forever.
      if (receiptId) {
        fetch(`/api/receipts/${receiptId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outcome: 'failed',
            error: error instanceof Error ? error.message : 'Client render failed',
          }),
        }).catch(() => {})
      }
      setGenState((prev) => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Render failed',
      }))
    }
  }

  const handleGenerateMusic = async () => {
    if (!genState.style.trim()) {
      setGenState((prev) => ({ ...prev, error: 'Please select or enter a music style' }))
      return
    }
    if (!genState.grantId) {
      setGenState((prev) => ({ ...prev, error: 'Choose whose terms this runs under' }))
      return
    }

    setReceiptJson(null)
    setGenState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
      receiptId: null,
      denialReason: null,
    }))

    try {
      const createResponse = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: genState.description,
          style: genState.style,
          duration: genState.duration,
          grant_id: genState.grantId,
          use_tier: 'personal',
        }),
      })

      if (!createResponse.ok) {
        const body = await createResponse.json().catch(() => ({}))
        if (createResponse.status === 401) {
          router.push('/login?redirect=/create')
          return
        }
        // 403 is the permission check refusing. It is not an error in the app — it is the
        // architecture working, and it comes with a receipt.
        setGenState((prev) => ({
          ...prev,
          isGenerating: false,
          error: body.error || 'Failed to start music generation',
          receiptId: body.receiptId || null,
          denialReason: body.denialReason || null,
        }))
        return
      }

      const { predictionId, receiptId } = await createResponse.json()
      setGenState((prev) => ({ ...prev, predictionId, receiptId }))

      let isComplete = false
      let audioUrl: string | null = null
      let pollCount = 0
      const maxPolls = 100 // ~300 seconds max wait

      while (!isComplete && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        pollCount++

        const statusResponse = await fetch(`/api/generate-music/status?id=${predictionId}`)
        if (!statusResponse.ok) {
          throw new Error('Failed to check generation status')
        }

        const statusData = await statusResponse.json()
        if (statusData.receiptId) {
          setGenState((prev) => ({ ...prev, receiptId: statusData.receiptId }))
        }
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

      setGenState((prev) => ({ ...prev, generatedAudioUrl: audioUrl, isGenerating: false }))
      setAudioPlayerKey((prev) => prev + 1)
      setRegState((prev) => ({ ...prev, title: prev.title || `Moment — ${genState.style}` }))
    } catch (error) {
      console.error('Generation error:', error)
      setGenState((prev) => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }))
    }
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
      engine: genState.engine, // keep the chosen engine too
      audioFile: null,
      paletteVoices: null,
      grantId: genState.grantId, // keep the chosen terms; only the moment resets
      receiptId: null,
      denialReason: null,
    })
    setRegState({ title: '', isRegistering: false, error: null, includeCoverArt: false })
  }

  return (
    <div className="min-h-screen bg-[#fdfff8] text-[#1b1b1b] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Create a Moment</h1>
          <p className="text-xl text-[#1b1b1b80]">
            Snap a photo or describe what you&apos;re feeling. Choose a style and length. AI composes
            an original moment you can publish and stream.
          </p>
        </div>

        {/* Stage 1: Description & Generation */}
        {!genState.generatedAudioUrl ? (
          <div className="space-y-6 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8">
            {/* Image Input Section */}
            <div>
              <label className="block text-sm font-semibold mb-3">Or snap a moment (optional)</label>
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
                Your photo is analyzed by AI to shape the music and can become the cover art.
              </p>

              {genState.imagePreviewUrl && (
                <div className="mt-4">
                  <img
                    src={genState.imagePreviewUrl}
                    alt="Selected moment"
                    className="w-full h-40 object-cover rounded-lg border border-[#1b1b1b]"
                  />
                </div>
              )}

              {genState.isDescribing && (
                <div className="mt-4 p-4 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce"></div>
                    <p className="text-sm text-[#1b1b1b]">Reading your photo...</p>
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
                onChange={(e) => setGenState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., walking through rain at night, feeling contemplative and calm..."
                className="w-full h-24 px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#484947] focus:outline-none focus:border-[#1b1b1b]"
                disabled={genState.isGenerating}
              />
            </div>

            {/* Style Input */}
            <div>
              <label className="block text-sm font-semibold mb-3">
                What style of music?
                {genState.suggestedStyle && (
                  <span className="text-xs text-[#1b1b1b] ml-2">✨ AI suggested</span>
                )}
              </label>
              <input
                type="text"
                value={genState.style}
                onChange={(e) => setGenState((prev) => ({ ...prev, style: e.target.value }))}
                placeholder="e.g., hyperpop, dark ambient, jazz fusion, lo-fi..."
                className="w-full px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#484947] focus:outline-none focus:border-[#1b1b1b] mb-4"
                disabled={genState.isGenerating}
              />

              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_STYLES.map((qStyle) => (
                  <button
                    key={qStyle}
                    onClick={() => setGenState((prev) => ({ ...prev, style: qStyle }))}
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

            {/* How the audio gets made. Two engines, two pathways: the hosted model invokes a
                style; the palette conditions on a recording you already have. */}
            <div>
              <label className="block text-sm font-semibold mb-3">How should it be made?</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  ['replicate_stable_audio', 'a model, from your words'],
                  ['palette', 'your own audio file'],
                ] as const).map(([kind, label]) => (
                  <button
                    key={kind}
                    onClick={() =>
                      setGenState((prev) => ({
                        ...prev,
                        engine: kind,
                        error: null,
                        receiptId: null,
                        denialReason: null,
                      }))
                    }
                    disabled={genState.isGenerating}
                    className={`px-3 py-2 rounded-full text-xs font-semibold transition ${
                      genState.engine === kind
                        ? 'bg-[#1b1b1b] text-[#fdfff8] hover:opacity-80'
                        : 'bg-[#fdfff8] text-[#1b1b1b80] border border-[#1b1b1b] hover:opacity-80'
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {genState.engine === 'palette' && (
                <div className="p-4 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg space-y-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setGenState((prev) => ({ ...prev, audioFile: f, error: null }))
                    }}
                    disabled={genState.isGenerating}
                    className="w-full text-xs"
                  />
                  <p className="text-xs text-[#484947]">
                    Measured in your browser and discarded. The file is never uploaded — the
                    receipt records only the instruments the measurements pointed at.
                  </p>
                  {genState.audioFile && (
                    <p className="text-xs font-semibold">
                      {genState.audioFile.name} ·{' '}
                      {(genState.audioFile.size / 1048576).toFixed(1)} MB
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Whose terms — the permission check happens against whatever is chosen here */}
            <div>
              <label className="block text-sm font-semibold mb-3">Whose terms?</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {grants.map((g) => {
                  const selected = genState.grantId === g.id
                  const suffix =
                    g.status !== 'active' ? ` · ${g.status}` : g.is_test ? ' · TEST' : ''
                  return (
                    <button
                      key={g.id}
                      onClick={() =>
                        setGenState((prev) => ({
                          ...prev,
                          grantId: g.id,
                          error: null,
                          receiptId: null,
                          denialReason: null,
                        }))
                      }
                      disabled={genState.isGenerating}
                      className={`px-3 py-2 rounded-full text-xs font-semibold transition ${
                        selected
                          ? 'bg-[#1b1b1b] text-[#fdfff8] hover:opacity-80'
                          : 'bg-[#fdfff8] text-[#1b1b1b80] border border-[#1b1b1b] hover:opacity-80'
                      } disabled:opacity-50`}
                    >
                      {g.grantor_display_name}
                      {suffix}
                    </button>
                  )
                })}
                {grants.length === 0 && (
                  <p className="text-xs text-[#484947]">
                    No grants yet. Run the Track A seed to add the two test grants.
                  </p>
                )}
              </div>

              {chosenGrant && (
                <>
                  <button
                    onClick={() => setShowTerms((v) => !v)}
                    className="text-xs font-semibold underline text-[#1b1b1b] hover:opacity-70"
                  >
                    {showTerms ? 'Hide terms' : 'See terms'}
                  </button>

                  {showTerms && (
                    <div className="mt-3 p-4 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-xs space-y-2">
                      <p className="font-semibold">
                        {chosenGrant.grantor_display_name} · v{chosenGrant.terms_version} ·{' '}
                        {chosenGrant.status}
                      </p>
                      <p className="text-[#484947]">{chosenGrant.scope_specificity_text}</p>
                      <ul className="space-y-1">
                        <li>{chosenGrant.may_train ? '✓' : '✕'} may train a model</li>
                        <li>{chosenGrant.may_condition ? '✓' : '✕'} may condition on a recording</li>
                        <li>{chosenGrant.may_invoke_style ? '✓' : '✕'} may invoke the style</li>
                        <li>
                          {chosenGrant.may_distribute_commercially ? '✓' : '✕'} may distribute
                          commercially
                        </li>
                      </ul>
                      <p>
                        Use tier: {chosenGrant.use_tier} · Rate: {chosenGrant.rate_instrument}
                      </p>
                      <p>
                        {chosenGrant.revocable
                          ? `Revocable, ${chosenGrant.revocation_notice_days} days notice`
                          : 'Not revocable'}{' '}
                        · Already-made outputs: {chosenGrant.output_survival_rule.replace(/_/g, ' ')}
                      </p>
                      {chosenGrant.attribution_text && (
                        <p className="text-[#484947]">Credit: {chosenGrant.attribution_text}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-sm font-semibold mb-3">Duration:</label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() => setGenState((prev) => ({ ...prev, duration: opt.seconds }))}
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
              <div className="bg-[#ff2e00]/10 border border-[#ff2e00] rounded-lg p-4 text-[#ff2e00] text-sm space-y-2">
                <p>{genState.error}</p>
                {genState.receiptId && (
                  <p className="text-xs">
                    {genState.denialReason && (
                      <span className="font-semibold">
                        Refused: {genState.denialReason.replace(/_/g, ' ')} ·{' '}
                      </span>
                    )}
                    Receipt {genState.receiptId.slice(0, 8)}{' '}
                    <button onClick={viewReceipt} className="underline hover:opacity-70">
                      {receiptJson ? 'hide' : 'view'}
                    </button>
                  </p>
                )}
                {receiptJson && (
                  <pre className="text-[10px] leading-tight text-[#1b1b1b] bg-[#fdfff8] border border-[#1b1b1b] rounded p-3 overflow-x-auto max-h-64">
                    {receiptJson}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={
                genState.engine === 'palette' ? handleGeneratePalette : handleGenerateMusic
              }
              disabled={
                (genState.engine === 'palette'
                  ? !genState.audioFile
                  : !genState.description.trim() || !genState.style.trim()) ||
                !genState.grantId ||
                genState.isGenerating
              }
              className="w-full py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {genState.isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#fdfff8] rounded-full animate-bounce"></div>
                  {genState.engine === 'palette'
                    ? 'Measuring and rendering, here in your browser...'
                    : 'Composing your moment...'}
                </span>
              ) : (
                'Generate My Moment →'
              )}
            </button>
          </div>
        ) : (
          /* Stage 2: Preview & Publish */
          <div className="space-y-6">
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8 space-y-4">
              <h2 className="text-2xl font-bold">Your Moment is Ready</h2>
              <audio key={audioPlayerKey} controls src={genState.generatedAudioUrl} className="w-full" />
              <p className="text-sm text-[#1b1b1b80]">AI-generated audio moment from your description</p>
              {genState.paletteVoices && (
                <p className="text-xs text-[#484947]">
                  Voiced by{' '}
                  <span className="font-semibold text-[#1b1b1b]">
                    {genState.paletteVoices.join(', ')}
                  </span>{' '}
                  — chosen by measuring your file, which never left this browser.
                </p>
              )}
              {chosenGrant && (
                <div className="text-xs text-[#484947] space-y-1 border-t border-[#1b1b1b] pt-3">
                  <p>
                    Generated under{' '}
                    <span className="font-semibold text-[#1b1b1b]">
                      {chosenGrant.grantor_display_name}
                    </span>
                    ’s terms (v{chosenGrant.terms_version})
                    {genState.receiptId && (
                      <>
                        {' '}· receipt {genState.receiptId.slice(0, 8)}{' '}
                        <button onClick={viewReceipt} className="underline hover:opacity-70">
                          {receiptJson ? 'hide' : 'view'}
                        </button>
                      </>
                    )}
                  </p>
                  {chosenGrant.attribution_text && <p>{chosenGrant.attribution_text}</p>}
                  {receiptJson && (
                    <pre className="text-[10px] leading-tight text-[#1b1b1b] bg-[#fdfff8] border border-[#1b1b1b] rounded p-3 overflow-x-auto max-h-64">
                      {receiptJson}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8 space-y-6">
              <h2 className="text-2xl font-bold">Publish This Moment</h2>

              {/* Cover Art Section */}
              {genState.imageUrl && genState.imagePreviewUrl && (
                <div className="space-y-3">
                  <img
                    src={genState.imagePreviewUrl}
                    alt="Moment cover"
                    className="w-full h-48 object-cover rounded-lg border border-[#1b1b1b]"
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regState.includeCoverArt}
                      onChange={(e) =>
                        setRegState((prev) => ({ ...prev, includeCoverArt: e.target.checked }))
                      }
                      disabled={regState.isRegistering}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold">Use this photo as cover art</span>
                  </label>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold mb-2">Moment Name *</label>
                <input
                  type="text"
                  value={regState.title}
                  onChange={(e) => setRegState((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Rainy Night"
                  disabled={regState.isRegistering}
                  className="w-full px-4 py-3 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#484947] focus:outline-none focus:border-[#1b1b1b] disabled:opacity-50"
                />
              </div>

              {regState.error && (
                <div className="bg-[#ff2e00]/10 border border-[#ff2e00] rounded-lg p-4 text-[#ff2e00] text-sm">
                  {regState.error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={publishMoment}
                  disabled={!regState.title.trim() || regState.isRegistering}
                  className="flex-1 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
                >
                  {regState.isRegistering ? 'Publishing...' : 'Publish this Moment →'}
                </button>
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
