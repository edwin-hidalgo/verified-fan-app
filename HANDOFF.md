# HANDOFF — ekos

_Last updated: 2026-09-28 (takeover reconciliation; hackathon demo-mode decided) · Repo: `~/Documents/verified-fan-app` · Working branch: `spike/consented-adapters` — **this branch's copy of this file is canonical**; the copy on `refocus-create-stream` stopped at 2026-09-26 01:57 and is stale_

> **Start ekos sessions from `~/Documents/verified-fan-app`.** Every ekos chat from 2026-09-20 to
> 2026-09-26 was opened from `~/Documents/everything-hums`, so this file, `AGENTS.md` and the ekos
> agent memory never loaded automatically — each session had to find them by hand.

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
| Working branch | `spike/consented-adapters` — HEAD `1d5552d` (2026-09-26). Track A code + the `training/` sidecar. Pushed |
| `refocus-create-stream` | `a259d3b` — the create+stream app before the spike. The spike branch is cut from it. Pushed |
| `main` | `672b205` — the **old hackathon app**. Do not merge to it |
| Tag `hackathon-final` | `672b205` — the last commit made *during* the hackathon weekend. **NOT the submitted app** (see §7). Pushed |
| Tag `hackathon-as-deployed` | `281c6b4` — the app as it actually shipped and demoed, added 2026-09-26. Pushed |
| Branch `prod/hackathon-email-fix` | `281c6b4` + `d6ee9a2` (creator-field allowlist) only, **no guard**; what production ran until 2026-09-28. Pushed |
| Branch `archive/hackathon-public` | `281c6b4` + `bcaad55` (read-only guard) + `ccbdacb` (allowlist) + `885e116` (crash fix) + `eec8f6b`/`e3aea80` (demo mode + switch); the source of the public archive (§7), deployed 2026-09-28. Pushed |
| Branch `prod/hackathon-demo` | `prod/hackathon-email-fix` + crash fix + `7324ace`/`26847fc` (demo mode + switch); **what production runs since 2026-09-28**. Pushed |
| Production | `verified-fan-app.vercel.app` — the hackathon build **in demo mode since 2026-09-28** (#42), deployed from `prod/hackathon-demo`, and **what the World App mini app opens**. No Replicate/Anthropic/Pinata/Story-wallet keys on the project. Crash (#39), debug route (#31), verify hole (#55) and explorer links (#56) fixed. Linked from edwinhidalgo.com |
| Hackathon archive | `ekos-world-build-3-hack.vercel.app` — public, read-only, deliberate (§7) |
| The new app (create+stream + Track A) | **Not deployed.** Runs locally only (`npm run dev` → localhost:3000). Will get its **own** link when ready — production stays the hackathon (#42) |
| Supabase | project `gwafkmkmoaqgsdnvuqzn`, free tier, **shared by production, the archive and the new app**. 31 tracks / 35 plays on 2026-09-28 |

**Backed up 2026-09-26.** `origin` carries every branch above and both tags; `git ls-remote`
matched local on 2026-09-27. Outgoing history was scanned for key-like strings (0 hits) and
tracked env files (0) before the first push. The PNG walkthrough no longer gates anything
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

**On `spike/consented-adapters` the flow is gated (Track A, #34).** `/create` asks *"Whose
terms?"* — no grant, no generation — and offers a second engine, *"your own audio file"*: the
vendored everything-hums palette engine renders in the browser, the file never leaves it, and
the receipt stores the ~1.2 KB spec that voiced it. `/grants` lists grants and revokes them.

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
(the original split — setup $10 / GPU $60 / eval $15 / reserve $15 — is obsolete; see *Budget,
as of 2026-09-28* below) · paid API smoke tests count against it ·
stems are confidential and never committed or uploaded without confirming consent covers
it · **never fine-tune the shared base on pooled consented audio** (revocation depends on
adapter-level granularity) · no voice cloning (this is a *style* engine) · no live payment
rails · no ONUS code integration · **model-plan approval before any model code**.

**The stack — `SPIKE-STACK.md`, still not formally approved.** Stable Audio 3, frozen base,
one DoRA adapter per artist (`dora-rows`, rank 16 held fixed), MLX on the M4 Mac (16GB);
`small` to shake out the pipeline, `medium` for anything judged by ear. The `training/`
sidecar exists with `.gitignore` extended before its first commit, as required. The day-1
gate ran on Edwin's *"let's continue in that case"* (2026-09-26) — an authorization for the
gate, **not** an approval of `SPIKE-STACK.md`, whose status line still reads "awaiting
Edwin's approval". Its open decisions are ledger #7.

**Status, 2026-09-28.** **Track A (the consent architecture) is built** and verified against
the live project (#34, with the caveats in #45–#47). **The gate passed conditionally** (#33):
`sm-music` trains locally at crop 480 — `medium` and real-song crop lengths are unmeasured.
**No adapter has been trained on real music. No artist material exists.** Edwin will ask an
artist friend for music *later* (#6), free, with written terms.

**Budget, as of 2026-09-28: ≈ $0 cash.** The friend's music is free (Edwin: *"i have artist
friends that will be happy to let me use their music for free"*); blind listeners will be
friends, unpaid — they must not be the artist whose music trained the adapter, and ideally
not Edwin, who would know which clip is which. The only possible spend is a **≤ $20 one-time**
rented GPU, and only if `medium` does not fit the Mac. Renting means uploading the friend's
music to that provider, so **the written terms must permit cloud processing** or the spike
stays local and judges on `small`, labelled as such. This replaces the Sep 26 plan's
$120–200 estimate, which had quietly exceeded the $100 ceiling.

**The 14-day clock starts at the first training run** (Edwin, 2026-09-28: *"maybe first
training run?"* — tentative; confirm before the run).

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

**Legal boundaries** (wording corrected per Codex review C.13, 2026-09-26). California
**AB 2602** does *not* categorically void every insufficiently specific grant: it addresses
particular personal/professional-services provisions and defined voice/likeness replicas,
with conditions and an exception, and it does not regulate instrumental style resemblance.
Storing a human-readable `scope_specificity_text` per grant and making each pathway a
separate toggle is a design choice it motivates, not a mandate. Tennessee's **ELVIS Act**
covers simulated voice. UMG's Music IP Holdings announced **more than 24 issued *and
allowed*** generative-AI patents whose described coverage includes consent-checked
generation and royalty administration. Freedom-to-operate review happens *after* the spike —
a scope decision with residual risk, not a safe harbour — so: **receipt logging yes, live
payment rails no.**

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
| 2 | **Human-verify create-with-photo E2E (upload a PNG)** | Sep 8 | **OPEN — gates nothing** (Codex, Sep 26). Run it on the **new app, locally** (not the hackathon site): localhost:3000 → sign in → `/create` → PNG → TEST GRANT A (not revoked) → hosted model → Snippet 15s → Generate → Publish → confirm the cover shows. Costs cents. It is also the only way to exercise the hosted path's receipt completion + output hash with a real paid generation (#46). Cover-art attachment has never been verified; track #30 has `cover_image_url: null` because of the bug #1 fixed |
| 3 | Push `refocus-create-stream` + tag `hackathon-final` | Sep 8 | **done 2026-09-26** — every branch and both tags are on `origin` |
| 4 | Create `spike/consented-adapters` off the refocus branch | Sep 8 | **done 2026-09-26** (`205e12b`, `.gitignore` extended first) |
| 5 | Public shareable link for the hackathon build | Sep 10 | **DONE 2026-09-21, WRONG VERSION; REDONE 2026-09-26.** First deploy archived tag `hackathon-final`, which is not the submitted app — Edwin: *"what you archived and what I submitted are vastly different."* Redeployed from `281c6b4` to the same URL; all six pages now match production with similarity 1.000 (§7) |
| 6 | Identify a consenting artist + real consented stems | Sep 8 | **OPEN — Edwin, later.** 2026-09-28: an artist friend, free, *"when time comes"*. The written terms of that ask are Track A's first real grant record and must say whether cloud processing is allowed (§3 budget). License-permitted audio proves plumbing but cannot satisfy the consented-artist demonstration. Nothing in Track A waits on it; Track B does |
| 7 | Approve the model stack before any model code | Sep 10 | **STILL NOT FORMALLY APPROVED.** The gate ran on *"let's continue"* (Sep 26), which authorized the gate only. Edwin's three decisions, as of 2026-09-28: **(a)** music source = an artist friend with written terms, later — FMA is the labelled fallback; **(b)** if `medium` does not fit the Mac: rent ≤ $20 one-time (terms must permit cloud processing) *or* judge on `small`, labelled — **undecided**; **(c)** the result is exploratory ("what worked for one artist"), never "the minimum songs needed" — presented, not yet confirmed. Everything else in the doc is engineering. **Proposal written 2026-09-23 — `SPIKE-STACK.md`.** Licence: commercial adapter use appears available under the Stability AI Community License's conditions (revenue test, attribution, AUP, separate Gemma terms for T5Gemma) — *reviewed, not cleared*. Memory: **measured 2026-09-26** — `sm-music` trains locally at 1.27 s/step with crop matched to the data; the default crop OOMs; `medium` unmeasured (ledger #33) |
| 22 | **Split the spike into Track A and Track B** | Sep 23 (Edwin) | **decided.** Track A = the consent architecture (terms record, permission check, receipt, revocation) using the `everything-hums` song-palette route as its generation engine — no training, no GPU, no artist, ~$0. Track B = the adapter proof, which must work on real music **before** any artist is approached. Edwin: *"we need to have this working even if mvp"*. (Sequencing refined by #32 on Sep 26: a bounded private ask to one known artist may follow the day-1 gate; recruiting for the product still waits) |
| 23 | `everything-hums` song extraction as an invocation mechanism | Sep 23 (Edwin) | **adopted for Track A.** It implements `EKOS-SCOPE-MAP.md` §A1's *second* pathway — audio conditioning — which the spike never tested; only training was ever in scope. Since its v3.71 a record's clusters **choose the nearest voice from a bank** rather than synthesise one, which is this brief's own definition of invocation: routing, not guessing. The artifact is ~1.06 KB of JSON from a 2.6 MB excerpt that is discarded, which makes revocation genuinely demonstrable. It lends timbre, kit and tone — it does **not** generate in an artist's style, so it does not replace Track B |
| 24 | 30-second iTunes previews as the training stems | Sep 23 (Edwin) | **declined, with the reasoning kept.** Three independent reasons: analysing a preview and discarding it is a different act from baking it into distributable weights; it would falsify the spike's own claim in its first experiment (*"license-permitted ≠ consented"*, and previews are not even that); and one 30s preview is ~1 clip against a ~20–50 clip floor. The instinct underneath — do not approach an artist with a hypothetical — is honoured by the Track A/B split instead |
| 26 | "What is 16 kHz?" | Sep 25 (Edwin) | **my error, corrected.** SPIKE-STACK claimed SA3 outputs 16 kHz; it generates stereo at **44.1 kHz**. The 16 kHz was the FMA *dataset packaging*, which the doc then recommended *because* it matched — so the real finding is: **use full-rate FMA audio, not the 16 kHz packaging**, or the adapter learns to produce capped output |
| 27 | "What are rank 16 / dora-rows / steps — and what do you recommend?" | Sep 26 (Edwin) | **answered; defaults replaced with a designed experiment** in SPIKE-STACK: rank held at 16 so the data ladder means something, checkpoint series instead of a step count, content-only captions with no trigger token (originally argued as "a thesis requirement, not an ML preference" — **that argument was withdrawn in #28**; content-only captions stay as an engineering default), one trigger-token A/B, the base-model-with-name control run first, a 3-column prompt matrix, blind forced-choice evaluation, clip length as a first-class variable, budget redirected to paid blind listeners and an artist honorarium |
| 28 | Codex takeover review with `gpt-6-astra` at high effort | Sep 26 (Edwin) | **DONE — `CODEX-REVIEW-2026-09-26.md`, verbatim.** Verdict: *"I would not approve SPIKE-STACK.md as written."* Accepted and applied the same day: the creator-email exposure (#29); the memory figures were CUDA-trainer numbers, not MLX; the licence was "reviewed", not "clear"; Jamendo's suit was dismissed in August; revocation must be a timestamped state, not a deleted grant (deleting destroys the authorization record); a receipt documents an execution, it need not reproduce it; the data-floor design cannot locate a minimum and must be labelled exploratory; checkpoint selection needs a dev set separate from the final evaluation; the trigger-token rationale confused conditioning with authorization — content-only captions stay as an engineering default, the ideological argument is withdrawn; iTunes previews are not cleared for Track A by discarding the audio. **Edwin's three calls, same day:** back up now — **done**; fix the production leak — **done** (#29); Track A keeps the everything-hums engine **on condition the audio fixture is owned, not an iTunes preview, and the voice bank's rights are audited** (#30) |
| 29 | **Archive returned the creator's email** via `GET /api/tracks/[id]` | Sep 26 (Codex) | **fixed on the archive 2026-09-26** (`ccbdacb`: allowlist `id, display_name, world_username, orb_verified, created_at`; verified live — no email in list or detail). **Production fixed the same day** — Edwin's call. Redeployed from `prod/hackathon-email-fix` (`281c6b4` + the one-file allowlist, **no read-only guard**): creator keys went from 8 (incl. `email`, `world_wallet_address`, `world_nullifier_hash`) to 5; `/` and `/catalog` text-identical before and after; `/api/stats` unchanged; `/api/debug` still 200 and `POST …/play` still 401 (its own `x-user-id` check), proving production behaviour is otherwise untouched. The field had been public since migration 004 (July); only Edwin's own address was ever exposed |
| 30 | Track A generation engine: everything-hums palette route vs a stub interface | Sep 26 (Codex A.5 / Edwin) | **decided: keep everything-hums**, because a demo you can hear beats one that cannot make sound. Conditions Edwin accepted: the audio fixture must be **owned** (Apple's Search API terms do not clear iTunes previews for this, whatever is discarded), the recorded **voice bank's rights get audited** before it ships in a demo, and the receipt stores the spec actually used (defect #64). Codex's coupling warning stands on the record |
| 33 | **Day-1 feasibility gate** — does adapter training fit the 16 GB M4? | Sep 26 | **PASSED on attempt 2, conditionally.** `training/runs/gate-2026-09-26.md`. Attempt 1 OOMed Metal at step 0 (default 1300-latent crop = 2.7× zero padding on 45 s files, swap +9 GB). Attempt 2 with crop 480 + grad checkpoint + no compile: **300 steps / 399 s / 1.27 s per step, no OOM**, 3 checkpoints, adapter reloads and changes a same-seed render. Projection ~42 min per adapter, ladder in 2–3 h, $0. **Not measured:** the crop real songs need, and `medium`. Codex's warning was right and is now a number. Pipeline traps recorded in `training/README.md` (`uv run` picks a stray venv) |
| 35 | **The "service-role" client does not bypass RLS** | Sep 26 | **fixed, and it is a repo-wide correction.** `createServerSupabaseClient` passes the service key but `@supabase/ssr` binds the session from cookies, so a signed-in request acts as THAT USER and RLS applies — the opposite of what this file and the function's own comment claimed. Measured: the same UPDATE touched 1 row via a plain client, 0 rows via the cookie-bound one, **error null both times**. `receipts` had no UPDATE policy, so completion silently no-opped while the route logged success. Three fixes: `createAdminClient()` (service key, no session) for all consent routes; `completeReceipt` warns and the route 500s when a write matches no rows; migration **006** adds the policies 005 implied. Every existing server write in this app has been running as the user, not service role, and works only because permissive policies happen to exist |
| 36 | **Palette engine vendored** — the demo is audible | Sep 26 | **done, `src/lib/palette/`.** ~112 KB, browser-only, patches-only: zero audio assets, zero rights surface, `familiesNeeded()` returns `[]` on real files. No iTunes code — `decodeFile` only, so the input is a file the person already has and it never leaves the browser. Uses `chooseVoices` (deterministic) and never `voiceFromCluster` (defect #64). `RESIDUAL_BANDS` inlined to avoid dragging in 95 KB for a 4-element array. Proven end-to-end in a real browser via CDP: file attached through the actual `/create` file input, audio rendered, receipt written. `everything-hums` has no LICENSE file — Edwin is the author, so a formality before this is shown outside, but **it is that project's call, made in that project's own chat, not here** (#51) |
| 37 | Receipt named the voice CHOSEN, not the one that PLAYED | Sep 26 | **fixed the same day it appeared.** Testing showed a receipt recording `eguitar` when a patch had actually sounded — this build ships patches only, so `resolveVoice` substitutes the nearest patch for any sampled family. For a field whose job is "the assets actually used" that is simply wrong. The spec now carries `songVoicesPlayed` with `chosen`, `played` and a `substituted` flag, and the server validator **requires** it so an older client cannot omit it |
| 34 | **Track A: consent architecture** — grant, permission check, receipt, revocation | Sep 26 (Edwin) | **built; migrations 005 + 006 and the seed applied by Edwin 2026-09-26.** Edwin clicked through it himself: the palette path generated, and a revoked grant refused. **What "verified" below does NOT cover:** the hosted (Replicate) path has never completed a real paid generation (#46); publishing a palette render is broken (#45); publish does not *require* a receipt, skips the hash check when the receipt has no hash, and for palette renders the hash is supplied by the browser, so the server cannot independently verify it (#45); the engine version stamped on receipts is inconsistent (#47). Branch `spike/consented-adapters`. Schema 005 + two labelled TEST grants; `src/lib/consent/` (permission, receipts, grants, engine seam); generate-music gated and receipted; status route now authenticated, owner-checked, re-checks the grant every poll and hashes the output; publish asserts receipt ownership, success, hash equality and `output_survival_rule`; six new API routes; `/create` asks "Whose terms?"; `/grants` revokes. **VERIFIED END TO END against the live project 2026-09-26.** Validation: missing grant 400, unknown engine 400, `ml_adapter` 400, nonexistent grant 403. Denials with receipts: revoked grant -> `revoked`, commercial request against a personal grant -> `use_tier_not_granted`. Completion stores the spec and its canonical hash, a second attempt 409s, junk spec 400s. Ownership: another user gets 404 on read and on complete and an empty ledger. Revocation: a working grant flips to refusing while every field survives; re-revoking 409s. Migration 006 checked acting as a real user with RLS in force — append-only is now enforced by the database too, and neither table accepts DELETE. The canonical hash was recomputed independently in Python from the stored JSONB and matched. Plus: 005 and the seeds against a local PG15 cluster with all 11 CHECK constraints proven by violation, 14 assertions on the pure logic, 8/8 endpoints 401 unauthenticated |
| 32 | "Would it be better to get music from an actual artist first?" | Sep 26 (Edwin) | **decided: yes, but after a 2-day feasibility gate.** Recruiting for the product stays off the table; a bounded private paid ask to one known artist is a different, smaller thing — and the written terms of that ask are Track A's first grant record. Clock starts when files arrive; honorarium inside the $100; FMA becomes the labelled fallback. Edwin: *"let's continue in that case"*. **Updated 2026-09-28:** the gate passed and Track A works, so the ask is no longer blocked — it is Edwin's to make whenever (#6). The friend's music is free, so there is no honorarium line; the clock now starts at the first training run, not on file arrival (§3). This row supersedes §8's older "artist only after Tracks A *and* B work" |
| 31 | Production still serves `/api/debug/users-tracks` (every user's wallet + username) | Sep 26 | **open, low severity, pre-existing since April.** Wallets are public-chain data and the comment on the route says remove before production. Blocked on the archive; still **200 on production 2026-09-27**. **Removed from production 2026-09-28** by the demo-mode deploy (#42) — 404 live |
| 25 | Where Track B's training audio comes from | Sep 23 | **decided.** **Jamendo rejected** — as a reputational call, not a legal one. (An earlier version of this row said Jamendo was "currently suing" Suno; it voluntarily dismissed without prejudice on 2026-08-13 — stale premise, caught by Codex. The dismissal is not a merits ruling either way.) Use the **Free Music Archive commercially-usable subset** (one artist with enough catalogue for all three data sizes), with Edwin's **own generated tracks as run zero** — *only the ones he demonstrably generated*. (An earlier version said "his own ekos catalogue … since he owns those outputs"; wrong on both counts: 29 catalogue tracks belong to other World-ID users (#9), and the SA2.5-via-Replicate outputs are governed by those service and model terms — see `SPIKE-STACK.md` §data.) Run zero tests plumbing, not quality. **Superseded as the primary source 2026-09-28** by Edwin's artist friend (#6); FMA stays the labelled fallback. Any CC-BY result is a feasibility finding, **never** a consent demonstration |
| 38 | Receipt should name the source file, not only its hash | Sep 26 (Edwin: *"yes add to reciept"*) | **done** — `1d5552d`. The palette receipt now carries `source_name` and `source_bytes` alongside the hash |
| 39 | **Track page crashes when the creator has no World identity** | Sep 26 | **fixed on both sites 2026-09-28** (archive `885e116`; production via #42): the page assumed `world_wallet_address` exists; the email-auth account's track — the newest, so first in the feed — threw instead of rendering. **Production still crashes** (its live bundle still has `world_username||world_wallet_address.slice(0,10)`), and production is what edwinhidalgo.com links. **Folded into #42** |
| 40 | Does Story registration still work? | Sep 26 (Edwin) | **yes — verified 2026-09-28.** Edwin created a moment inside World App on production; it saved as *"Moment — dark"* (22:09 UTC) with Story IP ID `0x08eAd8fE…` — the first registration since 2026-05-22. Established Sep 26: the service wallet holds 92.5 testnet IP; stored IP IDs are real deployed contracts; `DEV_MODE` never wrote `story_ip_id`, so every stored ID went through the real path. Still unverified: per-transaction success for the historical registrations (Codex A.4) — the testnet RPC has pruned the tx hashes |
| 41 | edwinhidalgo.com's ekos card: URL + description | Sep 26 (Edwin) | **handoff written 2026-09-30 — `PORTFOLIO-EKOS-CARD.md`; waiting on Edwin's pick of draft A or B, then his portfolio chat applies it.** Background: The card (`~/Projects/edwin-hidalgo.github.io/portfolio.html`, on `listening-room` and `master`) links **production** and describes the registry without saying hackathon or what works where. Decided: link → the archive; the description names the World Build 3 hackathon, says what runs on the web vs inside World App, and credits the real on-chain registrations. **Edwin's portfolio chat makes the edit** from a handoff doc this repo provides *after* #42 ships, so the text matches the site (#51) |
| 42 | **Hackathon build → demo mode** | Sep 26 (Edwin: *"might as well let the demo work until usage runs out"*) → decided Sep 28 | **DEPLOYED 2026-09-28 to both sites, and pushed (by Edwin).** Before removing anything, the four local keys were proven working with free read-only calls (Replicate, Anthropic and Pinata 200; the Story key derives the service wallet holding 92.5 IP). Vercel stores these variables as *sensitive*, so the cloud copies cannot be read back — `.env.local` is now the only copy. Then: the four keys were removed from the `verified-fan-app` project (production + preview), `NEXT_PUBLIC_DEMO_MODE=true` was added there, and `NEXT_PUBLIC_WORLD_APP_ID` + `NEXT_PUBLIC_DEMO_MODE=true` were added to `ekos-world-build-3-hack`. Both deployed with the Vercel CLI from worktrees with no `.env*` present. **Verified live:** production's paid routes 503, `/api/debug` 404, a forged-`devMode` verify 401; the archive's writes 403; the walk passed 28/28 on both live URLs; `/`, `/catalog`, `/about` and `/lightpaper` were text-identical to the pre-deploy snapshot on both; the previously crashing track renders; stats unchanged at 31 / 35. **Owed by Edwin:** a test inside World App, and one click on a "View IP Asset" link (#56). Build history: Commits: `prod/hackathon-demo` `7324ace` + `26847fc` (on `prod/hackathon-email-fix` + the crash fix) and `archive/hackathon-public` `eec8f6b` + `e3aea80` (same change on top of the guard). **It is a switch** (Edwin: *"making it easy to switch would be good"*): demo mode is ON unless `NEXT_PUBLIC_DEMO_MODE=false`. **To go back live:** set that, add back `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `PINATA_JWT` and `STORY_SERVICE_WALLET_PRIVATE_KEY` (values in this repo's `.env.local`), and redeploy. Needing the keys is deliberate: a mis-flipped switch cannot spend. Fix register's upload first (#43). The steps are also at the top of `src/lib/demo.ts`. Both modes verified: demo built **without** the keys (paid routes 503, walk 28/28 on both builds); live built with the switch off (routes reachable, their own 400/401 validation only, no spend, signed-out redirect as originally). A paid end-to-end live test (one generation, cents) was not run — Edwin's call. Verified: typecheck and build clean, zero new lint errors; the paid and write routes answer 503 "paused" (archive: 403 from the guard first); a headless-Chrome walk of create / register / verify passed 28/28 on both builds, with no paid or write API called; home, feed, about and lightpaper render text-identical to both live sites (similarity 1.000, 0 differing lines). Edwin's addition is in: the pre-filled description is labelled *"Example from a real run, not your photo"*, naming the other photo and its date. **Push to GitHub was refused by the session's permission check — Edwin's call.** Vercel is not Git-connected (no deployments or webhooks on the repo), so pushing does not deploy. **Deploy waits for Edwin's click-through and a second go**; the keys come off the Vercel project at deploy time. Original decision: Edwin: pause everything that spends Replicate or Anthropic, keep the forms interactive, end in a demo flow with a clear disclaimer. Agreed shape: **(1)** forms work up to submit; **(2)** submit plays a labelled describing → composing → registering sequence and ends on a **replay of a real past result** (its description, audio, cover, real Story IP ID) — never invented output — labelled that live generation was paused after the hackathon and nothing entered was sent; **(3)** `REPLICATE_API_TOKEN` and `ANTHROPIC_API_KEY` **removed from the production Vercel project** — hiding buttons alone would not stop a script (#44); the archive already lacks them; **(4)** register → **demo** (Edwin) — it spent nothing, but let anyone upload arbitrary audio into public storage; **(5)** World ID verify stays **real** inside World App (Edwin) — free, and the hackathon's core idea; **(6)** web visitors get a note that it was a World App mini app, with download-World-App and open-in-World-App links; **(7)** ride-alongs: the crash (#39) and removing `/api/debug/users-tracks` (#31). Deploys to production **and** the archive. **Production stays the hackathon** because World App opens it — Edwin had asked *"sounds like should just become the new app no?"*, and the answer reversed once the World App dependency surfaced; the new app gets its own link later, as Edwin said on Sep 20. Side effect: nothing new is written, so the shared-database problem (a World App creation appeared first in the archive's feed on Sep 28) stops growing |
| 43 | World App: register fails with *"The string did not match the expected pattern"* | Sep 28 (Edwin) | **diagnosed; moot under #42.** The register form allows 20 MB and sends the whole file as multipart to `/api/tracks`; Vercel rejects request bodies over **4.5 MB** with a plain-text 413 before the function runs; the form calls `response.json()` on it (`track-upload-form.tsx:98, 170–180`), and WebKit — Safari, World App — reports the parse failure in exactly those words. Confirmed from code, not reproduced. Create is unaffected: it posts a URL, not the file. Edwin chose the proper fix (upload straight to storage via a signed URL), which #42 then made unnecessary |
| 44 | *"World ID limits abuse"* — the takeover's own claim, Sep 27 | Sep 28 | **withdrawn.** World ID gates the buttons only. The hackathon's API routes trust an `x-user-id` header, and user ids are visible in public track data, so every write/spend route can be scripted from outside World App — true since April. The real control is removing the keys (#42) |
| 45 | Publishing a palette render is broken; publish checks are weaker than #34 once implied | Sep 27 | **OPEN.** `/create` publishes `audio_url: generatedAudioUrl` (`create/page.tsx:146`), which for a palette render is a browser-only `blob:` URL (`:352`); the server `fetch()`es it (`api/tracks/route.ts:100`) and fails. Confirmed from code, not run — **don't publish a palette render until fixed** (send the WAV as `audio_file` instead). Also: `receipt_id` is optional at publish; the hash check is skipped when `output_sha256` is null (`:124`); for palette renders the hash comes from the browser. A receipt can therefore record what the client *reported*, not what the server verified — claim accordingly |
| 46 | Hosted (Replicate) path never exercised end to end | Sep 26 | **OPEN.** No real paid generation has completed through the gated route, so receipt completion and output hashing (`status/route.ts:94–100`) are untested. The receipt also stores the user's *request* as `inference` (`:106–110`), not the settings actually sent (steps 8, guidance 7 — `replicate-stable-audio.ts:52–58`); for a field whose job is "the assets actually used" it should be the sent values. #2's walkthrough exercises the path |
| 47 | Palette engine version recorded inconsistently | Sep 27 | **OPEN.** `src/lib/palette/README.md` says vendored from `72c07d5` and labels it v3.89 — that commit is **v3.90c**. Every palette receipt stamps `everything-hums@cd9da31 (v3.89)` (`engines/palette.ts:14`), a different commit. At least one is wrong, and receipts carry it. Diff the vendored files against both commits (read-only there — #51), then fix both labels |
| 48 | Stale setup notes on the spike branch | Sep 27 | **OPEN.** `supabase/RUN-THIS.md` covers 005 and the seed but not 006 or the re-arm seed, and the re-arm seed is not idempotent. Migration 005's comment (L143–145) still says the server client "bypasses RLS" (#35 proved it does not). The cherry-picked *"ARCHIVE-ONLY CHANGE"* comment in `api/tracks/[id]/route.ts:46` now sits on this branch too |
| 49 | `SPIKE-STACK.md` contradicts itself | Sep 27 | **OPEN — fix when the stack is approved (#7).** Three start points for the 14-day clock (L11, L276–277, L352–353; Edwin's tentative answer: the first training run). Honorarium placement (L11–12 vs L278–279; moot now). Artist timing (L8 vs L23–24; #32 governs). "Weights are gated on Hugging Face" (L89–90) vs `training/README.md` L16–17 "not gated". L102 calls the crop-1300 OOM "the same run", but attempt 1 also had grad-checkpointing off and compile on, so crop alone is not isolated. `lora-xs` kept as a fallback "until memory is measured" (L128) — it now is. L350–351 says approval authorizes the gate, which already ran while L3 still says awaiting approval. Unreported: swap rose 18.46 → 23.24 GB during attempt 2 — against the README's own "swaps heavily" stop rule, that needs a verdict |
| 50 | Monthly spending caps on Replicate and Anthropic | Sep 27 | **superseded by #42** — removing the keys makes spend impossible on the hackathon deployment, where a cap would only have limited it. For the record: Anthropic offers a self-set monthly limit (Console → Settings → Billing → Spend limits); Replicate's current docs offer only prepaid credit as a hard cap. Edwin keeps both keys for other projects |
| 51 | **Project boundary: `everything-hums` and the portfolio site** | Sep 28 (Edwin) | **standing rule.** *"no changes to that project should be made through here or any sub agents from here unless i approve"* — Edwin runs a dedicated chat for everything-hums, and one for the portfolio. Reading them is fine; writing is not. The LICENSE question and any re-vendoring belong to the everything-hums chat; the portfolio edit goes through its chat via a handoff doc (#41). A correction on record: the takeover called Codex the owner of everything-hums; its `CODEX-OWNERSHIP.md` gives Codex only the *likeness* feature |
| 52 | Vendored engine lags upstream | Sep 27 | **note only.** everything-hums `79cf1d1` (Sep 27) added an opt-in `{policy:'masking-horizon'}` to `partialRelease()` in `synth.js`; default behaviour is unchanged, so the vendored copy is unaffected. Anyone re-vendoring records the new source commit — and see #51 |
| 53 | Left running / left behind by the Sep 20–26 session | Sep 27 | **harmless, noted.** The `next dev` server this repo started at 14:09 EDT Sep 26 is still up on :3000 (it dies on reboot; restart with `npm run dev`). A stopped throwaway PostgreSQL data dir (47 MB) and logs remain under `/private/tmp` (`ekos-dev.log`, `gate-run*.log`, `cmp/`). No Codex job is pending (plugin state `jobs: []`); no cron, launchd job or cloud routine was ever created. The Codex CLI was updated to 0.157.1 on Sep 26, which is what made `gpt-6-astra` work |
| 55 | **World ID verify trusted a caller-supplied `devMode` flag** | Sep 28 | **fixed live 2026-09-28** (#42). `POST /api/world/verify` skipped the signature check whenever the request body said `devMode: true`, regardless of the deployment's own setting. So anyone could mint a "verified" user row without World App on production, and that is still true there today. Now `devMode` counts only when the deployment's own `NEXT_PUBLIC_DEV_MODE` is `'true'`; locally a forged request returns 401 and writes nothing |
| 56 | **"View IP Asset" links are dead** | Sep 28 | **fixed live 2026-09-28** (#42). The track page linked `aeneid.storyscan.xyz/ipa/…`, which redirects to `aeneid.storyscan.io`, a host that no longer resolves (checked on 1.1.1.1 and 8.8.8.8). Now `aeneid.explorer.story.foundation/ipa/…`, Story's official IP explorer. It resolves but returns 403 to scripts, so **a human click is still owed** to confirm it renders |
| 54 | Takeover after the Claude Code / Opus 5.5 update | Sep 27 (Edwin) | **done 2026-09-28.** The old chats could not be continued. Primary source: transcript `~/.claude/projects/-Users-edwinhidalgo-Documents-everything-hums/320dba69-….jsonl` (Sep 20 → Sep 26 21:49 UTC), plus the ONUS-thread transcripts for Sep 6–10. That session ended with Edwin's hackathon-polish question answered but unacknowledged (now #42), and without reconciling this file — last touched 14:10 Sep 26 while work continued to 17:49. This row, #38–#53 and the §1/§3/§8 rewrite are that reconciliation |
| 8 | Write the hackathon's AI integration into `CAREER-AND-PORTFOLIO.md` | Sep 10 | **OPEN** — the other half of the turn Codex was cut off mid-way through |
| 9 | 29 legacy hackathon tracks not re-linked to pescatios | Jul / Sep 8 | **CANCELLED 2026-09-28** (Edwin: *"sure let's do your recommendation"*). The archive and production read this same database, so re-linking would change what the hackathon demo shows — and Edwin's standing instruction is that the hackathon site is *"not to be interfered with"* (Sep 20). The tracks stay with their original World-ID creators |
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
| `HANDOFF.md` on `refocus-create-stream` | Stopped 2026-09-26 01:57 — predates the spike branch, the gate and Track A. Use this branch's copy |
| `~/.claude/plans/hi-my-computer-restarted-buzzing-valiant.md` (Sep 26) | The Track A build plan — executed. Its costs table ($120–200, honorarium, paid listeners) is superseded by §3's budget |

**Current:** `SPIKE-STACK.md` (with the contradictions in #49) and `CODEX-REVIEW-2026-09-26.md`
in this repo.
**Historical, still worth reading:** `~/Documents/Onus/EKOS-SPIKE-PLAN.md` (2026-09-10),
`EKOS-SCOPE-MAP.md` (the licensing research), `ONUS-CODEX-HANDOFF.md` (full reasoning).
`STUDIO-SPIKE-BRIEF.md` still carries the retracted "fully gone from generation" wording,
the overstated demand inference and obsolete repo state — read it as the original contract,
not as current instruction.

## 6. Traps

- **Next.js 16.** `src/proxy.ts`, not `middleware.ts`. `cookies()` is async. `AGENTS.md`
  mandates reading `node_modules/next/dist/docs/` before writing code — tutorials mislead.
- **The "service-role" server client does NOT bypass RLS** (corrected 2026-09-26, #35 — this
  bullet used to say the opposite). `createServerSupabaseClient` passes the service key, but
  `@supabase/ssr` binds the session from cookies, so a signed-in request acts as *that user*
  and RLS applies — and a write RLS blocks returns **error `null` with zero rows touched**.
  Use `createAdminClient()` (service key, no session) where a write must not depend on
  policies, and check the row count. Every older server write in this app runs as the user
  and works only because permissive policies happen to exist.
- **Vercel rejects request bodies over 4.5 MB** with a plain-text 413 before your function
  runs. Large uploads must go browser → storage directly (signed URL), never through an API
  route (#43).
- **"The string did not match the expected pattern"** in Safari or World App almost always
  means `response.json()` was called on a non-JSON body (an error page, a 413, a timeout).
  Read the status and text first.
- **World App opens production.** `verified-fan-app.vercel.app` is the mini app's URL, so
  replacing production changes what World App shows. The hackathon's API trusts an
  `x-user-id` header — World ID protects the buttons, not the server (#44).
- **Replicate output URLs expire.** Audio is persisted only at publish. Spike experiments
  must persist their own outputs deliberately or the comparison runs vanish.
- **Supabase free tier auto-pauses after ~7 days idle.** If everything 500s and the DB host
  stops resolving, it is a pause, not a bug — check the dashboard first. An UptimeRobot
  monitor pings `/api/stats` (a real DB query) to prevent it, and appears to be working:
  the project was awake on 2026-09-21 after 11 idle days. It already paused once, in June.
- **The archive shares this same Supabase project**, so a pause takes the public portfolio
  link down too — and anything written through production (e.g. a World App creation)
  appears in the archive's feed.
- **Boundaries.** Nothing in `~/Documents/everything-hums` or the portfolio repo is changed
  from an ekos session or its subagents without Edwin's explicit approval (#51).
- **Owner context.** Edwin is a PM, not an engineer. He runs dashboard steps when guided,
  expects proactive issue-catching, and wants big scope changes planned and confirmed, not
  sprung. He also asks for genuine assessments over agreeable ones. He works **one step at a
  time** and authorizes each with a literal **"go"** — don't chain steps; flag a settled
  decision you think is wrong rather than silently redoing it. He wants short, fluff-free
  lists of what needs him.

## 7. The hackathon archive

The April 2026 build is published read-only at **https://ekos-world-build-3-hack.vercel.app**
(Vercel project `ekos-world-build-3-hack`, no SSO, separate from `verified-fan-app`) so it
can be linked from Edwin's website. **It is not linked yet** — the site still points at
production (#41).

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

Deployed source is branch **`archive/hackathon-public`** = `281c6b4` plus `bcaad55` (the
`src/proxy.ts` guard), `ccbdacb` (creator-field allowlist) and `885e116` (track-page crash
fix, #39). **The guard is not optional:** the build authenticated only in localStorage
and its API routes enforced nothing, so without it a public link lets anyone write rows
into the live Supabase project or spend real money on Replicate and Anthropic. It returns
403 to every non-GET on `/api/*` **and** to `/api/debug/*` — `281c6b4` carries a debug
route whose own comment says *"Remove this before shipping to production!"* and which
enumerates every user with wallet and username. The deployment sets only the three Supabase
vars and omits `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `PINATA_JWT` and `STORY_*`.
**These are not two independent locks** (a claim this section used to make): the archive
holds the service-role key, so any *read* path can leak whatever it selects. One did —
`GET /api/tracks/[id]` returned the creator's email until `ccbdacb` allowlisted the
fields. Production was fixed the same day (`d6ee9a2`, ledger #29).

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

_Rewritten 2026-09-28. Done already: archive, backup, spike branch, day-1 gate, Track A._

1. ~~Hackathon demo mode (#42).~~ **Deployed 2026-09-28.** Edwin still owes the World App
   test and one explorer-link click.
2. ~~Portfolio handoff (#41).~~ **Written 2026-09-30** (`PORTFOLIO-EKOS-CARD.md`); Edwin picks
   a draft and hands it to his portfolio chat.
3. **Track A fixes** — palette publish (#45), hosted-receipt fields (#46), the version stamp
   (#47), stale setup notes (#48). Then Edwin's local walkthrough (#2), which exercises the
   paid path once.
4. **Free `medium` memory test on the Mac** — needs no artist material; answers #7(b) before
   anyone has to decide on renting.
5. **Track B** — when Edwin's friend's music arrives with written terms (#6): approve the
   stack (#7) with #49 fixed, re-gate at real song length, then the three-size ladder. The
   14-day clock starts at the first training run.

Nothing in 1–4 waits on the artist. Step 1 touches the live site, so it ships only on Edwin's
explicit go.

A negative result is an acceptable terminating outcome. A spike that does not terminate has
become the product by accident.
