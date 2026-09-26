'use client'

/**
 * /grants — read the terms, and withdraw them.
 *
 * Revoking here does not delete anything. The grant keeps every field it had and gains two
 * timestamps, so afterwards you can still see that use was authorized and when that stopped.
 * The receipts list under each grant is the other half: what was actually done with it.
 */

import { useEffect, useState } from 'react'
import { showToast } from '@/lib/utils/toast'

interface Grant {
  id: string
  grantor_display_name: string
  is_test: boolean
  status: 'active' | 'pending' | 'expired' | 'revoked'
  verification_status: string
  terms_version: string
  asset_scope: string
  may_train: boolean
  may_condition: boolean
  may_invoke_style: boolean
  may_distribute_commercially: boolean
  use_tier: string
  rate_instrument: string
  revocable: boolean
  revocation_notice_days: number
  output_survival_rule: string
  attribution_text: string | null
  scope_specificity_text: string
  revoked_at: string | null
  revocation_effective_at: string | null
  revocation_reason: string | null
  supersedes_grant_id: string | null
}

interface ReceiptRow {
  id: string
  grant_id: string | null
  pathway: string
  engine: string
  decision: string
  denial_reason: string | null
  outcome: string
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-[#1b1b1b] text-[#fdfff8]',
  revoked: 'bg-[#ff2e00] text-[#fdfff8]',
  pending: 'bg-[#fdfff8] text-[#1b1b1b] border border-[#1b1b1b]',
  expired: 'bg-[#fdfff8] text-[#484947] border border-[#484947]',
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Shape matches the other client pages: the fetch lives inside the effect, so nothing sets
  // state during the render pass.
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [g, r] = await Promise.all([
        fetch('/api/grants').then((res) => (res.ok ? res.json() : { grants: [] })),
        fetch('/api/receipts').then((res) => (res.ok ? res.json() : { receipts: [] })),
      ])
      if (cancelled) return
      setGrants(g.grants || [])
      setReceipts(r.receipts || [])
      setIsLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const revoke = async (grant: Grant) => {
    const reason = window.prompt(
      `Revoke ${grant.grantor_display_name}?\n\nNothing is deleted — the grant stays on record, marked revoked. Reason (optional):`
    )
    if (reason === null) return

    setBusyId(grant.id)
    const res = await fetch(`/api/grants/${grant.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || null }),
    })
    const body = await res.json().catch(() => ({}))
    setBusyId(null)

    if (!res.ok) {
      showToast(body.error || 'Could not revoke', 'error')
      return
    }
    showToast('Revoked. Future generations under these terms will be refused.', 'success')
    setReloadToken((n) => n + 1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfff8] text-[#1b1b1b] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-[#484947]">Loading grants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fdfff8] text-[#1b1b1b] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Grants</h1>
          <p className="text-sm text-[#484947]">
            What each artist has permitted, and on what terms. Revoking stops future use — it does
            not erase the record that use was once authorized.
          </p>
        </div>

        {grants.length === 0 && (
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-5">
            <p className="text-sm">
              No grants yet. Run <code>supabase/seeds/track_a_test_grants.sql</code> to add the two
              labelled test grants.
            </p>
          </div>
        )}

        {grants.map((grant) => {
          const mine = receipts.filter((r) => r.grant_id === grant.id)
          const isOpen = expanded === grant.id
          return (
            <div key={grant.id} className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold">{grant.grantor_display_name}</h2>
                  <p className="text-xs text-[#484947]">
                    v{grant.terms_version} · {grant.verification_status.replace(/_/g, ' ')}
                    {grant.supersedes_grant_id && ' · supersedes an earlier version'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {grant.is_test && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold border border-[#1b1b1b]">
                      TEST
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      STATUS_STYLE[grant.status]
                    }`}
                  >
                    {grant.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#484947]">{grant.scope_specificity_text}</p>

              <ul className="text-xs space-y-1">
                <li>{grant.may_train ? '✓' : '✕'} may train a model</li>
                <li>{grant.may_condition ? '✓' : '✕'} may condition on a recording</li>
                <li>{grant.may_invoke_style ? '✓' : '✕'} may invoke the style</li>
                <li>{grant.may_distribute_commercially ? '✓' : '✕'} may distribute commercially</li>
              </ul>

              {grant.revoked_at && (
                <p className="text-xs text-[#ff2e00]">
                  Revoked {new Date(grant.revoked_at).toLocaleString()}
                  {grant.revocation_effective_at &&
                    ` · effective ${new Date(grant.revocation_effective_at).toLocaleString()}`}
                  {grant.revocation_reason && ` · ${grant.revocation_reason}`}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setExpanded(isOpen ? null : grant.id)}
                  className="px-3 py-2 rounded-full text-xs font-semibold bg-[#fdfff8] text-[#1b1b1b] border border-[#1b1b1b] hover:opacity-80"
                >
                  {isOpen ? 'Hide detail' : `Detail & receipts (${mine.length})`}
                </button>
                {!grant.revoked_at && grant.revocable && (
                  <button
                    onClick={() => revoke(grant)}
                    disabled={busyId === grant.id}
                    className="px-3 py-2 rounded-full text-xs font-semibold bg-[#ff2e00] text-[#fdfff8] hover:opacity-80 disabled:opacity-50"
                  >
                    {busyId === grant.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-[#1b1b1b] pt-3 space-y-3 text-xs">
                  <p>
                    Use tier: {grant.use_tier} · Rate: {grant.rate_instrument} ·{' '}
                    {grant.revocable
                      ? `revocable, ${grant.revocation_notice_days} days notice`
                      : 'not revocable'}
                  </p>
                  <p>Already-made outputs: {grant.output_survival_rule.replace(/_/g, ' ')}</p>
                  <p className="text-[#484947]">Scope: {grant.asset_scope}</p>
                  {grant.attribution_text && (
                    <p className="text-[#484947]">Credit: {grant.attribution_text}</p>
                  )}

                  <div>
                    <p className="font-semibold mb-1">Receipts</p>
                    {mine.length === 0 && <p className="text-[#484947]">Nothing generated yet.</p>}
                    {mine.map((r) => (
                      <p key={r.id} className="text-[#484947]">
                        {new Date(r.created_at).toLocaleString()} · {r.engine} · {r.pathway} ·{' '}
                        <span className={r.decision === 'denied' ? 'text-[#ff2e00]' : ''}>
                          {r.decision}
                          {r.denial_reason ? ` (${r.denial_reason.replace(/_/g, ' ')})` : ''}
                        </span>{' '}
                        · {r.outcome} · {r.id.slice(0, 8)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
