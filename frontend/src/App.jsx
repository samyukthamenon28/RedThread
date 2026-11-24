import { useState } from 'react'
import { useRun } from './useRun.js'
import { stagesFrom } from './normalize.js'
import { DEFAULT_RECALL, DEFAULT_SHOP } from './constants.js'
import { StartScreen } from './components/StartScreen.jsx'
import { Badges } from './components/Badges.jsx'
import { Stepper } from './components/Stepper.jsx'
import { BrowserPanel } from './components/BrowserPanel.jsx'
import { ActionLog } from './components/ActionLog.jsx'
import { GraphPanel } from './components/GraphPanel.jsx'
import { EvidenceDrawer } from './components/EvidenceDrawer.jsx'
import { ExtractionPanel } from './components/ExtractionPanel.jsx'
import { VerdictCards } from './components/VerdictTable.jsx'
import { ReportView } from './components/ReportView.jsx'

export default function App() {
  const run = useRun()
  const { state, mode, status, error, report, runId } = run
  const [view, setView] = useState('start')
  const [tab, setTab] = useState('verdicts')
  const [sel, setSel] = useState(null)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [lastLiveParams, setLastLiveParams] = useState({
    recall: DEFAULT_RECALL,
    shop: DEFAULT_SHOP,
  })

  const startLiveRun = (recall, shop, replayId) => {
    setSel(null)
    setHoveredNodeId(null)
    setLastLiveParams({ recall: recall || DEFAULT_RECALL, shop: shop || DEFAULT_SHOP })
    setView('run')
    run.startLive(recall, shop, replayId)
  }

  const startDemoRun = () => {
    setSel(null)
    setHoveredNodeId(null)
    setView('run')
    run.startDemo()
  }

  const select = (s) => {
    if (s.kind === 'link') {
      const l = s.link
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      setSel({
        title: `${String(l.type || 'LINK').replace(/_/g, ' ')} Thread`,
        subtitle: `${src} → ${tgt}`,
        tier: l.tier,
        reasons: l.reasons || [],
        evidenceIds: l.evidence || [],
      })
    } else if (s.kind === 'node') {
      const n = s.node
      const incident = state.graph.links.filter((l) =>
        [l.source, l.target].map((x) => (typeof x === 'object' ? x.id : x)).includes(n.id)
      )
      const matchLink = incident.find((l) => l.type === 'MATCHES')
      const ids = incident.flatMap((l) => l.evidence || [])
      setSel({
        title: n.label,
        subtitle: n.props?.url || `${n.type} · ${n.id}`,
        tier: matchLink?.tier || null,
        reasons: matchLink?.reasons || [],
        evidenceIds: [...new Set(ids)],
      })
    } else {
      setSel(s)
    }
  }

  const nResults = Object.keys(state.results).length

  if (view === 'start') {
    return (
      <StartScreen
        onLive={(recall, shop) => startLiveRun(recall, shop, null)}
        onReplay={(recall, replayId) => startLiveRun(recall, null, replayId)}
        onDemo={startDemoRun}
      />
    )
  }

  if (view === 'report' && report) {
    return (
      <>
        <ReportView
          report={report}
          mode={mode}
          runId={runId}
          onBack={() => setView('run')}
          onEvidence={select}
        />
        <EvidenceDrawer sel={sel} demo={mode === 'demo'} onClose={() => setSel(null)} />
      </>
    )
  }

  const statusLabel =
    status === 'running'
      ? 'Investigating'
      : status === 'done'
        ? 'Case Complete'
        : status === 'error'
          ? 'Stream Error'
          : 'Standby'

  return (
    <div className="warroom">
      <header className="command-bar">
        <button
          type="button"
          className="wordmark-btn"
          onClick={() => {
            run.stop()
            setSel(null)
            setView('start')
          }}
          title="Return to case intake"
        >
          <span className="wordmark-dot" aria-hidden="true" />
          Redthread
        </button>

        <span className="bar-divider" aria-hidden="true" />

        {state.recall ? (
          <div className="recall-pill" title={`${state.recall.authority} ${state.recall.number} — ${state.recall.title}`}>
            <span className="recall-pill-id">
              {state.recall.authority || 'CPSC'} #{state.recall.number || '—'}
            </span>
            <span className="recall-pill-title">{state.recall.title || state.recall.brand}</span>
          </div>
        ) : (
          <div className="recall-pill">
            <span className="recall-pill-id">CASE {runId || 'OPENING'}</span>
            <span className="recall-pill-title">Fetching official notice…</span>
          </div>
        )}

        <span className={`run-status-pill ${status}`} role="status">
          {status === 'running' && <span className="status-dot" aria-hidden="true" />}
          {statusLabel}
        </span>

        <Badges mode={mode} showDefaultMode />

        <div className="command-bar-end">
          <label className="demo-toggle" title="Toggle built-in offline demo data">
            <input
              type="checkbox"
              checked={mode === 'demo'}
              onChange={(e) => {
                if (e.target.checked) {
                  startDemoRun()
                } else {
                  startLiveRun(lastLiveParams.recall, lastLiveParams.shop, null)
                }
              }}
            />
            <span>Demo data</span>
          </label>

          {report && (
            <button
              type="button"
              className="btn btn-thread btn-sm"
              onClick={() => setView('report')}
            >
              Exposure Report →
            </button>
          )}
        </div>
      </header>

      <Stepper stages={stagesFrom(state.events)} />

      {error && (
        <div className="alert-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={startDemoRun}>
            Switch to Demo Data
          </button>
        </div>
      )}

      <main className="warroom-main">
        {/* Narrow Left Rail: Browser Monitor + Terminal Action Trace */}
        <div className="rail-left">
          <BrowserPanel
            page={state.page}
            step={state.step}
            maxSteps={state.maxSteps}
            running={status === 'running'}
          />
          <ActionLog log={state.log} />
        </div>

        {/* Center Hero (~60%): Interactive Evidence Board */}
        <div className="board-hero">
          <GraphPanel
            graph={state.graph}
            onSelect={select}
            focusNodeId={hoveredNodeId}
          />
        </div>

        {/* Right Case File Column: Verdict Cards & Extraction Dossier */}
        <aside className="rail-right" aria-label="Case file verdicts and extractions">
          <div className="dossier-tabs" role="tablist" aria-label="Case file sections">
            <button
              type="button"
              role="tab"
              className="dossier-tab"
              aria-selected={tab === 'verdicts'}
              onClick={() => setTab('verdicts')}
            >
              Verdicts <span className="tab-count">{nResults}</span>
            </button>
            <button
              type="button"
              role="tab"
              className="dossier-tab"
              aria-selected={tab === 'extraction'}
              onClick={() => setTab('extraction')}
            >
              Extractions <span className="tab-count">{state.extractions.length}</span>
            </button>
          </div>

          {tab === 'verdicts' ? (
            <VerdictCards
              results={state.results}
              onOpen={select}
              onHoverNode={setHoveredNodeId}
            />
          ) : (
            <ExtractionPanel extractions={state.extractions} results={state.results} />
          )}
        </aside>
      </main>

      <EvidenceDrawer sel={sel} demo={mode === 'demo'} onClose={() => setSel(null)} />
    </div>
  )
}
