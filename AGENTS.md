<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Start with HANDOFF.md

**Read [HANDOFF.md](HANDOFF.md) before doing anything in this repo**, and keep it
current after meaningful work.

It is the source of truth for ekos: current branch and deployment state, what the
app does end-to-end, the consented-adapter spike and its constraints, an OPEN ITEMS
ledger, the traps, and a table of which older documents are now stale. The README,
the deployed site at `verified-fan-app.vercel.app`, and several planning docs in
`~/Documents/Onus/` and `~/Downloads/` describe a product that was sunset in July
2026 — HANDOFF.md says which ones and what they get wrong.

Two standing rules it encodes:

- **The ledger is not optional.** Every ask gets a row, including the ones we are
  not doing, with the reason. A clause buried in a multi-part message is exactly
  what gets absorbed into the bigger thread and lost.
- **The repository is the source of truth**, not any agent's private memory. Work
  moves between Claude Code and Codex here; anything that only one of them knows
  is already lost.
