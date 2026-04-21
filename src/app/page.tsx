'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Landing() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already verified
    const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
    if (userId) {
      router.push('/register')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-12">

        {/* Headline */}
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Verified Human Music Registry
            </h1>
            <p className="text-xl text-gray-300 max-w-lg mx-auto">
              The first music IP registry where only verified humans can register works.
            </p>
          </div>

          {/* CTA - Verify to Register */}
          <button
            onClick={() => router.push('/verify')}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors duration-200 inline-block mx-auto"
          >
            Verify with World ID →
          </button>
          <p className="text-sm text-gray-500">
            Prove your humanity, then register your music as IP Assets on Story Protocol.
          </p>
        </div>

        {/* The Problem */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The Problem</h2>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-4">
            <div>
              <p className="text-gray-300">
                <span className="text-red-400 font-semibold">Music IP is unverifiable.</span> Ownership and rights are fragmented across:
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-400 space-y-2">
                <div>
                  <span className="text-red-300 font-semibold">Streaming platforms:</span> Spotify, Apple Music don't verify creator identity. Fake artists upload AI-generated songs to steal royalties.
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Licensing chaos:</span> Rights holders can't enforce AI training restrictions. No machine-readable terms. Disputes are manual and slow.
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Creator identity gap:</span> No way to prove "I am the creator of this work" without legal paperwork.
                </div>
              </div>

              <div className="bg-red-950/40 border border-red-700/40 rounded p-4">
                <p className="text-gray-200 text-sm leading-relaxed">
                  <span className="text-red-300 font-semibold">The result:</span> Creators can't control their own IP. Rights disputes are unresolved. AI training happens without consent or compensation. Music ownership is a legal mess, not a technical reality.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The Solution */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The Solution</h2>
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6 space-y-6">
            <p className="text-gray-300">
              <span className="text-green-400 font-semibold">World ID + Story Protocol = Verifiable Music IP</span>
            </p>

            {/* Core */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Creator Registration with Proof</h3>
              <p className="text-gray-300 text-sm">
                Creators verify with World ID Orb (proof of unique human). Upload a music file. Attach machine-readable license terms (AI training allowed/disallowed with pricing, sync rights, commercial use revenue share). Register as IP Asset on Story Protocol Aeneid testnet.
              </p>
              <p className="text-gray-400 text-xs">Result: Cryptographic proof that this human created this work, with explicit license restrictions.</p>
            </div>

            {/* Public Catalog */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Public Registry</h3>
              <p className="text-gray-300 text-sm">
                Browse all registered works. Filter by license terms (e.g., "AI training allowed"). Each work shows verified human creator badge, Story Protocol IP Asset ID, license terms as queryable JSON API.
              </p>
              <p className="text-gray-400 text-xs">Result: Transparent, decentralized music IP registry. No gatekeepers. Provably human creators.</p>
            </div>

            {/* Legal Infrastructure */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Machine-Readable Rights</h3>
              <p className="text-gray-300 text-sm">
                License terms stored as JSON on IPFS + linked from Story IP Asset. Third-party AI training platforms can query the registry: "Is AI training allowed on this work? What's the fee?" Smart contracts can enforce terms automatically.
              </p>
              <p className="text-gray-400 text-xs">Result: Rights are enforceable, transparent, and can be used in crypto apps.</p>
            </div>

            <div className="bg-green-950/40 border border-green-700/40 rounded p-4">
              <p className="text-green-200 text-sm">
                <span className="font-semibold">Result:</span> The substrate for a human-verified music rights protocol. Only verified humans can register. Rights are on-chain. License terms are machine-readable. Creators get immutable ownership proof.
              </p>
            </div>
          </div>
        </div>

        {/* What You'll See */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">What This Demo Shows</h2>
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 space-y-3">
            <p className="text-gray-300 font-semibold mb-3">Creator Registration</p>
            <ul className="text-gray-300 space-y-2 text-sm mb-4">
              <li>✓ Verify with World ID (dev mode: skip verification)</li>
              <li>✓ Upload music file + metadata</li>
              <li>✓ Define license terms (AI training, sync, commercial use)</li>
              <li>✓ Register as IP Asset on Story Protocol Aeneid testnet</li>
            </ul>

            <p className="text-gray-300 font-semibold mb-3">Public Catalog</p>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>✓ Browse all registered works</li>
              <li>✓ See creator's verified human badge</li>
              <li>✓ View machine-readable license terms (JSON)</li>
              <li>✓ Link to work on Story Protocol explorer</li>
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
                <li>✓ World ID verification</li>
                <li>✓ Music file upload</li>
                <li>✓ License terms configuration</li>
                <li>✓ Story Protocol registration (Aeneid testnet)</li>
                <li>✓ Public catalog browsing</li>
                <li>✓ License JSON API</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="font-semibold text-gray-300 mb-2">Production Version</p>
              <ul className="text-gray-400 space-y-1">
                <li>✓ All demo features</li>
                <li>✓ Story Protocol mainnet</li>
                <li>✓ Orb in-person verification</li>
                <li>✓ Creator dashboard</li>
                <li>✓ Rights marketplace</li>
                <li>✓ Smart contract enforcement</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-800 pt-8">
          <p className="text-xs text-gray-600">
            Built for World Build 3 Hackathon | World ID + Story Protocol
          </p>
        </div>
      </main>
    </div>
  )
}
