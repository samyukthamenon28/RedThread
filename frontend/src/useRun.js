import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import * as api from './api.js'
import { DISCLAIMER } from './constants.js'
import {
  normEvent, normDelta, normGraph, normExtraction, normMatch, normRecall, normReport, shotUrl, countsOf, sortByTier,
} from './normalize.js'

const empty = () => ({
  events: [],
  recall: null,
  page: {
    url: '',
    title: '',
    shot: null,
    shotSeq: 0,
    hasCurrentShot: false,
    count: 0,
    status: 'idle',
    blockReason: '',
    sourceTier: null,
    history: [],
  },
  step: 0,
  maxSteps: null,
  log: [],
  extractions: [],
  results: {},
  graph: { nodes: [], links: [] },
  conflicts: [],
  finished: null,
  errors: [],
  seed: {},
})

function mergeGraph(g, delta, seed, nowTs) {
  const nodes = [...g.nodes]
  const links = [...g.links]
  const has = (id) => nodes.some((n) => n.id === id)
  delta.nodes.forEach((n) => {
    if (!has(n.id)) nodes.push({ ...n, _bornAt: nowTs })
  })
  delta.links.forEach((l) => {
    ;[l.source, l.target].forEach((id) => {
      if (!has(id) && seed[id]) nodes.push({ ...seed[id], _bornAt: nowTs })
    })
    if (!links.some((x) => x.id === l.id)) links.push({ ...l, _bornAt: nowTs })
  })
  return { nodes, links }
}

function linkNodeId(end) {
  return typeof end === 'object' && end !== null ? end.id : end
}

function enrichResults(results, graph, extractions) {
  const byId = {}
  const extById = {}
  extractions.forEach((x) => { extById[x.listing_id] = x })

  Object.entries(results).forEach(([id, r]) => {
    const ext = extById[id]
    const suffix = String(id).split('-').pop()?.toLowerCase()
    const node = graph.nodes.find((n) => {
      if (n.type !== 'Listing') return false
      if (n.props?.listing_id === id) return true
      if (ext?.source_url && n.props?.url && n.props.url.toLowerCase() === ext.source_url.toLowerCase()) return true
      if (n.id === `listing-${suffix}` || n.id.toLowerCase() === `listing-${suffix}`) return true
      return false
    })

    let evidenceIds = [...(r.evidence_ids || [])]
    if (node) {
      const attached = graph.links
        .filter((l) => linkNodeId(l.source) === node.id || linkNodeId(l.target) === node.id)
        .flatMap((l) => l.evidence || [])
      evidenceIds = [...new Set([...evidenceIds, ...attached])]
    }

    const brandRow = ext?.rows?.find((row) => row.label === 'Brand')
    const modelRow = ext?.rows?.find((row) => row.label === 'Model')

    byId[id] = {
      ...r,
      title: r.title || node?.label || id,
      url: r.url || node?.props?.url || ext?.source_url || '',
      brand: r.brand || brandRow?.value || '',
      model: r.model || modelRow?.value || '',
      nodeId: node?.id || null,
      evidence_ids: evidenceIds,
    }
  })

  return byId
}

