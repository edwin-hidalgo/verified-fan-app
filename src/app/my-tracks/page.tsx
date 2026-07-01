'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Track {
  id: string
  title: string
  artist_name: string
  ai_origin: 'human' | 'ai_assisted' | 'ai_generated'
  play_count: number
  duration_seconds?: number | null
  cover_image_url?: string | null
  created_at: string
}

export default function MyTracksPage() {
  const [displayName, setDisplayName] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => {
      const u = res.data.user
      if (u) {
        setDisplayName(
          (u.user_metadata?.display_name as string) || u.email?.split('@')[0] || 'You'
        )
      }
    })

    const fetchTracks = async () => {
      try {
        const response = await fetch('/api/my-tracks')
        const data = await response.json()
        if (response.ok) setTracks(data.tracks || [])
      } catch (error) {
        console.error('[my-tracks] Failed to fetch tracks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTracks()
  }, [])

  const totalPlays = tracks.reduce((sum, t) => sum + (t.play_count || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#d9dbdd]">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-[#1b1b1b] rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#d9dbdd] text-[#1b1b1b] px-4 py-12">
      <main className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">My Moments</h1>
          <p className="text-[#1b1b1b80]">Created by {displayName}</p>
        </div>

        {/* Stats */}
        {tracks.length > 0 && (
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6">
              <p className="text-3xl font-bold mb-1">{tracks.length}</p>
              <p className="text-xs text-[#1b1b1b80] font-mono uppercase">Moments</p>
            </div>
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6">
              <p className="text-3xl font-bold mb-1">{totalPlays}</p>
              <p className="text-xs text-[#1b1b1b80] font-mono uppercase">Total Plays</p>
            </div>
          </div>
        )}

        {/* Tracks */}
        {tracks.length === 0 ? (
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-12 text-center">
            <p className="text-[#1b1b1b80] mb-6">You haven&apos;t created any moments yet.</p>
            <Link
              href="/create"
              className="inline-block px-8 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 transition-opacity"
            >
              Create Your First Moment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <Link
                key={track.id}
                href={`/track/${track.id}`}
                className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-5 hover:opacity-80 transition-opacity flex gap-4 items-center"
              >
                {track.cover_image_url ? (
                  <img
                    src={track.cover_image_url}
                    alt={track.title}
                    className="w-16 h-16 object-cover rounded-md border border-[#1b1b1b] flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-md border border-[#1b1b1b] bg-[#d9dbdd] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{track.title}</h3>
                  <p className="text-sm text-[#1b1b1b80] truncate">{track.artist_name}</p>
                  <p className="text-xs text-[#1b1b1b80] mt-1">
                    {track.play_count} plays
                    {track.duration_seconds ? ` · ${Math.round(track.duration_seconds)}s` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-[#1b1b1b20]">
          <Link
            href="/create"
            className="inline-block px-8 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 transition-opacity"
          >
            Create Another Moment
          </Link>
        </div>
      </main>
    </div>
  )
}
