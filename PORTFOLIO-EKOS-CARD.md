# Handoff: update the ekos card on edwinhidalgo.com

_For the Claude Code chat that owns the portfolio site. Written 2026-09-30 from the ekos repo.
Read-only on this repo — everything you need is below._

## The change

**File:** `~/Projects/edwin-hidalgo.github.io/portfolio.html` — the `ekos` entry in the
Projects tab (around line 283 on `listening-room`; the same card exists on `master`). Apply it
on whichever branch the live site deploys from, which you know and this repo does not.

**Today:**

```html
<h2><img src="img/portfolio/logo-ekos.png" alt="" class="entry-logo"><a href="https://verified-fan-app.vercel.app/" target="_blank">ekos</a></h2>
<span class="entry-date">2026</span>
<p class="entry-role">Verified-human music registry</p>
<p class="entry-summary">A World Mini App where only World ID-verified creators can register their music on-chain via Story Protocol with machine-readable license terms, including AI training permissions — distinguishing authentic human music from the AI-generated flood.</p>
```

**Change three things; keep the logo, date and markup pattern as they are:**

1. **Link** → `https://ekos-world-build-3-hack.vercel.app/`
2. **Role line** → `Verified-human music registry · World Build 3 hackathon`
   (same form as the MyMusicMemory card's "· Presented at Verci NYC")
3. **Summary** → the draft Edwin approves (below). Do not reword it without asking him.

## Description drafts — Edwin picks one

**A (recommended)**

> A World Mini App built for the World Build 3 hackathon: only World ID-verified humans could
> register music on-chain via Story Protocol, with machine-readable license terms including AI
> training permissions, plus a photo-to-music flow using Claude and Stable Audio. 22 tracks were
> registered as real IP assets on Story's testnet. Generation is now paused; the site runs as a
> guided demo of real past results.

**B (shorter, closer to the neighbouring cards)**

> A World Mini App built for the World Build 3 hackathon where only World ID-verified humans can
> register music on-chain via Story Protocol, with machine-readable license terms including AI
> training permissions. Now a guided demo replaying real registrations from when it was live.

## Why the link changes

`verified-fan-app.vercel.app` is what the **World App mini app** opens, and the URL the
create+stream product may use later. `ekos-world-build-3-hack.vercel.app` is a separate,
read-only, permanent copy made for exactly this link. Both show the same pages today.

## What a visitor can do (verified 2026-09-28 on the live archive)

| Works | How |
|---|---|
| Landing page, feed of 24 moments, track pages with audio, `/about`, `/lightpaper` | Fully live |
| Story Protocol records | Track pages link each IP asset to Story's explorer |
| Create a moment, register music | Every field works; ends on a **labelled replay** of a real past result. Nothing is uploaded or sent |
| World ID verification | Only inside World App; on the web the site explains this, with *Open in World App* / *Get World App* links |

Facts the description relies on, so you do not overstate them: the hackathon was **World Build
3, April 2026**; **22** tracks carry real Story IP IDs on the **Aeneid testnet** (checked
against the live API); live generation and registration were **paused on 2026-09-28** on
purpose — not broken.

## Before calling it done

- Click the new link from the deployed portfolio page and confirm the archive loads.
- Do not change anything in `~/Documents/verified-fan-app`; report back to Edwin instead.
