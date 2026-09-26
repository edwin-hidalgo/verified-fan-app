# HANDOFF — ekos

_Last updated: 2026-09-26 (late) · Repo: `~/Documents/verified-fan-app` · Branch: `refocus-create-stream`_

**This file is the source of truth for ekos.** It supersedes the README, the deployed
site, and every loose planning doc in `~/Documents/Onus/` and `~/Downloads/` on
matters of repo state. Where it contradicts them, believe this file and `git log`.

It exists because ekos's history was scattered across three folders and an agent
memory directory, several of the most authoritative-looking documents were stale,
and re-orienting a new session took three parallel agents on 2026-09-21. A handoff
doc was offered on 2026-09-08 and never written. This is that doc.

## 0. The one thing to understand first

The repo contains **two products**. The old one — a World ID + Story Protocol
"verified-human music rights registry", built for the World Build 3 hackathon in
April 2026 — was deliberately sunset in July 2026 and replaced by a **create +
stream consumer app**: photo or feeling in, AI-composed music out, published to a
public feed, with Supabase email auth. World/Story code is quarantined in
`deprecated/`.

Since September 2026 ekos has a **third role**: it is the host codebase for a
bounded research spike on *consented adapters* (see §3). ekos is not currently a
product being shipped. It is a working consumer shell that a time-boxed experiment
is being built inside.

## 1. Where things actually are

| | |
|---|---|
| Working branch | `refocus-create-stream` — **on GitHub as of 2026-09-26** |
| HEAD | `17a8c37` (2026-09-26) — last code change `d4b85d8` (2026-09-10); everything since is docs |
| `main` | `672b205` — the **old hackathon app**. Nine commits behind. Do not merge to it yet |
| Tag `hackathon-final` | `672b205` — the last commit made *during* the hackathon weekend. **NOT the submitted app** (see §7). Pushed |
| Tag `hackathon-as-deployed` | `281c6b4` — the app as it actually shipped and demoed, added 2026-09-26. Pushed |
| Branch `prod/hackathon-email-fix` | `281c6b4` + the creator-field allowlist only, **no guard**; what production now runs. Pushed |
| Branch `archive/hackathon-public` | `281c6b4` + guard + creator-field allowlist (`ccbdacb`); the source of the public archive (§7) |
| Production | `verified-fan-app.vercel.app` — still the **old hackathon build**, redeployed 2026-09-26 from `prod/hackathon-email-fix` (email leak closed, behaviour otherwise unchanged) |
| Hackathon archive | `ekos-world-build-3-hack.vercel.app` — public, read-only, deliberate (§8) |
| Supabase | project `gwafkmkmoaqgsdnvuqzn`, free tier, 30 tracks / 35 plays |
| Spike branch | `spike/consented-adapters` — **does not exist yet** |

**Backed up 2026-09-26.** `origin` now carries `refocus-create-stream`,
`archive/hackathon-public`, `prod/hackathon-email-fix` and both tags. Outgoing history was
scanned for key-like strings (0 hits) and tracked env files (0) before the push. `main` is
untouched and still points at the old app. The PNG walkthrough no longer gates anything
except its own integration check — Codex: *"my September plan prescribed that sequence.
It was wrong."*

## 2. What the app does today

**Auth** — Supabase email + password, "Confirm email" disabled. `src/proxy.ts`
(Next 16 renamed middleware → proxy) refreshes the session and gates `/create` and
`/my-tracks`, redirecting signed-out users to `/login`. One real account:
`pescatios` / edwinhidalgo45@gmail.com / uid `3441a4a9-177d-4e25-8803-7580660219f6`.

**Create** — photo resized client-side to ≤1024px JPEG → `POST /api/describe-image`
→ Claude Haiku (`claude-haiku-4-5-20251001`) returns `{music, moment, style}` and the
image is uploaded to `audio-files/covers/` → user edits description, picks a style and
duration → `POST /api/generate-music` → Replicate `stability-ai/stable-audio-2.5`,
polled every 3s for up to ~5 min → preview → `POST /api/tracks` persists the audio to
Supabase Storage and inserts the row.

**Stream** — `/catalog` public feed with a persistent `AudioPlayer`, `/track/[id]`
detail with share, `/my-tracks` creator dashboard. Play counting is anonymous and
un-deduped, demo-grade by decision.

