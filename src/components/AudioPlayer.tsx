'use client'

import { useEffect, useRef, useState } from 'react'

interface Track {
  id: string
  title: string
  artist_name: string
  audio_file_url: string
  cover_image_url: string | null
  duration_seconds: number
}

interface AudioPlayerProps {
  track: Track | null
  isPlaying: boolean
  onTogglePlay: () => void
  onTrackEnd: () => void
  onSkip: () => void
  onPrevious: () => void
  onClose: () => void
}

export default function AudioPlayer({
  track,
  isPlaying,
  onTogglePlay,
  onTrackEnd,
  onSkip,
  onPrevious,
  onClose,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Mini-player swipe
  const [swipeDistance, setSwipeDistance] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)

  // Full-screen player
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [fullSwipeX, setFullSwipeX] = useState(0)
  const [fullSwipeY, setFullSwipeY] = useState(0)
  const [fullTouchStart, setFullTouchStart] = useState({ x: 0, y: 0 })

  // Load new track
  useEffect(() => {
    if (!track || !audioRef.current) return

    audioRef.current.src = track.audio_file_url
    audioRef.current.load()

    const playPromise = audioRef.current.play()
    if (playPromise) {
      playPromise.catch((err) => {
        console.error('[AudioPlayer] Autoplay failed:', err)
      })
    }
  }, [track?.id])

  // Control play/pause
  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      const playPromise = audioRef.current.play()
      if (playPromise) {
        playPromise.catch((err) => {
          console.error('[AudioPlayer] Play failed:', err)
        })
      }
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Mini-player swipe handlers
  const handleMiniTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setSwipeDistance(0)
  }

  const handleMiniTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const distance = touchStartX - currentX
    setSwipeDistance(distance)
  }

  const handleMiniTouchEnd = () => {
    if (swipeDistance > 50) {
      // Swipe left → next
      onSkip()
    } else if (swipeDistance < -50) {
      // Swipe right → previous
      onPrevious()
    }
    setSwipeDistance(0)
  }

  // Full-screen swipe handlers
  const handleFullTouchStart = (e: React.TouchEvent) => {
    setFullTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    setFullSwipeX(0)
    setFullSwipeY(0)
  }

  const handleFullTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    setFullSwipeX(fullTouchStart.x - currentX)
    setFullSwipeY(fullTouchStart.y - currentY)
  }

  const handleFullTouchEnd = () => {
    // Swipe down > 100px → dismiss
    if (fullSwipeY < -100) {
      setIsFullScreen(false)
      setFullSwipeX(0)
      setFullSwipeY(0)
      return
    }

    // Swipe left > 80px → next
    if (fullSwipeX > 80) {
      onSkip()
    }
    // Swipe right > 80px → previous
    else if (fullSwipeX < -80) {
      handlePreviousClick()
    }

    setFullSwipeX(0)
    setFullSwipeY(0)
  }

  // Smart previous button
  const handlePreviousClick = () => {
    if (currentTime > 5) {
      // Restart current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        setCurrentTime(0)
      }
    } else {
      // Go to previous track
      onPrevious()
    }
  }

  if (!track) return null

  return (
    <>
      {/* MINI PLAYER */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#fdfff8] border-t border-[#1b1b1b] px-4 py-3 flex items-center gap-4 z-50 shadow-lg transition-transform duration-100 select-none"
        style={{
          transform:
            swipeDistance > 0
              ? `translateX(-${Math.min(swipeDistance, 100)}px)`
              : swipeDistance < 0
                ? `translateX(${Math.min(Math.abs(swipeDistance), 100)}px)`
                : 'translateX(0)',
          opacity: swipeDistance !== 0 ? Math.max(0.5, 1 - Math.abs(swipeDistance) / 200) : 1,
        }}
        onTouchStart={handleMiniTouchStart}
        onTouchMove={handleMiniTouchMove}
        onTouchEnd={handleMiniTouchEnd}
      >
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={onTrackEnd}
        />

        {/* Cover Art - Clickable */}
        <div
          onClick={() => setIsFullScreen(true)}
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[#1b1b1b] bg-[#d9dbdd] cursor-pointer hover:opacity-80 transition-opacity"
        >
          {track.cover_image_url ? (
            <img
              src={track.cover_image_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src="/ekos-vinyl.svg" alt="ekos" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Title & Artist - Clickable */}
        <div
          onClick={() => setIsFullScreen(true)}
          className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-semibold text-[#1b1b1b] truncate">{track.title}</p>
          <p className="text-xs text-[#1b1b1b80] truncate">{track.artist_name}</p>
        </div>

        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePlay()
          }}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1b1b1b] text-[#fdfff8] flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
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

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => {
              e.stopPropagation()
              handleSeek(e)
            }}
            className="w-full h-1 bg-[#1b1b1b20] rounded-lg appearance-none cursor-pointer accent-[#2e8b6f]"
          />
        </div>

        {/* Time Display */}
        <div className="flex-shrink-0 text-xs text-[#1b1b1b80] font-mono whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#1b1b1b80] hover:text-[#1b1b1b] transition-colors"
          aria-label="Close player"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* FULL-SCREEN PLAYER */}
      {isFullScreen && (
        <div
          className="fixed inset-0 z-[60] overflow-hidden select-none"
          onTouchStart={handleFullTouchStart}
          onTouchMove={handleFullTouchMove}
          onTouchEnd={handleFullTouchEnd}
          style={{
            transform:
              fullSwipeX > 0
                ? `translateX(-${Math.min(fullSwipeX, 150)}px)`
                : fullSwipeX < 0
                  ? `translateX(${Math.min(Math.abs(fullSwipeX), 150)}px)`
                  : fullSwipeY < 0
                    ? `translateY(${Math.min(Math.abs(fullSwipeY), 200)}px)`
                    : 'translateY(0)',
            opacity:
              Math.abs(fullSwipeX) > 0 || fullSwipeY < 0
                ? Math.max(0.3, 1 - Math.max(Math.abs(fullSwipeX), Math.abs(fullSwipeY)) / 300)
                : 1,
          }}
        >
          {/* Background - Blurred cover or solid */}
          <div className="absolute inset-0">
            {track.cover_image_url ? (
              <>
                <img
                  src={track.cover_image_url}
                  alt={track.title}
                  className="w-full h-full object-cover blur-3xl scale-110 brightness-50"
                />
                <div className="absolute inset-0 bg-black/30" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[#1b1b1b]" />
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <img src="/ekos-vinyl.svg" alt="ekos" className="w-72 h-72" />
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-between px-6 py-12 text-[#fdfff8]">
            {/* Header: Close Button */}
            <div className="flex justify-between items-start">
              <div />
              <button
                onClick={() => setIsFullScreen(false)}
                className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
                aria-label="Close full-screen player"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Title & Artist */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 line-clamp-2">{track.title}</h2>
              <p className="text-lg text-[#fdfff8]/70 font-mono">{track.artist_name}</p>
            </div>

            {/* Large Cover Art */}
            <div className="flex justify-center my-8">
              <div className="w-64 h-64 rounded-2xl overflow-hidden border-2 border-[#fdfff8]/20 shadow-2xl bg-[#d9dbdd]">
                {track.cover_image_url ? (
                  <img
                    src={track.cover_image_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img src="/ekos-vinyl.svg" alt="ekos" className="w-48 h-48" />
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar & Time */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-[#fdfff8]/20 rounded-lg appearance-none cursor-pointer accent-[#2e8b6f]"
              />
              <div className="flex justify-between text-sm font-mono text-[#fdfff8]/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-12">
              {/* Previous / Restart Button */}
              <button
                onClick={handlePreviousClick}
                className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#fdfff8]/10 transition-colors"
                aria-label="Previous track or restart"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v5.59L16 5 5 16h2c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 34.627 0 28s5.373-12 12-12v-2C5.373 14 0 19.373 0 26s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12z" />
                </svg>
              </button>

              {/* Play / Pause Button */}
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-[#fdfff8] text-[#1b1b1b] flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21" />
                  </svg>
                )}
              </button>

              {/* Next Button */}
              <button
                onClick={onSkip}
                className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#fdfff8]/10 transition-colors"
                aria-label="Next track"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M16 18h2v-5.59L6 19l11-11h-2c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12-5.373 12-12 12z" />
                </svg>
              </button>
            </div>

            {/* Swipe hint (subtle) */}
            <div className="text-center text-xs text-[#fdfff8]/40">
              Swipe to skip • Swipe down to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}
