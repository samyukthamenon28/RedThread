// Adapters so the UI accepts BOTH the contract shapes (contracts/models.py) and the shapes in
// fixtures/events_canned.json / graph_fixture.json.
import { API, DISCLAIMER } from './constants.js'

export function shotUrl(p) {
  if (!p || typeof p !== 'string') return null
  const cleaned = p.trim().replace(/\\/g, '/')
  if (!cleaned) return null
  if (/^https?:\/\//i.test(cleaned) || /^data:image\//i.test(cleaned)) return cleaned
  const runsIdx = cleaned.lastIndexOf('runs/')
  if (runsIdx >= 0) {
    return `${API}/shots/${cleaned.slice(runsIdx + 5).replace(/^\/+/, '')}`
  }
  const shotsMatch = cleaned.match(/^\/?shots\/(.+)$/i)
  if (shotsMatch) {
    return `${API}/shots/${shotsMatch[1].replace(/^\/+/, '')}`
  }
  return `${API}/shots/${cleaned.replace(/^\/+/, '')}`
}

export function normEvent(raw) {
  const p = raw.payload || {}
  return {
    run_id: raw.run_id,
    seq: raw.seq,
    ts: raw.ts || raw.timestamp || null,
    type: raw.type,
    payload: p,
  }
}

export function normNode(n) {
  return {
    id: n.id,
    type: n.type || n.kind || 'Listing',
    label: n.label || n.id,
    props: n.props || n.properties || {},
  }
}

export function normLink(l) {
  const props = l.props || l.properties || {}
  return {
    id: l.id,
    source: typeof l.source === 'object' ? l.source.id : l.source,
    target: typeof l.target === 'object' ? l.target.id : l.target,
    type: l.type || l.kind || 'RELATED_TO',
    tier: l.tier || props.tier || null,
    reasons: l.reasons || props.reasons || [],
    evidence: l.evidence || l.evidence_ids || [],
  }
}

export function normDelta(p) {
  return {
    nodes: (p.nodes || p.nodes_added || []).map(normNode),
    links: (p.links || p.edges || p.links_added || p.edges_added || []).map(normLink),
  }
}

export function normGraph(g) {
  return {
    nodes: (g.nodes || []).map(normNode),
    links: (g.links || g.edges || []).map(normLink),
  }
}

// A field may be a contract Quoted {value, evidence_quote, verified} or a plain string (canned data).
export function fieldOf(v) {
  if (v == null) return null
  if (typeof v === 'object' && 'value' in v) {
    return {
      value: v.value,
      quote: v.evidence_quote,
      verified: v.verified,
      evidence_id: v.evidence_id,
    }
  }
  return { value: String(v), quote: null, verified: null }
}

export function normExtraction(p) {
  const rows = []
  const add = (label, v) => {
    const f = fieldOf(v)
    if (f) rows.push({ label, ...f })
  }
  add('Brand', p.brand)
  add('Product', p.product_name || p.title)
  ;(p.model_numbers || []).forEach((q) => add('Model', q))
  if (p.model) add('Model', p.model)
  ;(p.gtins || []).forEach((q) => add('GTIN', q))
  if (p.gtin) add('GTIN', p.gtin)
  ;(p.lot_or_date_info || []).forEach((q) => add('Date or lot', q))
  if (p.manufacture_date) add('Date or lot', p.manufacture_date)
  if (p.lot_code) add('Lot code', p.lot_code)
  add('Seller', p.seller)
  ;(p.variants || []).forEach((q) => add('Variant', q))
  return {
    listing_id: p.listing_id,
    source_url: p.source_url,
    status: p.capture_status || 'ok',
    rows,
  }
}

export function normMatch(p) {
  return {
    listing_id: p.listing_id,
    recall_id: p.recall_id || p.recall_number || '',
    tier: p.tier || p.best_tier || 'UNRESOLVED',
    reasons: p.reasons || [],
    evidence_ids: p.evidence_ids || (p.evidence || []).map((e) => e.id || e.evidence_id).filter(Boolean),
    explanation: p.explanation || '',
  }
}

export function normRecall(p) {
  return {
    number: p.number || p.recall_number || '',
    authority: p.authority || '',
    title: p.title || '',
    brand: p.brand || '',
    models: p.models || [],
    hazard: p.hazard || '',
    remedy: p.remedy || '',
    url: p.url || '',
    scope: p.scope_type || (p.scope && p.scope.kind) || 'unknown',
  }
}

export function normEvidence(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return {
    ...raw,
    id: raw.id || raw.evidence_id || '',
    quote: raw.quote || raw.evidence_quote || '',
    source_url: raw.source_url || raw.page_url || '',
    retrieved_at: raw.retrieved_at || raw.captured_at || raw.timestamp || null,
    quote_verified: 'quote_verified' in raw ? raw.quote_verified : null,
  }
}

export function normReport(raw, fallbackRecall = null) {
  if (!raw) return null
  const recallBase = { ...(fallbackRecall || {}), ...(raw.recall || {}) }
  const recall = {
    number: recallBase.number || recallBase.recall_number || raw.recall_number || '',
    authority: recallBase.authority || (raw.recall_number ? 'CPSC' : ''),
    title: recallBase.title || raw.recall_title || '',
    brand: recallBase.brand || '',
    models: recallBase.models || [],
    hazard: recallBase.hazard || '',
    remedy: recallBase.remedy || '',
    url: recallBase.url || '',
    scope: recallBase.scope || recallBase.scope_type || 'unknown',
  }

  const listings = (raw.listings || []).map((l) => ({
    ...l,
    tier: l.tier || l.best_tier || 'UNRESOLVED',
    title: l.title || l.listing_id,
    reasons: l.reasons || [],
    evidence_ids: l.evidence_ids || [],
  }))

  let sources_checked = raw.sources_checked || []
  let not_checked = raw.not_checked || []
  if (Array.isArray(raw.coverage) && raw.coverage.length > 0 && !raw.sources_checked) {
    sources_checked = raw.coverage
      .filter((c) => c.status === 'checked')
      .map((c) => ({
        name: c.source || c.name || 'Source',
        url: c.url || '',
        retrieved_at: c.checked_at || c.retrieved_at || null,
      }))
    not_checked = raw.coverage
      .filter((c) => c.status !== 'checked')
      .map((c) => c.source || c.name || 'Unspecified source')
  }

  const counts = raw.counts || raw.tier_counts || countsOf(
    Object.fromEntries(listings.map((l) => [l.listing_id, l]))
  )

  return {
    ...raw,
    recall,
    counts,
    listings,
    conflicts: raw.conflicts || [],
    unresolved: raw.unresolved || [],
    sources_checked,
    not_checked,
    mode_badge: raw.mode_badge || raw.mode || 'live',
    disclaimer: raw.disclaimer || DISCLAIMER,
  }
}

export const tierOrder = ['CONFIRMED', 'LIKELY', 'CONFLICT', 'RELATED', 'UNRESOLVED', 'NO_MATCH']
export const sortByTier = (a, b) => {
  const ai = tierOrder.indexOf(a.tier || a.best_tier)
  const bi = tierOrder.indexOf(b.tier || b.best_tier)
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
}

// Which pipeline stages have been reached, derived from events (the contract has no stage field).
export function stagesFrom(events) {
  const s = { official: false, harvest: false, discover: false, inspect: false, extract: false, match: false, report: false }
  for (const e of events) {
    const p = e.payload
    if (e.type === 'official_record') s.official = true
    if (e.type === 'step_started' && (p.step === 'harvest_notice' || p.stage === 'harvest' || p.kind === 'harvest_notice')) s.harvest = true
    if (e.type === 'step_started' && (p.step === 'discover_and_inspect' || p.stage === 'discover' || p.kind === 'discover_and_inspect')) s.discover = true
    if (e.type === 'page_visited' && p.source_tier === 'A') s.harvest = true
    if (e.type === 'page_visited' && /\/(listings|product)\//.test(p.url || '')) { s.discover = true; s.inspect = true }
    if (e.type === 'extraction') s.extract = true
    if (e.type === 'match_result') s.match = true
    if (e.type === 'run_finished') s.report = true
  }
  return s
}

export function countsOf(results) {
  const c = { CONFIRMED: 0, LIKELY: 0, RELATED: 0, CONFLICT: 0, NO_MATCH: 0, UNRESOLVED: 0 }
  Object.values(results).forEach((r) => {
    const t = r?.tier || r?.best_tier
    if (c[t] != null) c[t] += 1
  })
  return c
}