**Wired:** Supabase (Postgres + Storage + Auth), Replicate, Anthropic.
**Not wired:** Story Protocol, IPFS/Pinata, World ID, Spotify — deprecated or vestigial.

## 3. The spike: consented adapters

**The idea.** Adapt a documented open base model using **one artist's explicitly
consented stems**, enforce permission **at generation time** by looking it up against
a terms record rather than inferring it, log a receipt, and have a working artist
judge the result. The terminating demo:

> **Choose artist → see terms → permission check → actual adapter generation → receipt.**

**The bar that matters** is not the mechanism — it is a working artist hearing the
output and saying *"that's plausibly a product."* Building something demo-able is
explicitly a precondition for talking to artists, counsel or investors again.

**The six questions it must answer with numbers:**

| Question | What it must produce |
|---|---|
| Data floor | Train at three sizes — one song / a few / full catalog. Where does artist-likeness become recognizable? Is one-song training a usable *song-likeness* tier? |
| Quality | Does the best output clear the "plausibly a product" bar? Fixed prompts and seeds, outputs retained, no cherry-picking |
| Unit economics | Dollars and wall-clock **per artist adapter**, one-time setup separated from recurring |
| Routing | Prompt → permission check → adapter selection, for **name** invocations and **style-shaped** prompts, authorized and denied paths, with a receipt |
| Memorization | Does the adapter regurgitate training audio? Build the eval; set pass/review/fail policy *before* judging |
| Revocation | Delete the adapter; show the artist-adapter **pathway** is stopped, including served, cached and queued use. State what happens to already-generated outputs. **Do not claim unknown influence in the base model has been erased** — the earlier "fully gone from generation" wording was corrected to this |

**Hard constraints (non-negotiable):** ~14 calendar days · **$100 total cash ceiling**
(setup $10 / GPU $60 / eval $15 / reserve $15) · paid API smoke tests count against it ·
stems are confidential and never committed or uploaded without confirming consent covers
it · **never fine-tune the shared base on pooled consented audio** (revocation depends on
adapter-level granularity) · no voice cloning (this is a *style* engine) · no live payment
rails · no ONUS code integration · **model-plan approval before any model code**.

**Proposed stack, unapproved:** Stable Audio 3 Medium, frozen base, one LoRA/DoRA-class
adapter per artist, MLX on the M4 Mac (16GB). Rank 16 is a starting guess. Fallback is
private GPU, preferably Replicate. Inference benchmarks do **not** prove training fits in
16GB — that is a day-1 feasibility question. Training code goes in a Python `training/`
sidecar inside this repo; **extend `.gitignore` before its first commit** (venv, caches,
`*.safetensors *.ckpt *.pt *.bin`, `stems/ data/ outputs/ *.wav *.mp3 *.flac`, `.env`).

**Status: nothing has been built. No training has run. No artist has been identified.**

**What a receipt must preserve** (six fields): the original request or selection · any
rewriting applied · the resolved artist/song/model · the grant plus terms version · the
adapter or reference assets actually used · the generation outcome.

**Claims discipline, carried from the research corrections.** Actual adapter usage is
recorded by construction and a contractual pool can be assigned entirely to that artist —
but **neither means 100% of the musical output originated with the artist.** Prompt
name-matching alone is weak evidence (it misreads negation, common names, quotations);
an explicit selection plus authorized execution is far stronger. Style routing is **the
platform's disclosed routing choice, not evidence the user secretly intended that artist**.
A score is not a probability until it is calibrated, and missing evidence is not zero
influence. A newer summary never rehabilitates a claim earlier research retracted.

**What success would NOT establish:** full-chain personal opt-in, per-song causal
percentages, broad customer demand, comprehensive rights clearance, or a scalable
business. Song-level causal attribution is separate research with its own budget and
acceptance criteria and **must not silently enter the two-week scope.**

**The demand finding that shapes it** — from the onus.fm invocation census of 16,706 real
Suno/Udio prompts: only **3.52%** name a real artist, and those skew to megastars who will
never sign with an indie platform. The other ~96.5% ask for styles, genres and moods. So
test **style routing as well as name routing**, and pick the first artist for *willingness
and stem availability*, not demand. A correction on record: that sample does **not** prove
96.5% of all demand is style-shaped — `EKOS-SCOPE-MAP.md` states it too strongly.