function reducer(s, a) {
  if (a.type === 'reset') return { ...empty(), seed: a.seed || {} }
  if (a.type === 'graph') {
    const nowTs = Date.now()
    return {
      ...s,
      graph: mergeGraph(s.graph, { nodes: a.graph.nodes, links: a.graph.links }, s.seed, nowTs),
    }
  }
  if (a.type !== 'event') return s
  const e = a.ev
  const p = e.payload || {}
  const nowTs = Date.now()
  const next = { ...s, events: [...s.events, e] }
  switch (e.type) {
    case 'run_started':
      next.log = [
        ...s.log,
        {
          kind: 'step',
          seq: e.seq,
          ts: e.ts,
          text: `Case opened for recall ${p.recall_ref || ''}`.trim(),
          url: p.shop_url,
        },
      ]
      break
    case 'step_started': {
      const n = typeof p.step === 'number' ? p.step : s.step + 1
      next.step = n
      if (p.max_steps) next.maxSteps = p.max_steps
      next.log = [
        ...s.log,
        {
          kind: 'step',
          seq: e.seq,
          ts: e.ts,
          text: typeof p.step === 'string' ? p.step.replace(/_/g, ' ') : `Step ${n}`,
          url: p.url,
        },
      ]
      break
    }
    case 'tool_call':
      next.log = [
        ...s.log,
        {
          kind: 'tool',
          seq: e.seq,
          ts: e.ts,
          tool: p.tool,
          args: p.args || {},
          reason: p.reason || p.reasoning_summary || '',
          allowed: p.allowed !== false,
          error: p.error || '',
        },
      ]
      break
    case 'page_visited': {
      const rawShot = p.screenshot_url || p.screenshot_path || p.screenshot || p.shot || null
      const resolvedShot = shotUrl(rawShot)
      const status = p.status || (p.blocked ? 'blocked' : 'ok')
      const blockReason = p.block_reason || p.error || ''
      const nextCount = s.page.count + 1
      next.page = {
        url: p.url || s.page.url,
        title: p.title || '',
        shot: resolvedShot || s.page.shot,
        shotSeq: resolvedShot ? (e.seq ?? nextCount) : s.page.shotSeq,
        hasCurrentShot: Boolean(resolvedShot),
        count: nextCount,
        status,
        blockReason,
        sourceTier: p.source_tier || null,
        history: [
          ...s.page.history.slice(-11),
          {
            url: p.url || '',
            title: p.title || '',
            status,
            shot: resolvedShot,
            seq: e.seq ?? nextCount,
            tier: p.source_tier || null,
          },
        ],
      }
      next.log = [
        ...s.log,
        {
          kind: 'page',
          seq: e.seq,
          ts: e.ts,
          url: p.url,
          title: p.title,
          status,
          hasShot: Boolean(resolvedShot),
        },
      ]
      break
    }
    case 'official_record':
      next.recall = { ...(s.recall || {}), ...normRecall(p) }
      next.log = [
        ...s.log,
        {
          kind: 'official',
          seq: e.seq,
          ts: e.ts,
          text: `Official record ${next.recall.authority || ''} ${next.recall.number || ''}${p.enriched ? ' (enriched)' : ''}`.trim(),
        },
      ]
      break
    case 'extraction': {
      const x = normExtraction(p)
      next.extractions = [...s.extractions.filter((y) => y.listing_id !== x.listing_id), x]
      break
    }
    case 'match_result': {
      const m = normMatch(p)
      next.results = { ...s.results, [m.listing_id]: m }
      break
    }
    case 'conflict':
      next.conflicts = [...s.conflicts, p]
      next.log = [
        ...s.log,
        {
          kind: 'error',
          seq: e.seq,
          ts: e.ts,
          text: `Conflict flagged: ${p.detail || p.type || 'source discrepancy'}`,
        },
      ]
      break
    case 'graph_delta':
      next.graph = mergeGraph(s.graph, normDelta(p), s.seed, nowTs)
      break
    case 'run_finished':
      next.finished = p
      next.log = [
        ...s.log,
        {
          kind: 'official',
          seq: e.seq,
          ts: e.ts,
          text: `Investigation complete · ${p.total_listings ?? Object.keys(s.results).length} listings evaluated`,
        },
      ]
      break
    case 'run_error':
      next.errors = [...s.errors, p.error || p.message || p.code || 'Non-fatal error']
      next.log = [
        ...s.log,
        {
          kind: 'error',
          seq: e.seq,
          ts: e.ts,
          text: p.error || p.message || p.code || 'Non-fatal error',
        },
      ]
      break
    default:
      break
  }
  return next
}

