# Deprecated — hackathon (World ID + Story Protocol) code

This folder preserves the World Build 3 hackathon implementation that was removed from the
live product during the post-hackathon "create + stream" refocus. Nothing here is routed,
built, or type-checked: it lives outside `src/` (so Next.js does not serve it) and is listed
in `tsconfig.json` `exclude` (so its now-broken `@/` imports don't fail the build).

The full submitted app is also tagged in git as `hackathon-final`.

Contents:
- `app/verify`, `app/verify-listener`, `app/register` — World ID verification + upload flow
- `app/about`, `app/lightpaper` — hackathon thesis / research pages
- `app/api/world`, `app/api/nonce` — SIWE / World ID verification endpoints
- `app/api/creators` — creator dashboard API (replaced by `/api/my-tracks`)
- `app/api/debug`, `app/api/tracks-id-license` — debug + license-terms endpoints
- `lib/story` — Story Protocol IP registration (incl. the unfinished ipMetadataHash fix)
- `lib/ipfs` — Pinata IPFS uploads
- `lib/license` — PIL / license metadata schema
- `components/MiniKitProvider.tsx`, `components/track-upload-form.tsx`
- `hooks/useAuthedUser.ts` — old World-identity auth hook

To revive any of this, move it back under `src/` and restore its dependencies/env vars.
