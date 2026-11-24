import { useState } from 'react'
import { DEFAULT_RECALL, DEFAULT_SHOP } from '../constants.js'
import { getReplays } from '../api.js'
import { Badges } from './Badges.jsx'

export function StartScreen({ onLive, onReplay, onDemo }) {
  const [recall, setRecall] = useState(DEFAULT_RECALL)
  const [shop, setShop] = useState(DEFAULT_SHOP)
  const [useDemo, setUseDemo] = useState(false)
  const [note, setNote] = useState('')
  const [loadingReplay, setLoadingReplay] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setNote('')
    if (useDemo) {
      onDemo()
      return
    }
    onLive(recall.trim() || DEFAULT_RECALL, shop.trim() || DEFAULT_SHOP)
  }

  const replay = async () => {
    setNote('')
    setLoadingReplay(true)
    try {
      const list = await getReplays()
      const first = Array.isArray(list)
        ? list[0]?.run_id || list[0]?.id || (typeof list[0] === 'string' ? list[0] : null)
        : null
      if (!first) {
        setNote('No recorded run is available yet. Finish one live run first, or toggle Demo data.')
        return
      }
      onReplay(recall.trim() || DEFAULT_RECALL, first)
    } catch (e) {
      setNote(`Could not reach the backend on port 8000 (${e.message}). You can still run Demo data offline.`)
    } finally {
      setLoadingReplay(false)
    }
  }

  return (
    <div className="start-shell">
      <header className="start-topbar">
        <span className="start-case-code">
          <span className="wordmark-dot" aria-hidden="true" />
          REDTHREAD // EVIDENCE DIVISION
        </span>
        <Badges mode={useDemo ? 'demo' : 'live'} />
      </header>

      <main className="start-hero">
        <svg
          className="hero-thread-bg"
          viewBox="0 0 1200 620"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="hero-thread-sub"
            d="M -20 555 Q 320 525, 610 475 T 1240 520"
          />
          <path
            className="hero-thread-path"
            d="M -20 82 C 190 55, 420 58, 565 112 C 635 138, 678 164, 738 158 C 860 146, 1040 82, 1230 98"
          />
          <circle className="hero-thread-pin" cx="110" cy="68" r="4" />
          <circle className="hero-thread-pin" cx="565" cy="112" r="4.8" />
          <circle className="hero-thread-pin" cx="1135" cy="96" r="4" />
        </svg>

        <section className="start-copy">
          <div className="start-kicker">
            <span>Case File Investigation Desk</span>
          </div>
          <h1 className="start-wordmark">
            Red<em>thread</em>
          </h1>
          <p className="start-tagline">
            Follow the thread from a recall to the evidence.
          </p>
          <p className="start-summary">
            An autonomous browser agent opens the official notice, inspects every matching or
            look-alike listing on the shop floor, and pins verbatim quotes to the evidence board.
            Deterministic code assigns every verdict tier—never the language model.
          </p>

          <div className="start-pillars">
            <div>
              <span className="pillar-num">01 / CAPTURE</span>
              <span className="pillar-title">Live browser trace</span>
              <p className="pillar-desc">
                Every page visit, tab click, and bot-check block is logged with a timestamped frame.
              </p>
            </div>
            <div>
              <span className="pillar-num">02 / VERIFY</span>
              <span className="pillar-title">Verbatim quotes only</span>
              <p className="pillar-desc">
                Extracted identifiers are verified against captured page text; unverified fields drop.
              </p>
            </div>
            <div>
              <span className="pillar-num">03 / RATE</span>
              <span className="pillar-title">Deterministic tiers</span>
              <p className="pillar-desc">
                Six explicit tiers with plain-English reason codes and zero unsupported claims.
              </p>
            </div>
          </div>
        </section>

        <form className="paper-card intake-dossier" onSubmit={handleSubmit}>
          <div className="intake-header">
            <div className="intake-title-group">
              <span className="paper-pin pin-red" aria-hidden="true" />
              <h2>Open Case File</h2>
            </div>
            <span className="paper-label-caps">Form RT-01</span>
          </div>

          <label className="field-group">
            <span className="field-label">
              <span className="paper-label-caps">Official Recall Reference</span>
              <span className="paper-label-caps">CPSC ID</span>
            </span>
            <input
              className="field-input"
              value={recall}
              onChange={(e) => setRecall(e.target.value)}
              placeholder="e.g. 26419"
            />
          </label>

          <label className="field-group">
            <span className="field-label">
              <span className="paper-label-caps">Target Shop URL</span>
              <span className="paper-label-caps">Allowlisted</span>
            </span>
            <input
              className="field-input"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="http://localhost:8001"
            />
          </label>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              fontSize: '0.78rem',
              color: 'var(--paper-muted)',
              marginTop: '0.15rem',
            }}
          >
            <input
              type="checkbox"
              checked={useDemo}
              onChange={(e) => setUseDemo(e.target.checked)}
              style={{ accentColor: 'var(--thread-deep)' }}
            />
            <span>Run offline with built-in demo fixture data</span>
          </label>

          <div className="intake-actions">
            <button type="submit" className="btn btn-thread" style={{ width: '100%', padding: '0.68rem 1rem' }}>
              {useDemo ? 'Open Demo Case File' : 'Investigate Recall'}
            </button>
            <div className="intake-secondary-row">
              <button
                type="button"
                className="btn btn-paper-outline"
                onClick={replay}
                disabled={loadingReplay}
              >
                {loadingReplay ? 'Loading…' : 'Replay recorded run'}
              </button>
              <button
                type="button"
                className="btn btn-paper"
                onClick={() => onDemo()}
              >
                Use demo data
              </button>
            </div>
          </div>

          {note && (
            <p className="intake-error" role="status">
              {note}
            </p>
          )}

          <p className="intake-footnote">
            Investigations run against the sandbox shop for testing. Replays always display a
            Recorded run badge and are never presented as live.
          </p>
        </form>
      </main>
    </div>
  )
}
