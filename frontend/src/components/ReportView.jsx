import { useState } from 'react'
import { DISCLAIMER, REASON_TEXT, TIERS, TIER_STYLE } from '../constants.js'
import { exportUrl, narrateReport, archiveReport } from '../api.js'
import { sortByTier } from '../normalize.js'
import { Chip } from './Chip.jsx'
import { Badges } from './Badges.jsx'

function AudioGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 6v4h3l4 3V3L5 6H2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.5 5.2a4 4 0 0 1 0 5.6M13.5 3.3a6.5 6.5 0 0 1 0 9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ArchiveGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 5.5v8h10v-8M6.2 8.5h3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function ReportView({ report, mode, runId, onBack, onEvidence }) {
  const badge = mode === 'demo' ? 'demo' : report.mode_badge === 'recorded' ? 'recorded' : 'live'
  const rows = [...(report.listings || [])].sort(sortByTier)
  const [audioUrl, setAudioUrl] = useState(null)
  const [scriptText, setScriptText] = useState(null)
  const [narrating, setNarrating] = useState(false)
  const [narrateErr, setNarrateErr] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveResult, setArchiveResult] = useState(null)
  const [archiveErr, setArchiveErr] = useState(null)

  const handleNarrate = async () => {
    setNarrating(true)
    setNarrateErr(null)
    try {
      const res = await narrateReport(runId)
      if (res.isAudio) {
        setAudioUrl(res.audioUrl)
        setScriptText(null)
      } else {
        setScriptText(res.script)
        setAudioUrl(null)
      }
    } catch (e) {
      setNarrateErr(e.message)
    } finally {
      setNarrating(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    setArchiveErr(null)
    try {
      const res = await archiveReport(runId)
      setArchiveResult(res)
    } catch (e) {
      setArchiveErr(e.message)
    } finally {
      setArchiving(false)
    }
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `redthread-report-${runId || 'case'}.json`
    a.click()
  }

  const r = report.recall || {}
  const counts = report.counts || {}

  return (
    <div className="report-backdrop">
      <div className="noprint report-toolbar">
        <div className="report-toolbar-group">
          <button type="button" className="btn" onClick={onBack}>
            ← Back to board
          </button>
          <span className="label-caps">Case {runId || 'local'}</span>
        </div>

        <div className="report-toolbar-group">
          {mode === 'demo' ? (
            <button type="button" className="btn" onClick={download}>
              Export JSON
            </button>
          ) : (
            <a className="btn" href={exportUrl(runId)} download>
              Export JSON
            </a>
          )}
          <button type="button" className="btn" onClick={() => window.print()}>
            Print dossier
          </button>
          {mode !== 'demo' && (
            <>
              <button
                type="button"
                className="btn btn-thread"
                onClick={handleNarrate}
                disabled={narrating}
              >
                <AudioGlyph />
                {narrating ? 'Generating briefing…' : 'Voice Briefing (ElevenLabs)'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleArchive}
                disabled={archiving}
              >
                <ArchiveGlyph />
                {archiving ? 'Archiving…' : 'Archive to AWS'}
              </button>
            </>
          )}
        </div>
      </div>

      {narrateErr && (
        <div className="alert-banner" style={{ maxWidth: 960, margin: '0 auto 1rem' }} role="alert">
          {narrateErr}
        </div>
      )}
      {archiveErr && (
        <div className="alert-banner" style={{ maxWidth: 960, margin: '0 auto 1rem' }} role="alert">
          {archiveErr}
        </div>
      )}

      <article className="report-sheet">
        <header className="report-masthead">
          <div>
            <span className="paper-label-caps">Redthread // Product Recall Exposure Dossier</span>
            <h1>Exposure Report</h1>
          </div>
          <div className="report-meta-block">
            <Badges mode={badge} onPaper />
            <div>
              CASE REF: <strong style={{ color: 'var(--paper-ink)' }}>{runId || 'DEMO'}</strong>
            </div>
            <div>GENERATED: {new Date().toLocaleDateString()}</div>
          </div>
        </header>

        {audioUrl && (
          <section className="sponsor-brief-box noprint" style={{ marginTop: '1.2rem' }}>
            <span className="paper-label-caps">ElevenLabs Audio Briefing</span>
            <audio controls autoPlay src={audioUrl} style={{ width: '100%', marginTop: '0.5rem' }} />
          </section>
        )}

        {scriptText && (
          <section className="sponsor-brief-box" style={{ marginTop: '1.2rem' }}>
            <span className="paper-label-caps">ElevenLabs Briefing Script</span>
            <pre className="sponsor-script">{scriptText}</pre>
          </section>
        )}

        {archiveResult && (
          <section className="sponsor-brief-box" style={{ marginTop: '1.2rem' }}>
            <span className="paper-label-caps">AWS S3 Evidence Archival Manifest</span>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.84rem' }}>
              <strong>{archiveResult.file_count} artifact files</strong> archived to{' '}
              <code>
                s3://{archiveResult.bucket}/{archiveResult.prefix}
              </code>
            </p>
            {archiveResult.message && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: 'var(--paper-muted)' }}>
                {archiveResult.message}
              </p>
            )}
          </section>
        )}

        {/* Oversized Editorial Tier Counts */}
        <section className="report-tier-grid" aria-label="Verdict counts by tier">
          {TIERS.map((t) => {
            const s = TIER_STYLE[t]
            const val = counts[t] ?? 0
            return (
              <div
                key={t}
                className={`report-tier-tile${t === 'CONFIRMED' && val > 0 ? ' tile-confirmed' : ''}${val === 0 ? ' tile-zero' : ''}`}
                style={{ '--tile-color': s.inkOnPaper }}
              >
                <span className="report-tier-num">{val}</span>
                <span className="paper-label-caps" style={{ color: s.inkOnPaper }}>
                  {s.stamp}
                </span>
              </div>
            )
          })}
        </section>

        {/* Official Recall Record */}
        <section className="report-section">
          <div className="report-section-head">
            <h2>Official Recall Notice</h2>
            <span className="paper-label-caps">Tier A Authority Record</span>
          </div>

          <div className="report-recall-box">
            <span className="paper-label-caps">
              {r.authority || 'CPSC'} · Recall {r.number || report.recall_number || '—'}
            </span>
            <div className="report-recall-title">
              {r.title || report.recall_title || 'Official recall notice'}
            </div>
            {(r.brand || r.models?.length > 0) && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--paper-muted)' }}>
                {[
                  r.brand,
                  r.models?.length ? `${r.models.length} model identifier(s): ${r.models.join(', ')}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}

            {(r.hazard || r.remedy || r.url) && (
              <div className="report-recall-facts">
                {r.hazard && (
                  <div>
                    <span className="paper-label-caps" style={{ display: 'block', marginBottom: '0.2rem' }}>
                      Hazard
                    </span>
                    {r.hazard}
                  </div>
                )}
                {r.remedy && (
                  <div>
                    <span className="paper-label-caps" style={{ display: 'block', marginBottom: '0.2rem' }}>
                      Official Remedy
                    </span>
                    {r.remedy}
                  </div>
                )}
                {r.url && (
                  <div>
                    <span className="paper-label-caps" style={{ display: 'block', marginBottom: '0.2rem' }}>
                      Reference Notice
                    </span>
                    <a className="ev-url-link" href={r.url} target="_blank" rel="noreferrer">
                      {r.url}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Inspected Listings (Designed Paper Cards, Sorted by Tier) */}
        <section className="report-section">
          <div className="report-section-head">
            <h2>Evaluated Listings ({rows.length})</h2>
            <span className="paper-label-caps">Ordered by severity tier</span>
          </div>

          <div className="report-listings-grid">
            {rows.map((l) => {
              const s = TIER_STYLE[l.tier] || TIER_STYLE.UNRESOLVED
              const reasons = l.reasons || []
              return (
                <div
                  key={l.listing_id}
                  className="report-listing-card"
                  style={{ '--tier-accent': s.inkOnPaper }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="paper-label-caps">{l.listing_id}</div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.3rem',
                        color: 'var(--paper-ink)',
                        margin: '0.1rem 0 0.2rem',
                      }}
                    >
                      {l.title || l.listing_id}
                    </h3>
                    {l.url && (
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: 'var(--paper-muted)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {l.url}
                      </div>
                    )}
                    {reasons.length > 0 ? (
                      <ul className="verdict-reasons" style={{ marginBottom: 0 }}>
                        {reasons.map((code) => (
                          <li key={code} className="verdict-reason-item inline-reason">
                            <span className="reason-code-pill">{code}</span>{' '}
                            <span>{REASON_TEXT[code] || code}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--paper-muted)' }}>
                        {l.tier === 'NO_MATCH'
                          ? 'No match found in checked sources.'
                          : 'No rule reason codes attached.'}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '0.55rem',
                    }}
                  >
                    <Chip tier={l.tier} long onPaper flat />
                    <button
                      type="button"
                      className="btn btn-paper-outline btn-sm noprint"
                      onClick={() =>
                        onEvidence({
                          title: l.title || l.listing_id,
                          subtitle: l.url || l.listing_id,
                          tier: l.tier,
                          reasons,
                          evidenceIds: l.evidence_ids || [],
                        })
                      }
                    >
                      Open evidence ({(l.evidence_ids || []).length})
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {(report.conflicts || []).length > 0 && (
          <section className="report-section">
            <div className="report-section-head">
              <h2>Source Conflicts</h2>
              <span className="paper-label-caps">Requires human review</span>
            </div>
            {report.conflicts.map((c, i) => (
              <div
                key={i}
                className="report-listing-card"
                style={{ '--tier-accent': TIER_STYLE.CONFLICT.inkOnPaper, marginBottom: '0.6rem' }}
              >
                <div>
                  <Chip tier="CONFLICT" onPaper flat />
                  <p style={{ margin: '0.45rem 0 0', fontSize: '0.84rem' }}>
                    {c.detail || c.explanation || c.field || JSON.stringify(c)}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {(report.unresolved || []).length > 0 && (
          <section className="report-section">
            <div className="report-section-head">
              <h2>Unresolved Captures</h2>
              <span className="paper-label-caps">Blocked or incomplete</span>
            </div>
            {report.unresolved.map((u, i) => (
              <div
                key={i}
                className="report-listing-card"
                style={{ '--tier-accent': TIER_STYLE.UNRESOLVED.inkOnPaper, marginBottom: '0.6rem' }}
              >
                <div>
                  <Chip tier="UNRESOLVED" onPaper flat />
                  <p style={{ margin: '0.45rem 0 0', fontSize: '0.84rem' }}>
                    <code>{u.listing_id || u.url}</code> —{' '}
                    {(u.reasons || []).map((c) => REASON_TEXT[c] || c).join(' ')}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Coverage & What We Did Not Check */}
        <section className="report-section">
          <div className="report-section-head">
            <h2>Investigation Coverage</h2>
            <span className="paper-label-caps">Scope boundaries</span>
          </div>
          <div className="report-coverage-grid">
            <div className="coverage-box">
              <span className="paper-label-caps">Sources Checked</span>
              <ul>
                {(report.sources_checked || []).map((s, i) => (
                  <li key={i}>
                    <strong>{s.name}</strong>
                    {s.retrieved_at ? ` · ${new Date(s.retrieved_at).toLocaleString()}` : ''}
                    {s.url ? ` · ${s.url}` : ''}
                  </li>
                ))}
                {!(report.sources_checked || []).length && (
                  <li style={{ color: 'var(--paper-muted)' }}>No external sources listed.</li>
                )}
              </ul>
            </div>

            <div className="coverage-box not-checked-box">
              <span className="paper-label-caps" style={{ color: 'var(--thread-deep)' }}>
                What We Did Not Check
              </span>
              <ul>
                {(report.not_checked || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
                {!(report.not_checked || []).length && (
                  <li>Other regulatory authorities and unchecked marketplaces.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <footer className="report-disclaimer">
          {report.disclaimer || DISCLAIMER}
        </footer>
        <p className="report-footnote">
          “{TIER_STYLE.NO_MATCH.long}” reports only that checked identifiers did not match the
          official notice in the sources listed above.
        </p>
      </article>
    </div>
  )
}
