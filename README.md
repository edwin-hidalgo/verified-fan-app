# ekos — The Music Trust Layer for the AI Era

**The first rights registry where only humans can register music.**

ekos combines World ID (proof-of-humanity), Story Protocol (on-chain IP ownership), and AI-native licensing to create a neutral registry for verified human creators.

## The Problem

- AI music supply is infinite. Verified-human music isn't.
- $2B/year lost to streaming fraud
- 60,000 AI tracks/day uploaded to Deezer (39% of daily intake)
- 85% of streams on AI-generated tracks were fraudulent in 2025

## The Solution

**Three pillars:**
1. **World ID Orb Verification** — Only verified humans can register works. Pseudonymity preserved, sybil attacks blocked.
2. **Story Protocol Native** — Every work becomes an on-chain IP Asset with programmable license terms. Portable, composable, auditable.
3. **AI-Native License Types** — First-class support for AI training licenses — the category every other registry ignores.

## Core Features

### Moments
The easiest on-ramp into verified-human music. Describe what you're feeling, AI composes music, you register it on-chain with your verified identity. One flow = identity + ownership + licensing.

### Register Your Music
Upload your own track, set license terms (AI training allowed, sync rights, commercial use), register as an IP Asset on Story Protocol with machine-readable terms.

### Catalog
Browse registered moments and tracks. See who created them. License terms visible at a glance.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS v4
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Storage)
- **Blockchain:** Story Protocol SDK (IP Asset registration), Viem (ABI encoding)
- **Identity:** World ID (Orb verification), MiniKit
- **Audio:** Replicate API (music generation)
- **Storage:** IPFS/Pinata (metadata), Supabase Storage (audio files)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone the repo
git clone https://github.com/edwin-hidalgo/verified-fan-app.git
cd verified-fan-app

# Install dependencies
npm install

# Create .env.local with required variables:
# - NEXT_PUBLIC_DEV_MODE=true (for dev testing without World App)
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - STORY_PRIVATE_KEY
# - STORY_SPG_NFT_CONTRACT
# - REPLICATE_API_TOKEN
# - PINATA_JWT

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Development Mode

Set `NEXT_PUBLIC_DEV_MODE=true` to skip World App requirement and use mock World ID verification for local testing.

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Landing page
│   ├── create/            # Moments creation flow
│   ├── register/          # Upload & register music flow
│   ├── catalog/           # Browse registered works
│   ├── lightpaper/        # Full thesis document
│   └── api/               # Backend routes
├── components/            # React components
├── lib/
│   ├── story/            # Story Protocol integration
│   ├── ipfs/             # IPFS/Pinata integration
│   ├── license/          # License term schemas & utilities
│   └── hooks/            # React hooks (auth, etc)
└── types/                # TypeScript definitions
```

## Key Routes

- `/` — Landing page
- `/create` — Create a Moment (AI-generated music)
- `/register` — Upload & register your music
- `/catalog` — Browse all registered works
- `/verify` — World ID verification
- `/lightpaper` — Full business & technical thesis

## License Terms

Each registered work includes machine-readable license terms:
- **AI Training Allowed** — Can AI companies use this for training?
- **Sync Licensing** — Available for film/TV/ads at specified price?
- **Commercial Use** — Can others monetize derivative works? Revenue share %.

Terms are stored immutably on Story Protocol and queryable by AI companies and music supervisors.

## Roadmap

**Phase 1 (now):** Creator identity + works + AI-training license terms. Verified humans register, AI companies can query.

**Phase 2:** Buyer flow. AI companies browse, license, and pay via USDC. Real commercial transactions.

**Phase 3:** Sync licensing self-serve. Music supervisors query the registry at their price point.

**Phase 4:** Verified listeners. User-centric streaming payments, direct fan tips, sybil-resistant metrics.

**Phase 5:** Usage ingestion. Oracles from DSPs and AI pipelines route royalties programmatically.

**Phase 6:** The registry becomes a standard. Integrations with MLC, PROs, DDEX. The new default rail for music.

## Deployment

Live at: https://verified-fan-app.vercel.app

Deployed on Vercel. Environment variables configured in Vercel dashboard.

## Resources

- [Lightpaper](/lightpaper) — Full thesis on the opportunity, architecture, and roadmap
- [Story Protocol Docs](https://docs.story.foundation/)
- [World ID Docs](https://docs.worldcoin.org/)

---

Built for World Build 3 Hackathon | April 23-26, 2026
