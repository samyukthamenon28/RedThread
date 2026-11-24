import { Chip, Verified } from './Chip.jsx'

export function ExtractionPanel({ extractions, results }) {
  if (!extractions.length) {
    return (
      <div className="dossier-scroll">
        <div className="dossier-empty">
          <span className="label-caps" style={{ display: 'block', marginBottom: '0.4rem' }}>
            Field Extractions
          </span>
          Verbatim identifiers extracted from shop pages appear here with quote-verification seals.
        </div>
      </div>
    )
  }

  return (
    <div className="dossier-scroll">
      {extractions.map((x) => {
        const r = results[x.listing_id]
        return (
          <article className="paper-card extraction-card" key={x.listing_id}>
            <div className="extraction-head">
              <div style={{ minWidth: 0 }}>
                <div className="verdict-tag-id">
                  <span className="paper-pin" aria-hidden="true" />
                  <span>{x.listing_id}</span>
                </div>
                {x.source_url && <p className="extraction-url">{x.source_url}</p>}
              </div>
              {r && <Chip tier={r.tier} reasons={r.reasons} onPaper flat />}
            </div>

            {x.status !== 'ok' && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--thread-deep)' }}>
                Capture status: <code>{x.status}</code>. No fields extracted.
              </p>
            )}

            <div className="extraction-rows">
              {x.rows.map((f, i) => (
                <div className="extraction-row" key={`${f.label}-${i}`}>
                  <div className="extraction-row-top">
                    <span className="paper-label-caps">{f.label}</span>
                    <Verified ok={f.verified} />
                  </div>
                  <div className="extraction-field-val">{f.value}</div>
                  {f.quote && <blockquote className="extraction-quote">“{f.quote}”</blockquote>}
                </div>
              ))}
              {x.rows.length === 0 && x.status === 'ok' && (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--paper-muted)' }}>
                  No field survived verbatim quote verification.
                </p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