**Legal boundaries.** California **AB 2602** voids digital-replica grants lacking a
"reasonably specific description" of intended uses — so store a human-readable
`scope_specificity_text` per grant and make each pathway a separate toggle, never a blanket
grant. Tennessee's **ELVIS Act** covers simulated voice. UMG's Music IP Holdings holds 24+
issued generative-AI patents whose described coverage includes consent-checked generation
and royalty administration; freedom-to-operate review happens *after* the spike, so:
**receipt logging yes, live payment rails no.**

**Honesty invariants** (these are the brand; a generic ML session will trample them):
"kinship, not paternity" — never claim causation from similarity · presence in a dataset ≠
proof a model trained on it · **"documented" and "license-permitted" ≠ "consented"** — reserve
*consented* for explicit, AI-specific, term-attached grants, including whether the grant covers
third-party training infrastructure · modeled figures carry a visible `~` and the word
"modeled" · the villain is extraction without consent, never the technology or its users.

## 4. OPEN ITEMS

**Every ask gets a row, including the ones we are not doing, with the reason.**

| # | Item | Raised | Status |
|---|---|---|---|
| 1 | Commit the JPEG MIME fix | Sep 8 | **done** — `d4b85d8` |
| 2 | **Human-verify create-with-photo E2E (upload a PNG)** | Sep 8 | **OPEN — blocks #3, #4.** Typecheck passing is not an E2E result. Cover-art attachment has never been verified; track #30 has `cover_image_url: null` because of the bug #1 fixed |
| 3 | **Push `refocus-create-stream` + tag `hackathon-final`** | Sep 8 | **OPEN, blocked by #2.** Backup only — not a merge to main, not a production replace |
| 4 | Create `spike/consented-adapters` off the refocus branch | Sep 8 | OPEN, blocked by #3 |
| 5 | Public shareable link for the hackathon build | Sep 10 | **DONE 2026-09-21, WRONG VERSION; REDONE 2026-09-26.** First deploy archived tag `hackathon-final`, which is not the submitted app — Edwin: *"what you archived and what I submitted are vastly different."* Redeployed from `281c6b4` to the same URL; all six pages now match production with similarity 1.000 (§7) |
| 6 | Identify a consenting artist + real consented stems | Sep 8 | **OPEN — the long pole.** License-permitted audio proves plumbing but cannot satisfy the consented-artist demonstration. Find this before spending the 14-day window waiting for files |
| 7 | Approve the model stack before any model code | Sep 10 | **PROPOSAL WRITTEN 2026-09-23 — `SPIKE-STACK.md`, awaiting Edwin.** Licence: commercial adapter use appears available under the Stability AI Community License's conditions (revenue test, attribution, AUP, separate Gemma terms for T5Gemma) — *reviewed, not cleared*. Memory: **measured 2026-09-26** — `sm-music` trains locally at 1.27 s/step with crop matched to the data; the default crop OOMs; `medium` unmeasured (ledger #33) |
| 22 | **Split the spike into Track A and Track B** | Sep 23 (Edwin) | **decided.** Track A = the consent architecture (terms record, permission check, receipt, revocation) using the `everything-hums` song-palette route as its generation engine — no training, no GPU, no artist, ~$0. Track B = the adapter proof, which must work on real music **before** any artist is approached. Edwin: *"we need to have this working even if mvp"* |
| 23 | `everything-hums` song extraction as an invocation mechanism | Sep 23 (Edwin) | **adopted for Track A.** It implements `EKOS-SCOPE-MAP.md` §A1's *second* pathway — audio conditioning — which the spike never tested; only training was ever in scope. Since its v3.71 a record's clusters **choose the nearest voice from a bank** rather than synthesise one, which is this brief's own definition of invocation: routing, not guessing. The artifact is ~1.06 KB of JSON from a 2.6 MB excerpt that is discarded, which makes revocation genuinely demonstrable. It lends timbre, kit and tone — it does **not** generate in an artist's style, so it does not replace Track B |
| 24 | 30-second iTunes previews as the training stems | Sep 23 (Edwin) | **declined, with the reasoning kept.** Three independent reasons: analysing a preview and discarding it is a different act from baking it into distributable weights; it would falsify the spike's own claim in its first experiment (*"license-permitted ≠ consented"*, and previews are not even that); and one 30s preview is ~1 clip against a ~20–50 clip floor. The instinct underneath — do not approach an artist with a hypothetical — is honoured by the Track A/B split instead |
| 26 | "What is 16 kHz?" | Sep 25 (Edwin) | **my error, corrected.** SPIKE-STACK claimed SA3 outputs 16 kHz; it generates stereo at **44.1 kHz**. The 16 kHz was the FMA *dataset packaging*, which the doc then recommended *because* it matched — so the real finding is: **use full-rate FMA audio, not the 16 kHz packaging**, or the adapter learns to produce capped output |
| 27 | "What are rank 16 / dora-rows / steps — and what do you recommend?" | Sep 26 (Edwin) | **answered; defaults replaced with a designed experiment** in SPIKE-STACK: rank held at 16 so the data ladder means something, checkpoint series instead of a step count, content-only captions with no trigger token (a thesis requirement, not an ML preference), one trigger-token A/B, the base-model-with-name control run first, a 3-column prompt matrix, blind forced-choice evaluation, clip length as a first-class variable, budget redirected to paid blind listeners and an artist honorarium |
| 28 | Codex takeover review with `gpt-6-astra` at high effort | Sep 26 (Edwin) | **DONE — `CODEX-REVIEW-2026-09-26.md`, verbatim.** Verdict: *"I would not approve SPIKE-STACK.md as written."* Accepted and applied the same day: the creator-email exposure (#29); the memory figures were CUDA-trainer numbers, not MLX; the licence was "reviewed", not "clear"; Jamendo's suit was dismissed in August; revocation must be a timestamped state, not a deleted grant (deleting destroys the authorization record); a receipt documents an execution, it need not reproduce it; the data-floor design cannot locate a minimum and must be labelled exploratory; checkpoint selection needs a dev set separate from the final evaluation; the trigger-token rationale confused conditioning with authorization — content-only captions stay as an engineering default, the ideological argument is withdrawn; iTunes previews are not cleared for Track A by discarding the audio. **Edwin's three calls, same day:** back up now — **done**; fix the production leak — **done** (#29); Track A keeps the everything-hums engine **on condition the audio fixture is owned, not an iTunes preview, and the voice bank's rights are audited** (#30) |
| 29 | **Archive returned the creator's email** via `GET /api/tracks/[id]` | Sep 26 (Codex) | **fixed on the archive 2026-09-26** (`ccbdacb`: allowlist `id, display_name, world_username, orb_verified, created_at`; verified live — no email in list or detail). **Production fixed the same day** — Edwin's call. Redeployed from `prod/hackathon-email-fix` (`281c6b4` + the one-file allowlist, **no read-only guard**): creator keys went from 8 (incl. `email`, `world_wallet_address`, `world_nullifier_hash`) to 5; `/` and `/catalog` text-identical before and after; `/api/stats` unchanged; `/api/debug` still 200 and `POST …/play` still 401 (its own `x-user-id` check), proving production behaviour is otherwise untouched. The field had been public since migration 004 (July); only Edwin's own address was ever exposed |
| 30 | Track A generation engine: everything-hums palette route vs a stub interface | Sep 26 (Codex A.5 / Edwin) | **decided: keep everything-hums**, because a demo you can hear beats one that cannot make sound. Conditions Edwin accepted: the audio fixture must be **owned** (Apple's Search API terms do not clear iTunes previews for this, whatever is discarded), the recorded **voice bank's rights get audited** before it ships in a demo, and the receipt stores the spec actually used (defect #64). Codex's coupling warning stands on the record |
| 33 | **Day-1 feasibility gate** — does adapter training fit the 16 GB M4? | Sep 26 | **PASSED on attempt 2, conditionally.** `training/runs/gate-2026-09-26.md`. Attempt 1 OOMed Metal at step 0 (default 1300-latent crop = 2.7× zero padding on 45 s files, swap +9 GB). Attempt 2 with crop 480 + grad checkpoint + no compile: **300 steps / 399 s / 1.27 s per step, no OOM**, 3 checkpoints, adapter reloads and changes a same-seed render. Projection ~42 min per adapter, ladder in 2–3 h, $0. **Not measured:** the crop real songs need, and `medium`. Codex's warning was right and is now a number. Pipeline traps recorded in `training/README.md` (`uv run` picks a stray venv) |
| 34 | **Track A: consent architecture** — grant, permission check, receipt, revocation | Sep 26 (Edwin) | **built, awaiting the migration.** Branch `spike/consented-adapters`. Schema 005 + two labelled TEST grants; `src/lib/consent/` (permission, receipts, grants, engine seam); generate-music gated and receipted; status route now authenticated, owner-checked, re-checks the grant every poll and hashes the output; publish asserts receipt ownership, success, hash equality and `output_survival_rule`; six new API routes; `/create` asks "Whose terms?"; `/grants` revokes. Verified so far: 005 and the seeds against a local PG15 cluster with all 11 CHECK constraints proven by violation, 14 assertions on the pure logic, all 8 endpoints 401 unauthenticated, `/grants` gated, build clean, lint back to the repo's standing 19 errors. **Blocked on Edwin running `supabase/RUN-THIS.md`** — no Supabase CLI or management token here, and the service-role key cannot run DDL |
| 32 | "Would it be better to get music from an actual artist first?" | Sep 26 (Edwin) | **decided: yes, but after a 2-day feasibility gate.** Recruiting for the product stays off the table; a bounded private paid ask to one known artist is a different, smaller thing — and the written terms of that ask are Track A's first grant record. Clock starts when files arrive; honorarium inside the $100; FMA becomes the labelled fallback. Edwin: *"let's continue in that case"* |
| 31 | Production still serves `/api/debug/users-tracks` (every user's wallet + username) | Sep 26 | **open, low severity, pre-existing since April.** Wallets are public-chain data and the comment on the route says remove before production. Blocked on the archive; on production it would need another redeploy — fold into whatever replaces production rather than a third deploy now |
| 25 | Where Track B's training audio comes from | Sep 23 | **decided.** **Jamendo rejected** — as a reputational call, not a legal one. (An earlier version of this row said Jamendo was "currently suing" Suno; it voluntarily dismissed without prejudice on 2026-08-13 — stale premise, caught by Codex. The dismissal is not a merits ruling either way.) Use the **Free Music Archive commercially-usable subset** (one artist with enough catalogue for all three data sizes), with Edwin's **own ekos catalogue as run zero** since he owns those Stable Audio outputs. Any CC-BY result is a feasibility finding, **never** a consent demonstration |
| 8 | Write the hackathon's AI integration into `CAREER-AND-PORTFOLIO.md` | Sep 10 | **OPEN** — the other half of the turn Codex was cut off mid-way through |
| 9 | 29 legacy hackathon tracks not re-linked to pescatios | Jul / Sep 8 | **OPEN, and needs a decision.** They belong to old World-ID users. Planned one-time `UPDATE tracks SET user_id='3441a4a9-…'`, never executed; whether to rewrite `artist_name` too was never settled. `EKOS-SPIKE-PLAN.md` silently drops the item — **ask Edwin whether it is cancelled or forgotten** |
| 10 | `/catalog` license filter pills are dead UI | Jul | OPEN — off-message. Nothing sets `ai_training_allowed` / `sync_allowed` / `commercial_use_allowed`, so all three always render `(0)` |
| 11 | README describes the dead hackathon product | Apr | OPEN |
| 12 | Cover upload coupled inside `/api/describe-image` | Jul | OPEN — a Claude failure loses the cover |
| 13 | No edit-profile UI | Jul | OPEN — display name settable only at signup |
| 14 | No password-reset screen | Sep 10 | OPEN |
| 15 | `.env.example` is stale | — | OPEN — omits `REPLICATE_API_TOKEN` (which the app cannot run without), still lists dead World/Spotify vars |
| 16 | `metadataBase` is `http://localhost:3000` in `src/app/layout.tsx` | — | OPEN — breaks absolute OG/social URLs in production |
| 17 | Unique @handles + public creator profiles | Jul | **deferred by decision** — bundled as one future feature, additive, no lock-in |
| 18 | License-terms collection UI | Jul | **dropped on purpose.** The spike's minimal *terms record* is a different, new thing — do not let this memory talk you out of building it |
| 19 | Play-count dedup | Jul | **dropped on purpose** — open streaming, demo-grade metric |
| 20 | Impersonation / anti-scam, watermark detection, full accounts audit | Sep 8 | **parked warm, post-spike** — pointers in `EKOS-SCOPE-MAP.md` §D |
| 21 | Story PIL integration | Sep 8 | deferred — schema informed by it, infra later at most |

## 5. Stale documents — do not trust these

| Doc | What it gets wrong |
|---|---|
| `~/Downloads/HANDOFF-EKOS.md` (Jul 29) | **The most dangerous one.** Orders *"freeze feature work"* and rules that the rights/provenance layer **never returns to ekos** — the September spike does exactly that, inside this repo. Superseded |
| `README.md` (this repo) | The April hackathon pitch. Lists routes and libs that now live in `deprecated/` |
| `~/Documents/Onus/MASTER-CONTEXT-V3.md` | Contradicts itself in-file: §2 lists ekos as frozen, the header annotation says reactivated. The annotation wins |
| `~/Documents/Onus/EKOS-HANDOFF-SEPT.md` (Sep 8) | Still excellent on codebase internals. Stale on two facts: says the JPEG fix is uncommitted and HEAD is `6210d3e` |
| `~/Documents/Onus/EKOS-SCOPE-MAP.md` | States "~96.5% of measured demand is style-shaped" as fact; `EKOS-SPIKE-PLAN.md` retracts the overstatement |
| memory `project_context.md` | Describes the dead April World Mini App |
| **Tag `hackathon-final`** | Its name says "final"; it is the last commit of the weekend, and the submitted app carried uncommitted work on top of it. Trusting the name shipped the wrong archive once. Use `hackathon-as-deployed` |
| The deployed `verified-fan-app.vercel.app` | The dead hackathon product, not this codebase |

**Current:** `SPIKE-STACK.md` and `CODEX-REVIEW-2026-09-26.md` in this repo.
**Historical, still worth reading:** `~/Documents/Onus/EKOS-SPIKE-PLAN.md` (2026-09-10),
`EKOS-SCOPE-MAP.md` (the licensing research), `ONUS-CODEX-HANDOFF.md` (full reasoning).
`STUDIO-SPIKE-BRIEF.md` still carries the retracted "fully gone from generation" wording,
the overstated demand inference and obsolete repo state — read it as the original contract,
not as current instruction.

## 6. Traps

- **Next.js 16.** `src/proxy.ts`, not `middleware.ts`. `cookies()` is async. `AGENTS.md`
  mandates reading `node_modules/next/dist/docs/` before writing code — tutorials mislead.
- **Two Supabase server clients** in `src/lib/supabase/server.ts`: service-role (bypasses
  RLS) and anon cookie-bound. Mixing them is a security bug. **All** server writes use
  service-role, so the migration-001 RLS policies are effectively unused and were never
  updated for email auth — adding a client-side Supabase query is how that becomes a hole.
- **Replicate output URLs expire.** Audio is persisted only at publish. Spike experiments
  must persist their own outputs deliberately or the comparison runs vanish.
- **Supabase free tier auto-pauses after ~7 days idle.** If everything 500s and the DB host
  stops resolving, it is a pause, not a bug — check the dashboard first. An UptimeRobot
  monitor pings `/api/stats` (a real DB query) to prevent it, and appears to be working:
  the project was awake on 2026-09-21 after 11 idle days. It already paused once, in June.
- **The archive shares this same Supabase project**, so a pause takes the public portfolio
  link down too.
- **Owner context.** Edwin is a PM, not an engineer. He runs dashboard steps when guided,
  expects proactive issue-catching, and wants big scope changes planned and confirmed, not
  sprung. He also asks for genuine assessments over agreeable ones.

## 7. The hackathon archive

The April 2026 build is published read-only at **https://ekos-world-build-3-hack.vercel.app**
(Vercel project `ekos-world-build-3-hack`, no SSO, separate from `verified-fan-app`) so it
can be linked from Edwin's website.

**Source is `281c6b4`, tagged `hackathon-as-deployed` — not the `hackathon-final` tag.**
The first archive (2026-09-21) was cut from `hackathon-final` (`672b205`) and Edwin caught
it immediately: *"that is not what it looked like when I submitted it."* That tag is the
last commit made during the hackathon weekend, but the submitted app shipped with work
that stayed uncommitted until it was captured on 2026-06-30 as `281c6b4`. Every
distinctive string on production — "first rights registry where only humans", "rail
problem", "Read the ekos lightpaper", "The Entry Point", "A neutral rail" — exists at
`281c6b4` and none at `672b205`; the nav reads **Feed** there and **Catalog** at the tag.
Redeployed 2026-09-26 to the same URL. Text parity is what was verified — not pixel
parity, playback in a real browser, or cover art; those remain manual checks.

**The lesson is about verification, not the commit.** The first pass checked HTTP 200s,
403s on write paths and that audio elements rendered — all true, all beside the point. The
archive is now verified by rendering it and production headless and diffing the extracted
text page by page: `/`, `/about`, `/lightpaper`, `/catalog`, `/verify`, `/register` all
read **similarity 1.000, zero differing lines**. That is the check to repeat on any redeploy.

Deployed source is branch **`archive/hackathon-public`** = `281c6b4` plus a single
`src/proxy.ts`. **The guard is not optional:** the build authenticated only in localStorage
and its API routes enforced nothing, so without it a public link lets anyone write rows
into the live Supabase project or spend real money on Replicate and Anthropic. It returns
403 to every non-GET on `/api/*` **and** to `/api/debug/*` — `281c6b4` carries a debug
route whose own comment says *"Remove this before shipping to production!"* and which
enumerates every user with wallet and username. The deployment sets only the three Supabase
vars and omits `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `PINATA_JWT` and `STORY_*`.
**These are not two independent locks** (a claim this section used to make): the archive
holds the service-role key, so any *read* path can leak whatever it selects. One did —
`GET /api/tracks/[id]` returned the creator's email until `ccbdacb` allowlisted the
fields. Production still does (§4 ledger #29).

Verified at redeploy: six pages identical to production, all write/spend paths and the
debug route 403, no JWT embedded in delivered HTML, `/api/stats` unchanged at 30 tracks /
35 plays before and after, production and `main` untouched.

To redeploy: `git worktree add --detach <dir> archive/hackathon-public` → clone
`node_modules` in (`cp -Rc`; a symlink breaks Turbopack) →
`vercel link --project ekos-world-build-3-hack --yes` → `vercel deploy --prod --yes` →
**diff the rendered text against production before calling it done.**

**A correction to the older docs:** they record Story registration as never having worked
end-to-end. The data disagrees — **21 of 23** catalog tracks carry a distinct `story_ip_id`,
tx hash and IPFS CID, and the metadata resolves (verified via `gateway.pinata.cloud`, which
works where `ipfs.io` and `dweb.link` now 429). What was unfinished was the `ipMetadataHash`
fix in `deprecated/lib/story/register.ts`, not registration itself. Do not undersell it.

## 8. Next work, in order

1. **Edwin verifies create-with-photo E2E** — sign in, upload a PNG, generate ~15s, publish,
   confirm the cover image appears. Costs a little Replicate credit. An integration check
   now, not a gate.
2. ~~Push the branch and tag.~~ **Done 2026-09-26.**
3. **Cut `spike/consented-adapters`**, extend `.gitignore` first. No longer blocked.
4. **Approve the model stack**, then day-1 feasibility: does Stable Audio 3 Medium training
   actually fit in 16GB, and can the full experiment fit the remaining cap at measured
   throughput? If neither local nor private GPU fits, stop and report the feasibility failure.
5. **The artist comes after Tracks A and B both work** — Edwin's rule, reaffirmed 2026-09-25.
   What can run in parallel is *identifying* the data supply for Track B: actual files,
   usable minutes, independent songs, licences, held-out songs. "An FMA artist with enough
   catalogue" is a dependency, not a dataset, until that list exists.

A negative result is an acceptable terminating outcome. A spike that does not terminate has
become the product by accident.
