'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { showToast } from '@/lib/utils/toast'

interface Track {
  id: string
  user_id: string
  title: string
  artist_name: string
  genre: string
  duration_seconds: number
  audio_file_url: string
  audio_file_hash: string
  isrc: string
  release_date: string
  ai_origin: 'human' | 'ai_assisted' | 'ai_generated'
  play_count: number
  splits: any[]
  ai_training_allowed: boolean
  ai_training_price_usd: number | null
  sync_allowed: boolean
  sync_price_usd: number | null
  commercial_use_allowed: boolean
  commercial_use_revenue_share_pct: number
  story_ip_id: string
  story_license_terms_id: string
  ipfs_metadata_cid: string
  registration_status: string
  created_at: string
  cover_image_url: string | null
  moment_description: string | null
}

interface User {
  id: string
  world_username: string
  world_wallet_address: string
  orb_verified: boolean
}

export default function TrackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const trackId = params.id as string

  const [track, setTrack] = useState<Track | null>(null)
  const [creator, setCreator] = useState<User | null>(null)
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
    const userId = localStorage.getItem('user_id')
    if (!userId) return // Only record plays for authenticated users

    try {
      const response = await fetch(`/api/tracks/${track.id}/play`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLocalPlayCount(data.playCount)
        // Update track with new play count
        setTrack((prev) =>
          prev ? { ...prev, play_count: data.playCount } : null
        )
      }
    } catch (error) {
      console.error('[track-detail] Failed to record play:', error)
    }
  }

  const handleShare = async () => {
    if (!track || !creator) return

    const shareText = `I just registered a verified-human moment on ekos — "${track.title}" by ${creator.world_username || 'verified creator'}. ${track.play_count} verified listens so far. 🎵`
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

    if (navigator.share) {
      // Mobile: use native share sheet
      try {
        await navigator.share({
          title: track.title,
          text: shareText,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled share, no error needed
      }
    } else {
      // Desktop: copy to clipboard + show toast
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
        showToast('Copied to clipboard! 📋', 'success', 2000)
      } catch (err) {
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

  return (
    <div className="min-h-screen bg-[#fdfff8] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/catalog')}
          className="text-[#1b1b1b80] hover:text-[#1b1b1b] mb-8 font-semibold"
        >
          ← Back to Catalog
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Audio Player & Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Audio Player */}
            <Card className="p-8 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
              {/* Cover Image */}
              {track.cover_image_url && (
                <img
                  src={track.cover_image_url}
                  alt={track.title}
                  className="w-full h-64 object-cover rounded-lg mb-6 border border-gray-700"
                />
              )}

              <audio
                src={track.audio_file_url}
                controls
                className="w-full mb-6"
                onPlay={recordPlay}
              />

              {/* Track Info */}
              <div className="space-y-6">
                <div>
                  <p className="text-[#1b1b1b80] text-sm mb-1">Title</p>
                  <h1 className="text-4xl font-bold text-[#1b1b1b]">{track.title}</h1>
                </div>

                {/* Moment Description */}
                {track.moment_description && (
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-2">The Moment</p>
                    <p className="text-[#1b1b1b] italic text-lg">"{track.moment_description}"</p>
                  </div>
                )}

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="px-6 py-3 bg-[#1b1b1b] hover:opacity-80 text-[#fdfff8] font-semibold rounded-full transition-colors w-full"
                >
                  📤 Share This Moment
                </button>

                {/* Verified Play Counter */}
                <div className="bg-green-600/10 border border-green-600/30 rounded p-4">
                  <p className="text-xs text-green-400 font-semibold mb-1">VERIFIED HUMAN LISTENS</p>
                  <p className="text-3xl font-bold text-green-400">
                    {localPlayCount ?? track.play_count ?? 0}
                  </p>
                  <p className="text-xs text-green-300 mt-1">
                    {localPlayCount ?? track.play_count ?? 0} verified {(localPlayCount ?? track.play_count) === 1 ? 'human' : 'humans'} have played this track
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-1">Artist</p>
                    <p className="font-semibold text-[#1b1b1b]">{track.artist_name}</p>
                  </div>
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-1">Genre</p>
                    <p className="font-semibold text-[#1b1b1b]">{track.genre || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-1">Duration</p>
                    <p className="font-semibold text-[#1b1b1b]">
                      {Math.floor(track.duration_seconds / 60)}:{String(track.duration_seconds % 60).padStart(2, '0')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-1">Status</p>
                    <p className="font-semibold capitalize">
                      {track.registration_status === 'registered' ? (
                        <span className="text-green-400">✓ Registered</span>
                      ) : (
                        <span className="text-yellow-400">{track.registration_status}</span>
                      )}
                    </p>
                  </div>
                </div>

                {track.isrc && (
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-1">ISRC</p>
                    <p className="font-mono text-sm text-[#1b1b1b]">{track.isrc}</p>
                  </div>
                )}

                {track.release_date && (
                  <div>
                    <p className="text-[#1b1b1b80] text-sm mb-1">Release Date</p>
                    <p className="font-semibold text-[#1b1b1b]">{new Date(track.release_date).toLocaleDateString()}</p>
                  </div>
                )}

                <div>
                  <p className="text-[#1b1b1b80] text-sm mb-2">Creation Method</p>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    track.ai_origin === 'human' ? 'bg-green-600/20 text-green-400' :
                    track.ai_origin === 'ai_assisted' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-purple-600/20 text-purple-400'
                  }`}>
                    {track.ai_origin === 'human' && 'Fully Human-Created'}
                    {track.ai_origin === 'ai_assisted' && 'AI-Assisted'}
                    {track.ai_origin === 'ai_generated' && 'AI-Generated'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Creator Info */}
            {creator && (
              <Card className="p-8 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[#1b1b1b80] text-sm mb-2">Created by</p>
                    <h3 className="text-2xl font-bold flex items-center gap-2 text-[#1b1b1b]">
                      {creator.world_username || creator.world_wallet_address.slice(0, 10) + '...'}
                      {creator.orb_verified && (
                        <span className="text-xs border border-[#1b1b1b] text-[#1b1b1b] text-xs px-2 py-0.5 rounded font-semibold">
                          ✓ Verified Human
                        </span>
                      )}
                    </h3>
                    <p className="text-[#1b1b1b80] text-sm font-mono mt-1">
                      {creator.world_wallet_address}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Royalty Splits */}
            {track.splits && track.splits.length > 0 && (
              <Card className="p-8 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
                <h2 className="text-xl font-bold mb-4 text-[#1b1b1b]">Royalty Splits</h2>
                <div className="space-y-3">
                  {track.splits.map((split: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#1b1b1b]/5 rounded">
                      <p className="text-sm font-mono text-[#1b1b1b80]">{split.recipient}</p>
                      <p className="font-semibold text-[#1b1b1b]">{split.percentage}%</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right: License Terms & Links */}
          <div className="space-y-6">
            {/* License Terms */}
            <Card className="p-6 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
              <h2 className="text-lg font-bold mb-4 text-[#1b1b1b]">License Terms</h2>

              <div className="space-y-3">
                {track.ai_training_allowed ? (
                  <div className="border border-[#2e8b6f] rounded-lg p-3 text-[#2e8b6f]">
                    <p className="text-sm font-semibold">✓ AI Training Allowed</p>
                    {track.ai_training_price_usd && (
                      <p className="text-xs mt-1">${track.ai_training_price_usd} per license</p>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#1b1b1b80] rounded-lg p-3 text-[#1b1b1b80]">
                    <p className="text-sm font-semibold">✗ AI Training Not Allowed</p>
                  </div>
                )}

                {track.sync_allowed ? (
                  <div className="border border-[#2e8b6f] rounded-lg p-3 text-[#2e8b6f]">
                    <p className="text-sm font-semibold">✓ Sync Licensing Available</p>
                    {track.sync_price_usd && (
                      <p className="text-xs mt-1">${track.sync_price_usd} per license</p>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#1b1b1b80] rounded-lg p-3 text-[#1b1b1b80]">
                    <p className="text-sm font-semibold">✗ No Sync Licenses</p>
                  </div>
                )}

                {track.commercial_use_allowed ? (
                  <div className="border border-[#2e8b6f] rounded-lg p-3 text-[#2e8b6f]">
                    <p className="text-sm font-semibold">✓ Commercial Use Allowed</p>
                    <p className="text-xs mt-1">
                      Creator gets {track.commercial_use_revenue_share_pct}% revenue
                    </p>
                  </div>
                ) : (
                  <div className="border border-[#1b1b1b80] rounded-lg p-3 text-[#1b1b1b80]">
                    <p className="text-sm font-semibold">✗ No Commercial Use</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Story Protocol Links */}
            {track.story_ip_id && (
              <Card className="p-6 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
                <h2 className="text-lg font-bold mb-4 text-[#1b1b1b]">On Chain</h2>

                <div className="space-y-3">
                  <a
                    href={`https://aeneid.storyscan.xyz/ipa/${track.story_ip_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-[#1b1b1b] rounded-lg p-3 hover:bg-[#1b1b1b] hover:text-[#fdfff8] transition"
                  >
                    <p className="text-sm font-semibold text-[#1b1b1b]">View IP Asset</p>
                    <p className="text-xs text-[#1b1b1b80] mt-1 font-mono truncate">{track.story_ip_id}</p>
                  </a>

                  {track.ipfs_metadata_cid && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${track.ipfs_metadata_cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-[#1b1b1b] rounded-lg p-3 hover:bg-[#1b1b1b] hover:text-[#fdfff8] transition"
                    >
                      <p className="text-sm font-semibold text-[#1b1b1b]">View Metadata (IPFS)</p>
                      <p className="text-xs text-[#1b1b1b80] mt-1 font-mono truncate">{track.ipfs_metadata_cid}</p>
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* File Info */}
            <Card className="p-6 bg-[#fdfff8] border border-[#1b1b1b] rounded-lg">
              <h2 className="text-lg font-bold mb-4 text-[#1b1b1b]">File</h2>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[#1b1b1b80] mb-1">SHA256 Hash</p>
                  <p className="font-mono text-[#1b1b1b] break-all">{track.audio_file_hash}</p>
                </div>

                <div className="pt-3 border-t border-[#1b1b1b]/10">
                  <p className="text-[#1b1b1b80] mb-2">Download</p>
                  <a
                    href={track.audio_file_url}
                    download
                    className="inline-block px-3 py-2 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded hover:opacity-80 text-xs"
                  >
                    Download Audio
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
