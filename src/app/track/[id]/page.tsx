'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { showToast } from '@/lib/utils/toast'

interface Track {
  id: string
  user_id: string
  title: string
  artist_name: string
  genre: string
  duration_seconds: number
  audio_file_url: string
  ai_origin: 'human' | 'ai_assisted' | 'ai_generated'
  play_count: number
  registration_status: string
  created_at: string
  cover_image_url: string | null
  moment_description: string | null
}

interface Creator {
  id: string
  display_name?: string | null
  world_username?: string | null
}

export default function TrackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const trackId = params.id as string

  const [track, setTrack] = useState<Track | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localPlayCount, setLocalPlayCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const response = await fetch(`/api/tracks/${trackId}`)
        if (!response.ok) {
          throw new Error('Track not found')
        }

        const data = await response.json()
        setTrack(data.track)
        setCreator(data.creator)
      } catch (err) {
        console.error('Failed to fetch track:', err)
        setError(err instanceof Error ? err.message : 'Failed to load track')
      } finally {
        setIsLoading(false)
      }
    }

    if (trackId) {
      fetchTrack()
    }
  }, [trackId])

  const recordPlay = async () => {
    if (!track) return

    try {
      const response = await fetch(`/api/tracks/${track.id}/play`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setLocalPlayCount(data.playCount)
        setTrack((prev) => (prev ? { ...prev, play_count: data.playCount } : null))
      }
    } catch (error) {
      console.error('[track-detail] Failed to record play:', error)
    }
  }

  const creatorName =
    creator?.display_name || creator?.world_username || track?.artist_name || 'a creator'

  const handleShare = async () => {
    if (!track) return

    const shareText = `Listen to "${track.title}" by ${creatorName} on ekos — a moment made into music. 🎵`
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text: shareText, url: shareUrl })
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
        showToast('Copied to clipboard! 📋', 'success', 2000)
      } catch {
        showToast('Failed to copy', 'error')
      }
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

  if (error || !track) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfff8] px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-[#ff2e00] mb-4">Error</h1>
          <p className="text-[#1b1b1b80] mb-6">{error || 'Track not found'}</p>
          <button
            onClick={() => router.push('/catalog')}
            className="px-8 py-3 bg-[#1b1b1b] hover:opacity-80 text-[#fdfff8] font-semibold rounded-full"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    )
  }

  const playCount = localPlayCount ?? track.play_count ?? 0

  return (
    <div className="min-h-screen bg-[#fdfff8] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/catalog')}
          className="text-[#1b1b1b80] hover:text-[#1b1b1b] mb-8 font-semibold"
        >
          ← Back to Catalog
        </button>

        <Card className="p-8 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
          {/* Cover Image */}
          {track.cover_image_url && (
            <img
              src={track.cover_image_url}
              alt={track.title}
              className="w-full h-64 object-cover rounded-lg mb-6 border border-[#1b1b1b]"
            />
          )}

          <audio src={track.audio_file_url} controls className="w-full mb-6" onPlay={recordPlay} />

          {/* Track Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-[#1b1b1b]">{track.title}</h1>
              <p className="text-[#1b1b1b80] mt-1">by {creatorName}</p>
            </div>

            {/* Moment Description */}
            {track.moment_description && (
              <div>
                <p className="text-[#1b1b1b80] text-sm mb-2">The Moment</p>
                <p className="text-[#1b1b1b] italic text-lg">&ldquo;{track.moment_description}&rdquo;</p>
              </div>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="px-6 py-3 bg-[#1b1b1b] hover:opacity-80 text-[#fdfff8] font-semibold rounded-full transition-colors w-full"
            >
              📤 Share This Moment
            </button>

            {/* Play Counter */}
            <div className="bg-[#2e8b6f]/10 border border-[#2e8b6f]/30 rounded p-4">
              <p className="text-xs text-[#2e8b6f] font-semibold mb-1">PLAYS</p>
              <p className="text-3xl font-bold text-[#2e8b6f]">{playCount}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[#1b1b1b80] text-sm mb-1">Style</p>
                <p className="font-semibold text-[#1b1b1b]">{track.genre || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#1b1b1b80] text-sm mb-1">Duration</p>
                <p className="font-semibold text-[#1b1b1b]">
                  {track.duration_seconds
                    ? `${Math.floor(track.duration_seconds / 60)}:${String(
                        Math.round(track.duration_seconds) % 60
                      ).padStart(2, '0')}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[#1b1b1b80] text-sm mb-2">Creation Method</p>
              <span className="px-3 py-1 rounded text-sm font-semibold bg-[#2e8b6f]/20 text-[#2e8b6f]">
                {track.ai_origin === 'human' && 'Human-Created'}
                {track.ai_origin === 'ai_assisted' && 'AI-Assisted'}
                {track.ai_origin === 'ai_generated' && 'AI-Generated'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
