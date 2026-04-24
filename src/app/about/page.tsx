'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Back button */}
        <Link href="/" className="text-gray-400 hover:text-white font-semibold">
          ← Back to Home
        </Link>

        {/* Thesis */}
        <section className="space-y-6">
          <h1 className="text-4xl font-bold">The Thesis</h1>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 space-y-4">
            <p className="text-gray-300 leading-relaxed">
              The music industry is held together by opacity. Ownership, rights, and usage are fragmented across intermediaries — labels, CMOs, distributors, DSPs — each extracting value by controlling the translation between what a work is, who made it, and what it's allowed to be used for.
            </p>
            <p className="text-gray-300 leading-relaxed">
              AI is accelerating the urgency. 60 million people made music with AI in 2024. Platforms have no way to distinguish verified human work from AI-generated flood. Traditional music rights systems have no model for "AI training as a licensable use" — it doesn't exist yet.
            </p>
            <p className="text-gray-300 leading-relaxed">
              This is the seed of a replacement: a music-native rights protocol where verified human creators register works with machine-readable license terms (including AI training terms), and listeners see verified human engagement (not inflated metrics). Supply side: provenance disclosure. Demand side: authentic human adoption.
            </p>
            <p className="text-green-400 font-semibold">
              The infrastructure exists. World ID proves humanity. Story Protocol hosts IP Assets on-chain. The missing layer is the music-specific vertical application that composes them into a workable protocol for the music industry.
            </p>
          </div>
        </section>

        {/* Why Now */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Why This, Why Now</h2>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">The Infrastructure is Ready</h3>
              <p className="text-gray-400 text-sm">
                Story Protocol announced a partnership with World ID in July 2025. World began rolling out full-stack proof of human as a native capability in April 2026. The infrastructure for verified-human IP ownership already exists — we're not building it, we're composing it.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">The Need is Acute</h3>
              <p className="text-gray-400 text-sm">
                AI-generated music flooded platforms in 2024. Creators want a way to disclose origin. AI companies want legal clarity on training rights. Sync supervisors want queryable metadata. None of these use cases are served by legacy infrastructure. This is the wedge.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">The Moat is Specificity</h3>
              <p className="text-gray-400 text-sm">
                Story Protocol is horizontal — it hosts all IP types. World ID is identity-agnostic. Neither knows about ISRC, split sheets, sync cue sheets, or AI training as a license type. A vertical music application layered on top of both becomes the reference implementation for how music works in a post-AI-flood world.
              </p>
            </div>
          </div>
        </section>

        {/* Creator Background */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">About the Creator</h2>
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-8 space-y-4">
            <p className="text-gray-300 leading-relaxed">
              This protocol is built by Edwin Hidalgo, a music + crypto native with 7+ years in the space:
            </p>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li>
                <span className="font-semibold text-blue-400">NEWM (2018–2021)</span>
                <p className="text-gray-400 mt-1">
                  Led product for a tokenized royalty platform. Shipped on Ethereum mainnet. Learned what works and what doesn't in music crypto. The thesis here incorporates those lessons: infrastructure-first, not hype-first.
                </p>
              </li>
              <li>
                <span className="font-semibold text-blue-400">Story Protocol (2023–2024)</span>
                <p className="text-gray-400 mt-1">
                  Deep relationships with the core team. Hands-on understanding of PIL (Programmable IP License), IP Asset design, and the on-chain infrastructure. This app extends Story with music-native metadata and license types.
                </p>
              </li>
              <li>
                <span className="font-semibold text-blue-400">OKX + JPMorgan (2021–2023)</span>
                <p className="text-gray-400 mt-1">
                  Worked on institutional crypto infrastructure and payments. Understands both compliance and the technical rails needed for real settlement. This informs how the protocol is architected for eventual payment routing.
                </p>
              </li>
              <li>
                <span className="font-semibold text-blue-400">WAX + Soundmap (2019–2024)</span>
                <p className="text-gray-400 mt-1">
                  Exploration of music identity, discovery provenance, and listener relationships. Music IP is not just about rights — it's about understanding who listens and why.
                </p>
              </li>
            </ul>
            <p className="text-gray-300 text-sm pt-4 border-t border-gray-700">
              This combination of depth in music, rights infrastructure, and institutional crypto is rare. The protocol is designed by someone who has lived in all three worlds and learned from past mistakes.
            </p>
          </div>
        </section>

        {/* Next Steps */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">What Comes Next</h2>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Year 1: Wedge Validation</h3>
              <p className="text-gray-400 text-sm">
                This hackathon is the seed. In Year 1, we validate that AI training licensing is a real commercial need (not just a nice-to-have). Onboard 100+ creators and 2-3 AI company partners. Prove adoption.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Years 2–3: Substrate Thickening</h3>
              <p className="text-gray-400 text-sm">
                Expand to sync licensing, creator royalty splits, verified human provenance surface (Wedge 2), and listener-to-creator direct payment (Wedge 3). Build up the metadata and rights substrate until AI companies, DSPs, and sync supervisors treat it as a necessary integration.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Years 3+: Irrelevance of Legacy</h3>
              <p className="text-gray-400 text-sm">
                New creators default to the protocol. Legacy catalog administration continues in parallel. By year 5-10, the new rail has become the standard. The old system becomes a legacy business, not the gatekeeper.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center border-t border-gray-800 pt-8">
          <p className="text-xs text-gray-600">
            Verified Human Music Registry | World Build 3 Hackathon 2026
          </p>
        </div>
      </div>
    </div>
  )
}
