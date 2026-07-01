'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AudioPlayer from '@/components/AudioPlayer'
import { Card } from '@/components/ui/card'

interface Track {
  id: string
  title: string
  artist_name: string
  genre: string
  duration_seconds: number
  audio_file_url: string
  cover_image_url: string | null
  ai_origin: 'human' | 'ai_assisted' | 'ai_generated'
  ai_training_allowed: boolean
  sync_allowed: boolean
  commercial_use_allowed: boolean
  play_count: number
  registration_status: string
  created_at: string
}

type FilterType = 'all' | 'ai_training' | 'sync' | 'commercial'
type ViewMode = 'grid' | 'list'

export default function CatalogPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [localPlayCounts, setLocalPlayCounts] = useState<Record<string, number>>({})

  // Audio player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Fetch tracks on mount
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await fetch('/api/tracks')
        if (!response.ok) {
          throw new Error('Failed to fetch tracks')
        }

        const data = await response.json()
        setTracks(data.tracks || [])
        setFilteredTracks(data.tracks || [])
      } catch (err) {
        console.error('Failed to fetch catalog:', err)
        setError(err instanceof Error ? err.message : 'Failed to load catalog')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTracks()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = tracks

    if (filter === 'ai_training') {
      filtered = tracks.filter((t) => t.ai_training_allowed)
    } else if (filter === 'sync') {
      filtered = tracks.filter((t) => t.sync_allowed)
    } else if (filter === 'commercial') {
      filtered = tracks.filter((t) => t.commercial_use_allowed)
    }

    setFilteredTracks(filtered)
  }, [filter, tracks])

  // Record play when track starts (open to everyone)
  const recordPlay = async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/play`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setLocalPlayCounts((prev) => ({
          ...prev,
          [trackId]: data.playCount,
        }))
        setTracks((prev) =>
          prev.map((t) =>
            t.id === trackId ? { ...t, play_count: data.playCount } : t
          )
        )
      }
    } catch (error) {
      console.error('[catalog] Failed to record play:', error)
    }
  }

  // Handle play button click
  const handlePlayClick = (track: Track, index: number) => {
    if (currentTrack?.id === track.id) {
      // Toggle play/pause on same track
      setIsPlaying(!isPlaying)
    } else {
      // Start new track
      setCurrentTrack(track)
      setCurrentTrackIndex(index)
      setIsPlaying(true)
      recordPlay(track.id)
    }
  }

  // Handle track end (auto-advance)
  const handleTrackEnd = () => {
    const nextIndex = currentTrackIndex + 1
    if (nextIndex < filteredTracks.length) {
      const nextTrack = filteredTracks[nextIndex]
      setCurrentTrack(nextTrack)
      setCurrentTrackIndex(nextIndex)
      setIsPlaying(true)
      recordPlay(nextTrack.id)
    } else {
      // Reached end of filtered list
      setCurrentTrack(null)
      setIsPlaying(false)
    }
  }

  // Handle player close
  const handlePlayerClose = () => {
    setCurrentTrack(null)
    setIsPlaying(false)
  }

  // Handle play/pause toggle from player
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  // Handle previous track
  const handlePrevious = () => {
    const prevIndex = currentTrackIndex - 1
    if (prevIndex >= 0) {
      const prevTrack = filteredTracks[prevIndex]
      setCurrentTrack(prevTrack)
      setCurrentTrackIndex(prevIndex)
      setIsPlaying(true)
      recordPlay(prevTrack.id)
    }
  }

  return (
    <div className="min-h-screen bg-[#d9dbdd] text-[#1b1b1b]">
      {/* Add padding bottom to accommodate audio player */}
      <div className="px-4 py-12" style={{ paddingBottom: currentTrack ? '140px' : '48px' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-2">Feed</h1>
            <p className="text-[#1b1b1b80]">
              Moments from verified creators. Click any moment to play it right here.
            </p>
          </div>

          {/* Controls: Filters + View Toggle */}
          <div className="mb-8 flex flex-col gap-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  filter === 'all'
                    ? 'bg-[#1b1b1b] text-[#fdfff8]'
                    : 'border border-[#1b1b1b] text-[#1b1b1b] hover:bg-[#1b1b1b] hover:text-[#fdfff8]'
                }`}
              >
                All Works ({tracks.length})
              </button>
              <button
                onClick={() => setFilter('ai_training')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  filter === 'ai_training'
                    ? 'bg-[#1b1b1b] text-[#fdfff8]'
                    : 'border border-[#1b1b1b] text-[#1b1b1b] hover:bg-[#1b1b1b] hover:text-[#fdfff8]'
                }`}
              >
                AI Training Allowed ({tracks.filter((t) => t.ai_training_allowed).length})
              </button>
              <button
                onClick={() => setFilter('sync')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  filter === 'sync'
                    ? 'bg-[#1b1b1b] text-[#fdfff8]'
                    : 'border border-[#1b1b1b] text-[#1b1b1b] hover:bg-[#1b1b1b] hover:text-[#fdfff8]'
                }`}
              >
                Sync Licenses ({tracks.filter((t) => t.sync_allowed).length})
              </button>
              <button
                onClick={() => setFilter('commercial')}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  filter === 'commercial'
                    ? 'bg-[#1b1b1b] text-[#fdfff8]'
                    : 'border border-[#1b1b1b] text-[#1b1b1b] hover:bg-[#1b1b1b] hover:text-[#fdfff8]'
                }`}
              >
                Commercial Use ({tracks.filter((t) => t.commercial_use_allowed).length})
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  viewMode === 'grid'
                    ? 'bg-[#1b1b1b] text-[#fdfff8]'
                    : 'border border-[#1b1b1b] text-[#1b1b1b] hover:bg-[#1b1b1b] hover:text-[#fdfff8]'
                }`}
                title="Grid view"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-[#1b1b1b] text-[#fdfff8]'
                    : 'border border-[#1b1b1b] text-[#1b1b1b] hover:bg-[#1b1b1b] hover:text-[#fdfff8]'
                }`}
                title="List view"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="2" />
                  <rect x="3" y="11" width="18" height="2" />
                  <rect x="3" y="18" width="18" height="2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          ) : error ? (
            <div className="border border-[#ff2e00] rounded-lg p-6 text-center bg-[#fdfff8]">
              <p className="text-[#ff2e00] font-semibold mb-2">Error Loading Feed</p>
              <p className="text-[#ff2e00] text-sm">{error}</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-12 text-center">
              <p className="text-[#1b1b1b80] text-lg">No moments found with selected filters.</p>
              <button
                onClick={() => setFilter('all')}
                className="mt-4 px-6 py-2 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80"
              >
                View All Moments
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTracks.map((track, index) => (
                <div
                  key={track.id}
                  onClick={() => router.push(`/track/${track.id}`)}
                  className={`group bg-[#fdfff8] border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    currentTrack?.id === track.id
                      ? 'border-[#2e8b6f] shadow-md'
                      : 'border-[#1b1b1b] hover:opacity-90'
                  }`}
                >
                  {/* Cover Image with Play Button Overlay */}
                  <div className="relative w-full aspect-square bg-[#d9dbdd] overflow-hidden">
                    {track.cover_image_url && (
                      <img
                        src={track.cover_image_url}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayClick(track, index)
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          currentTrack?.id === track.id && isPlaying
                            ? 'bg-[#2e8b6f] text-[#fdfff8] ring-2 ring-[#2e8b6f] ring-offset-2'
                            : 'bg-[#fdfff8]/90 text-[#1b1b1b] hover:bg-[#fdfff8]'
                        }`}
                        aria-label={currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21" />
                          </svg>
                        )}
                      </button>

                      {/* Pulsing indicator when playing */}
                      {currentTrack?.id === track.id && isPlaying && (
                        <div className="absolute inset-0 rounded-lg border-2 border-[#2e8b6f] animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 flex flex-col h-full">
                    <h3 className="font-semibold text-sm text-[#1b1b1b] leading-tight line-clamp-2 mb-0.5">
                      {track.title}
                    </h3>
                    <p className="text-xs text-[#1b1b1b80] font-mono mb-2">{track.artist_name}</p>

                    {track.genre && (
                      <p className="text-xs text-[#1b1b1b80] mb-2">
                        {track.genre} • {Math.floor(track.duration_seconds / 60)}m
                      </p>
                    )}

                    {/* AI Origin Badge */}
                    <div className="mb-2">
                      <span className="text-xs border border-[#1b1b1b] text-[#1b1b1b] px-2 py-0.5 rounded lowercase">
                        {track.ai_origin === 'human' && 'human'}
                        {track.ai_origin === 'ai_assisted' && 'ai-assisted'}
                        {track.ai_origin === 'ai_generated' && 'ai-generated'}
                      </span>
                    </div>

                    {/* License Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {track.ai_training_allowed && (
                        <span className="text-xs border border-[#1b1b1b] text-[#1b1b1b] px-1.5 py-0.5 rounded lowercase">
                          ai training
                        </span>
                      )}
                      {track.sync_allowed && (
                        <span className="text-xs border border-[#1b1b1b] text-[#1b1b1b] px-1.5 py-0.5 rounded lowercase">
                          sync
                        </span>
                      )}
                      {track.commercial_use_allowed && (
                        <span className="text-xs border border-[#1b1b1b] text-[#1b1b1b] px-1.5 py-0.5 rounded lowercase">
                          commercial
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-2 border-t border-[#1b1b1b] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#1b1b1b80]">
                          {new Date(track.created_at).toLocaleDateString()}
                        </span>
                        {track.registration_status === 'registered' ? (
                          <span className="text-[#2e8b6f] text-xs">✓ registered</span>
                        ) : (
                          <span className="text-[#1b1b1b80] text-xs">{track.registration_status}</span>
                        )}
                      </div>
                      <div className="text-xs text-[#1b1b1b80] font-mono">
                        {(localPlayCounts[track.id] ?? track.play_count) || 0} listen{(localPlayCounts[track.id] ?? track.play_count) === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-2">
              {filteredTracks.map((track, index) => (
                <div
                  key={track.id}
                  onClick={() => router.push(`/track/${track.id}`)}
                  className={`bg-[#fdfff8] border-2 rounded-lg p-4 flex items-center gap-4 cursor-pointer transition-all ${
                    currentTrack?.id === track.id
                      ? 'border-[#2e8b6f] shadow-md'
                      : 'border-[#1b1b1b] hover:opacity-90'
                  }`}
                >
                  {/* Cover Image */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-[#1b1b1b] bg-[#d9dbdd]">
                    {track.cover_image_url && (
                      <img
                        src={track.cover_image_url}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-[#1b1b1b] truncate">
                      {track.title}
                    </h3>
                    <p className="text-xs text-[#1b1b1b80] font-mono truncate">
                      {track.artist_name}
                    </p>
                  </div>

                  {/* AI Origin Tag */}
                  <div className="flex-shrink-0">
                    <span className="text-xs border border-[#1b1b1b] text-[#1b1b1b] px-2 py-1 rounded lowercase whitespace-nowrap">
                      {track.ai_origin === 'human' && 'human'}
                      {track.ai_origin === 'ai_assisted' && 'ai-assisted'}
                      {track.ai_origin === 'ai_generated' && 'ai-generated'}
                    </span>
                  </div>

                  {/* Play Count */}
                  <div className="flex-shrink-0 text-xs text-[#1b1b1b80] font-mono whitespace-nowrap">
                    {(localPlayCounts[track.id] ?? track.play_count) || 0}
                    <span className="text-[#1b1b1b80] text-xs ml-1">listens</span>
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlayClick(track, index)
                    }}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentTrack?.id === track.id && isPlaying
                        ? 'bg-[#2e8b6f] text-[#fdfff8]'
                        : 'bg-[#1b1b1b] text-[#fdfff8] hover:opacity-80'
                    }`}
                    aria-label={currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'}
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audio Player - Sticky Bottom */}
      <AudioPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onTrackEnd={handleTrackEnd}
        onSkip={handleTrackEnd}
        onPrevious={handlePrevious}
        onClose={handlePlayerClose}
      />
    </div>
  )
}
