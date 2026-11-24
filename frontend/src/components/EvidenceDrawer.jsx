import { useEffect, useState } from 'react'
import { getEvidence } from '../api.js'
import { REASON_TEXT } from '../constants.js'
import { normEvidence, shotUrl } from '../normalize.js'
import { Chip, Verified } from './Chip.jsx'

function formatClipboardText(sel, item) {
  const lines = [
    `REDTHREAD EVIDENCE RECORD`,
    `Item: ${sel?.title || item.id}`,
    sel?.tier ? `Verdict tier: ${sel.tier}` : null,
    `Evidence ID: ${item.id}`,
    item.source_url ? `Source URL: ${item.source_url}` : null,
    item.source_tier ? `Source tier: ${item.source_tier}` : null,
    item.field ? `Field: ${item.field}` : null,
    item.listing_value ? `Listing value: ${item.listing_value}` : null,
    item.recall_value ? `Recall value: ${item.recall_value}` : null,
    item.quote ? `Verbatim quote: "${item.quote}"` : null,
    item.quote_verified != null
      ? `Quote verification: ${item.quote_verified ? 'VERIFIED' : 'UNVERIFIED'}`
      : null,
    item.retrieved_at ? `Retrieved at: ${item.retrieved_at}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

export function EvidenceDrawer({ sel, demo, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const ids = sel?.evidenceIds || []

  useEffect(() => {
    setItems([])
    setErr('')
    setCopiedId(null)
    if (!sel) return undefined

    if (demo) {
      setItems(
        ids.map((id) => ({
          id,
          demo: true,
          source_url: sel.subtitle && /^https?:\/\//.test(sel.subtitle) ? sel.subtitle : '',
          quote: `Demo fixture evidence handle (${id}). Live and recorded backend runs supply full verbatim page excerpts and frame captures.`,
          quote_verified: true,
          source_tier: id.includes('recall') ? 'A' : 'C',
          retrieved_at: new Date().toISOString(),
        }))
      )
      return undefined
    }

    let live = true
    setLoading(true)
    Promise.all(
      ids.map((id) =>
        getEvidence(id)
          .then((raw) => normEvidence(raw))
          .catch((e) => ({ id, error: e.message }))
      )
    )
      .then((res) => {
        if (live) {
          setItems(res)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (live) {
          setErr(e.message)
          setLoading(false)
        }
      })

    return () => {
      live = false
    }
  }, [sel, demo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sel) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, onClose])

  if (!sel) return null

  const copyEvidence = async (item) => {
    const text = formatClipboardText(sel, item)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(item.id)
      window.setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1800)
    } catch {
      // Fallback for non-secure clipboard environments
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(item.id)
      window.setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1800)
    }
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="evidence-drawer" role="dialog" aria-label="Evidence dossier">
        <header className="drawer-header">
          <div style={{ minWidth: 0 }}>
            <span className="paper-label-caps" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="paper-pin pin-red" aria-hidden="true" />
              Evidence Tag Dossier
            </span>
            <h2 style={{ marginTop: '0.2rem' }}>{sel.title}</h2>
            {sel.subtitle && <p className="drawer-subtitle">{sel.subtitle}</p>}
          </div>
          <button
            type="button"
            className="btn btn-paper-outline btn-sm"
            onClick={onClose}
            aria-label="Close evidence drawer"
          >
            Close ✕
          </button>
        </header>

        <div className="drawer-body">
          {sel.tier && (
            <div className="drawer-verdict-bar">
              <Chip tier={sel.tier} long onPaper animate />
              <span className="paper-label-caps">
                {ids.length} {ids.length === 1 ? 'record' : 'records'} pinned
              </span>
            </div>
          )}

          {sel.reasons?.length > 0 && (
            <div className="drawer-reasons-box">
              <span className="paper-label-caps">Rule Engine Rationale</span>
              <ul>
                {sel.reasons.map((r) => (
                  <li key={r}>
                    <span className="reason-code-pill" style={{ marginRight: '0.4rem' }}>
                      {r}
                    </span>
                    <span>{REASON_TEXT[r] || r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.35rem',
            }}
          >
            <span className="paper-label-caps">Attached Evidence ({ids.length})</span>
            {loading && <span className="paper-label-caps">Fetching records…</span>}
          </div>

          {ids.length === 0 && (
            <p style={{ fontSize: '0.84rem', color: 'var(--paper-muted)' }}>
              No evidence records are attached to this node yet.
            </p>
          )}

          {err && (
            <p className="intake-error" role="alert">
              {err}
            </p>
          )}

          {items.map((e) => {
            const thumb = shotUrl(e.screenshot_path)
            return (
              <article className="ev-item" key={e.id}>
                <div className="ev-item-head">
                  <span className="paper-label-caps">
                    ID · <code style={{ color: 'var(--paper-ink)' }}>{e.id}</code>
                  </span>
                  <Verified ok={e.quote_verified} />
                </div>

                {e.error && (
                  <p className="intake-error">
                    Could not load record {e.id}: {e.error}
                  </p>
                )}

                {e.source_url && (
                  <p style={{ margin: '0 0 0.45rem' }}>
                    <a
                      className="ev-url-link"
                      href={e.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.source_url}
                    </a>
                  </p>
                )}

                {e.quote && (
                  <blockquote className="ev-quote-block">
                    <span className="ev-quote-mark">{e.quote}</span>
                  </blockquote>
                )}

                <dl className="ev-meta-grid">
                  {e.field && (
                    <>
                      <dt>Field</dt>
                      <dd>
                        <code>{e.field}</code>
                        {e.comparison ? ` (${e.comparison})` : ''}
                      </dd>
                    </>
                  )}
                  {e.listing_value && (
                    <>
                      <dt>Listing</dt>
                      <dd>
                        <code>{e.listing_value}</code>
                      </dd>
                    </>
                  )}
                  {e.recall_value && (
                    <>
                      <dt>Official</dt>
                      <dd>
                        <code>{e.recall_value}</code>
                      </dd>
                    </>
                  )}
                  {e.source_tier && (
                    <>
                      <dt>Source tier</dt>
                      <dd>
                        Tier {e.source_tier}
                        {e.source_tier === 'A'
                          ? ' — Official authority'
                          : e.source_tier === 'B'
                            ? ' — Manufacturer'
                            : ' — Retail listing'}
                      </dd>
                    </>
                  )}
                  {e.retrieved_at && (
                    <>
                      <dt>Retrieved</dt>
                      <dd>{new Date(e.retrieved_at).toLocaleString()}</dd>
                    </>
                  )}
                  {e.method && (
                    <>
                      <dt>Method</dt>
                      <dd>{e.method}</dd>
                    </>
                  )}
                </dl>

                {thumb && (
                  <img
                    className="ev-thumb"
                    src={thumb}
                    alt="Captured screenshot for this evidence excerpt"
                  />
                )}

                <div className="ev-actions-row">
                  <button
                    type="button"
                    className="btn btn-paper-outline btn-sm"
                    onClick={() => copyEvidence(e)}
                  >
                    {copiedId === e.id ? 'Copied evidence ✓' : 'Copy evidence'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </aside>
    </>
  )
}