export function useRun() {
  const [state, dispatch] = useReducer(reducer, undefined, empty)
  const [mode, setMode] = useState(null) // 'live' | 'recorded' | 'demo'
  const [runId, setRunId] = useState(null)
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [error, setError] = useState('')
  const [rawReport, setRawReport] = useState(null)
  const seen = useRef(new Set())
  const closer = useRef(() => {})

  const ingest = useCallback((raw) => {
    const ev = normEvent(raw)
    if (ev.seq != null) {
      if (seen.current.has(ev.seq)) return
      seen.current.add(ev.seq)
    }
    dispatch({ type: 'event', ev })
  }, [])

  const reset = useCallback((seed) => {
    closer.current()
    seen.current = new Set()
    dispatch({ type: 'reset', seed })
    setRawReport(null)
    setError('')
    setStatus('running')
  }, [])

  const finishLive = useCallback(async (id) => {
    try {
      const [g, r] = await Promise.all([api.getGraph(id), api.getReport(id)])
      dispatch({ type: 'graph', graph: normGraph(g) })
      setRawReport(r)
      setMode((m) => (m === 'live' && (r.mode_badge === 'recorded' || r.mode === 'recorded') ? 'recorded' : m))
    } catch (e) {
      setError(`Could not load the final report: ${e.message}`)
    }
    setStatus('done')
  }, [])

  const follow = useCallback(
    (id) => {
      const es = new EventSource(api.eventsUrl(id))
      let done = false
      closer.current = () => {
        done = true
        es.close()
      }
      es.onmessage = (m) => {
        let raw
        try {
          raw = JSON.parse(m.data)
        } catch {
          return
        }
        if (raw?.payload?._replayed) {
          setMode((curr) => (curr === 'live' ? 'recorded' : curr))
        }
        ingest(raw)
        if (raw.type === 'run_finished') {
          done = true
          es.close()
          finishLive(id)
        }
      }
      es.onerror = () => {
        if (!done) {
          es.close()
          setError('Lost the live event stream. Check that the backend is running on port 8000.')
          setStatus('error')
        }
      }
    },
    [ingest, finishLive]
  )

  const startLive = useCallback(
    async (recall, shop, replayId) => {
      reset()
      setMode(replayId ? 'recorded' : 'live')
      try {
        const { run_id } = await api.startRun(recall, shop, replayId)
        setRunId(run_id)
        follow(run_id)
      } catch (e) {
        setError(`Could not start the run: ${e.message}`)
        setStatus('error')
      }
    },
    [reset, follow]
  )

  const startDemo = useCallback(async () => {
    setMode('demo')
    setRunId('demo')
    try {
      const [evs, g] = await Promise.all([
        api.getJson('/demo/events_canned.json'),
        api.getJson('/demo/graph_fixture.json'),
      ])
      const seed = {}
      normGraph(g).nodes.forEach((n) => {
        seed[n.id] = n
      })
      reset(seed)
      let stop = false
      closer.current = () => {
        stop = true
      }
      for (const raw of evs) {
        if (stop) return
        await new Promise((r) => setTimeout(r, 260))
        if (stop) return
        ingest(raw)
      }
      // Merge the full fixture graph at the end so all semantic links (Models, Identifiers, Seller) appear
      dispatch({ type: 'graph', graph: normGraph(g) })
      setStatus('done')
    } catch (e) {
      setError(`Could not load demo fixtures: ${e.message}`)
      setStatus('error')
    }
  }, [reset, ingest])

  const enrichedResults = useMemo(
    () => enrichResults(state.results, state.graph, state.extractions),
    [state.results, state.graph, state.extractions]
  )

  const report = useMemo(() => {
    if (rawReport) return normReport(rawReport, state.recall)
    if (mode === 'demo' && status === 'done') {
      const rows = Object.values(enrichedResults)
        .map((m) => ({
          listing_id: m.listing_id,
          url: m.url || '',
          title: m.title || m.listing_id,
          brand: m.brand || '',
          model: m.model || '',
          tier: m.tier,
          reasons: m.reasons,
          evidence_ids: m.evidence_ids,
        }))
        .sort(sortByTier)
      return normReport(
        {
          run_id: 'demo',
          mode_badge: 'recorded',
          demo: true,
          recall: state.recall,
          counts: countsOf(enrichedResults),
          listings: rows,
          conflicts: state.conflicts,
          unresolved: rows
            .filter((r) => r.tier === 'UNRESOLVED')
            .map((r) => ({ listing_id: r.listing_id, reasons: r.reasons })),
          sources_checked: state.page.history.length
            ? state.page.history.slice(0, 8).map((h) => ({
                name: h.title || h.url || 'Checked page',
                url: h.url,
              }))
            : state.page.url
              ? [{ name: 'Pages visited in this demo', url: state.page.url }]
              : [],
          not_checked: ['Health Canada', 'EU RAPEX', 'Other retail marketplaces', 'Unlisted offline sellers'],
          disclaimer: DISCLAIMER,
        },
        state.recall
      )
    }
    return null
  }, [rawReport, mode, status, enrichedResults, state.recall, state.conflicts, state.page])

  const stop = useCallback(() => {
    closer.current()
    setStatus('idle')
  }, [])

  const enrichedState = useMemo(
    () => ({ ...state, results: enrichedResults }),
    [state, enrichedResults]
  )

  return {
    state: enrichedState,
    mode,
    runId,
    status,
    error,
    report,
    startLive,
    startDemo,
    stop,
  }
}
