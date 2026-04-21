'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Landing() {
  const router = useRouter()

  useEffect(() => {
    // Check if user already has spotify token (already connected)
    const spotifyToken = typeof window !== 'undefined' ? localStorage.getItem('spotify_token') : null
    if (spotifyToken) {
      router.push('/profile')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-12">

        {/* Headline */}
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Verified Fans
            </h1>
            <p className="text-xl text-gray-300 max-w-lg mx-auto">
              Prove your fandom with your Spotify data + verified human identity
            </p>
          </div>

          {/* CTA - Top Priority */}
          <button
            onClick={() => {
              localStorage.setItem('user_id', '661d8cd6-bd0d-4199-91bd-7afa70b7f140')
              router.push('/profile')
            }}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors duration-200 inline-block mx-auto"
          >
            View Demo Profile →
          </button>
          <p className="text-sm text-gray-500">
            You'll see an unverified fan profile. Click "Verify with World ID" to test the verification flow.
          </p>
        </div>

        {/* The Problem */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The Problem</h2>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-4">
            <div>
              <p className="text-gray-300">
                <span className="text-red-400 font-semibold">$2B/year in music streaming fraud.</span> The system is gamed at every level:
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-400 space-y-2">
                <div>
                  <span className="text-red-300 font-semibold">Fake listeners:</span> Bot farms + playlist manipulators pump fake streams into real artists
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Fake artists:</span> Unverified accounts mass-upload AI-generated songs, use bots to stream them, steal royalties
                </div>
              </div>

              <div className="bg-red-950/40 border border-red-700/40 rounded p-4">
                <p className="text-gray-200 text-sm leading-relaxed">
                  <span className="text-red-300 font-semibold">The result:</span> ~8% of all streams are fraudulent. Artists lose royalties on millions of plays and can't distinguish real fans from bots. They make critical decisions (tours, setlists, signings) based on data they fundamentally cannot trust.
                </p>
              </div>
            </div>

            <div className="border-t border-red-700/30 pt-4 mt-4">
              <p className="text-gray-300 font-semibold mb-2">🚨 The problem is accelerating:</p>
              <ul className="space-y-1 text-sm">
                <li>• AI can now generate thousands of songs instantly (and cheaply)</li>
                <li>• Bot networks are becoming more sophisticated and affordable</li>
                <li>• Each year, fraud accounts for a larger % of total streams</li>
                <li>• Without intervention, artists will lose trust in streaming data entirely</li>
              </ul>
            </div>
          </div>
        </div>

        {/* The Solution */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The Solution</h2>
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6 space-y-6">
            <p className="text-gray-300">
              <span className="text-green-400 font-semibold">Spotify + World ID = Verified Fan Identity</span>
            </p>

            {/* Layer 1 */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Layer 1: Personal Fan Profile</h3>
              <p className="text-gray-300 text-sm">
                Understand your own fandom. Fan scores per artist, your listener archetype (Devoted Loyalist, Broad Explorer, Seasonal Fan, All-Timer), and artist trajectory (Rising/Consistent/Fading). Optional: upload extended streaming history for deeper analytics.
              </p>
              <p className="text-gray-400 text-xs">Solves: Artists understand their real listeners' preferences</p>
            </div>

            {/* Layer 2 */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Layer 2: Verified Social Feed</h3>
              <p className="text-gray-300 text-sm">
                Share what you're listening to with other verified humans. Post current track + context, see feeds from verified fans you follow, react to posts. Every account = one real person (provably). No bots. No fake hype.
              </p>
              <p className="text-gray-400 text-xs">Solves: Artists see authentic fan engagement, discover real audience sentiment</p>
            </div>

            {/* Layer 3 */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Layer 3: Verified Discovery</h3>
              <p className="text-gray-300 text-sm">
                Artist fan leaderboards ranked by verified fan scores. "Fans of X also love Y" recommendations based on real listening data. Browse top verified fans of an artist → see their full profile → discover their other artists. All data is trustworthy, can't be gamed.
              </p>
              <p className="text-gray-400 text-xs">Solves: Artists make tour/setlist/signing decisions based on real data; fake artists blocked out</p>
            </div>

            <div className="bg-green-950/40 border border-green-700/40 rounded p-4">
              <p className="text-green-200 text-sm">
                <span className="font-semibold">Result:</span> A marketplace where verified humans connect with artists. Bot streams don't exist. Fake artists can't gain traction. Real fans get visibility. Artists make decisions based on data they can trust. Royalties go to real creators.
              </p>
            </div>
          </div>
        </div>

        {/* What You'll See */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">What This Demo Shows</h2>
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 space-y-3">
            <p className="text-gray-300 font-semibold mb-3">Personal Fan Profile (Unverified)</p>
            <ul className="text-gray-300 space-y-2 text-sm mb-4">
              <li>• Your fan archetype (Devoted Loyalist, Broad Explorer, Seasonal Fan, All-Timer)</li>
              <li>• Top 50 artists with fan scores (0-200 scale)</li>
              <li>• Artist trajectory (Rising/Consistent/Fading)</li>
              <li>• Private profile (only you can see your data)</li>
            </ul>

            <p className="text-gray-300 font-semibold mb-3">After Verification (Public)</p>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• Verified badge on your profile</li>
              <li>• Appear in artist leaderboards (top verified fans)</li>
              <li>• Profile visible to other verified fans</li>
              <li>• Artists can see their verified fanbase</li>
            </ul>
          </div>
        </div>

        {/* Demo vs Production */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Demo vs. Production</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="font-semibold text-gray-300 mb-2">This Demo</p>
              <ul className="text-gray-400 space-y-1">
                <li>✓ Pre-loaded test user</li>
                <li>✓ Verification flow works</li>
                <li>✓ Fan profile features</li>
                <li>✗ No real Spotify connection (dev limits)</li>
                <li>✗ No social feed (future)</li>
                <li>✗ No leaderboard data (future)</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="font-semibold text-gray-300 mb-2">Production Version</p>
              <ul className="text-gray-400 space-y-1">
                <li>✓ Connect your Spotify</li>
                <li>✓ Real fan score pipeline</li>
                <li>✓ World ID verification</li>
                <li>✓ Social feed (Layer 2)</li>
                <li>✓ Leaderboards (Layer 3)</li>
                <li>✓ Artist dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-800 pt-8">
          <p className="text-xs text-gray-600">
            Built for World Build Hackathon | Spotify API + World ID verification
          </p>
        </div>
      </main>
    </div>
  )
}
