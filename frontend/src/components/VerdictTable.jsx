import { useMemo, useState } from 'react'
import { REASON_TEXT, TIERS, TIER_STYLE } from '../constants.js'
import { countsOf, sortByTier } from '../normalize.js'
import { Chip } from './Chip.jsx'

const TIER_SHORT = {
  CONFIRMED: 'CONF',
  LIKELY: 'LIKELY',
  RELATED: 'REL',
  CONFLICT: 'CONFL',
  NO_MATCH: 'NONE',
  UNRESOLVED: 'UNRES',
}

export function VerdictCards({ results, onOpen, onHoverNode }) {
  const [filterTier, setFilterTier] = useState(null)

  const allRows = useMemo(() => Object.values(results).sort(sortByTier), [results])
  const counts = useMemo(() => countsOf(results), [results])

  const visibleRows = filterTier
    ? allRows.filter((r) => r.tier === filterTier)
    : allRows

  return (
    <>
      <div className="tier-strip" role="group" aria-label="Verdict counts by tier">
        {TIERS.map((t) => {
          const style = TIER_STYLE[t]
          const count = counts[t] || 0
          const active = filterTier === t
          return (
            <button
              key={t}
              type="button"
              className={`tier-counter${count > 0 ? ' has-hits' : ''}${t === 'CONFIRMED' ? ' is-confirmed' : ''}${active ? ' active' : ''}`}
              style={{ '--tier-color': style.accent }}
              onClick={() => setFilterTier((curr) => (curr === t ? null : t))}
              title={`${style.long}: ${count} (click to filter)`}
              aria-pressed={active}
            >
              <span className="tier-counter-n">{count}</span>
              <span className="tier-counter-lbl">{TIER_SHORT[t] || style.label}</span>
            </button>
          )
        })}
      </div>

      <div className="dossier-scroll">
        {filterTier && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.2rem 0.1rem',
            }}
          >
            <span className="label-caps">
              Showing: {TIER_STYLE[filterTier]?.long || filterTier} ({visibleRows.length})
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFilterTier(null)}
            >
              Show all
            </button>
          </div>
        )}

        {allRows.length === 0 && (
          <div className="dossier-empty">
            <span className="label-caps" style={{ display: 'block', marginBottom: '0.4rem' }}>
              Case File Standby
            </span>
            Rated listings will pin here as aged-paper evidence tags, ordered with Confirmed matches
            at the top.
          </div>
        )}

        {allRows.length > 0 && visibleRows.length === 0 && (
          <div className="dossier-empty">
            No listings in the {TIER_STYLE[filterTier]?.long || filterTier} tier.
          </div>
        )}

        {visibleRows.map((r) => {
          const style = TIER_STYLE[r.tier] || TIER_STYLE.UNRESOLVED
          const isConfirmed = r.tier === 'CONFIRMED'
          const reasons = r.reasons || []
          const evCount = (r.evidence_ids || []).length

          return (
            <article
              key={r.listing_id}
              className={`paper-card verdict-card tier-${r.tier}`}
              style={{ '--tier-accent': style.accent }}
              onMouseEnter={() => onHoverNode?.(r.nodeId || null)}
              onMouseLeave={() => onHoverNode?.(null)}
            >
              <div className="verdict-card-top">
                <div className="verdict-title-wrap">
                  <div className="verdict-tag-id">
                    <span
                      className={`paper-pin${isConfirmed ? ' pin-red' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{r.listing_id}</span>
                  </div>
                  <h3 className="verdict-title">{r.title || r.listing_id}</h3>
                  {(r.brand || r.model || r.url) && (
                    <div className="verdict-meta-line" title={r.url || ''}>
                      {[r.brand, r.model].filter(Boolean).join(' · ') || r.url}
                    </div>
                  )}
                </div>
                <Chip tier={r.tier} reasons={reasons} onPaper animate />
              </div>

              {reasons.length > 0 ? (
                <ul className="verdict-reasons">
                  {reasons.map((code) => (
                    <li key={code} className="verdict-reason-item inline-reason">
                      <span className="reason-code-pill">{code}</span>{' '}
                      <span>{REASON_TEXT[code] || code}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    margin: '0.45rem 0 0.65rem',
                    paddingTop: '0.45rem',
                    borderTop: '1px dashed var(--paper-line)',
                    fontSize: '0.78rem',
                    color: 'var(--paper-muted)',
                  }}
                >
                  {r.tier === 'NO_MATCH'
                    ? 'No match found in checked sources: neither model number, barcode, nor brand matched the official notice.'
                    : 'No rule reason codes attached.'}
                </p>
              )}

              <div className="verdict-card-foot">
                <span className="verdict-ev-count">
                  {evCount} {evCount === 1 ? 'evidence item' : 'evidence items'}
                </span>
                <button
                  type="button"
                  className="open-evidence-btn"
                  onClick={() =>
                    onOpen({
                      title: r.title || r.listing_id,
                      subtitle: r.url || r.listing_id,
                      tier: r.tier,
                      reasons,
                      evidenceIds: r.evidence_ids || [],
                    })
                  }
                >
                  Open evidence →
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export const VerdictTable = VerdictCards
