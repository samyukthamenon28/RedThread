import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  normEvent, normDelta, normGraph, normExtraction, normMatch, normReport, normEvidence, stagesFrom, countsOf, shotUrl,
} from './normalize.js'

const events = JSON.parse(readFileSync(new URL('../public/demo/events_canned.json', import.meta.url))).map(normEvent)
const graph = JSON.parse(readFileSync(new URL('../public/demo/graph_fixture.json', import.meta.url)))

test('canned events normalise (timestamp -> ts) and cover the key types', () => {
  assert.ok(events.every((e) => e.ts))
  const types = new Set(events.map((e) => e.type))
  for (const t of ['run_started', 'tool_call', 'page_visited', 'extraction', 'match_result', 'graph_delta', 'run_finished']) assert.ok(types.has(t), t)
})
test('graph_delta from nodes_added/edges_added becomes nodes/links with tier + evidence', () => {
  const d = normDelta(events.find((e) => e.type === 'graph_delta').payload)
  assert.equal(d.nodes[0].type, 'Listing')
  assert.equal(d.links[0].tier, 'CONFIRMED')
  assert.deepEqual(d.links[0].evidence, ['ev-L01-model', 'ev-L01-gtin'])
})
test('fixture graph: every link has evidence and a valid tier when MATCHES', () => {
  const g = normGraph(graph)
  assert.ok(g.links.every((l) => l.evidence.length > 0))
  assert.ok(g.links.filter((l) => l.type === 'MATCHES').every((l) => l.tier))
})
test('contract-shaped Quoted fields keep quote + verified flag; flat strings have none', () => {
  const a = normExtraction({ listing_id: 'l01', model_numbers: [{ value: 'X-1', evidence_quote: 'Model: X-1', verified: true }] })
  assert.equal(a.rows[0].verified, true)
  const b = normExtraction({ listing_id: 'lst', model: 'X-1' })
  assert.equal(b.rows[0].verified, null)
})
test('match_result accepts recall_id or recall_number', () => {
  assert.equal(normMatch({ listing_id: 'a', recall_number: '5', tier: 'LIKELY' }).recall_id, '5')
})
test('stages and counts', () => {
  const s = stagesFrom(events)
  assert.ok(s.official && s.match && s.report)
  assert.equal(countsOf({ a: { tier: 'CONFIRMED' }, b: { tier: 'NO_MATCH' } }).CONFIRMED, 1)
})
test('shotUrl maps runs/ paths (POSIX & Windows) and avoids double /shots/ prefix', () => {
  assert.match(shotUrl('runs/r1/shots/s1.jpg'), /\/shots\/r1\/shots\/s1\.jpg$/)
  assert.match(shotUrl('C:\\repo\\runs\\r1\\shots\\step_001.jpg'), /\/shots\/r1\/shots\/step_001\.jpg$/)
  assert.match(shotUrl('/shots/r1/shots/s1.jpg'), /\/shots\/r1\/shots\/s1\.jpg$/)
  assert.doesNotMatch(shotUrl('/shots/r1/shots/s1.jpg'), /\/shots\/shots\//)
  assert.equal(shotUrl(null), null)
})
test('normReport adapts backend ReportJSON fields (tier_counts, best_tier, coverage)', () => {
  const r = normReport({
    run_id: 'r1',
    recall_number: '26419',
    recall_title: 'Sample Recall',
    mode: 'live',
    tier_counts: { CONFIRMED: 2, LIKELY: 0, RELATED: 0, CONFLICT: 0, NO_MATCH: 0, UNRESOLVED: 0 },
    listings: [{ listing_id: 'l1', title: 'Item 1', best_tier: 'CONFIRMED', reasons: ['ID_MODEL_EXACT'], evidence_ids: ['e1'] }],
    coverage: [
      { source: 'CPSC', url: 'https://cpsc.gov', status: 'checked' },
      { source: 'EU RAPEX', url: '', status: 'not_checked' },
    ],
  })
  assert.equal(r.counts.CONFIRMED, 2)
  assert.equal(r.listings[0].tier, 'CONFIRMED')
  assert.equal(r.recall.number, '26419')
  assert.equal(r.sources_checked.length, 1)
  assert.deepEqual(r.not_checked, ['EU RAPEX'])
})
test('normEvidence normalizes evidence_id, evidence_quote, page_url aliases', () => {
  const ev = normEvidence({ evidence_id: 'ev1', evidence_quote: 'Model: AAA', page_url: 'http://localhost:8001/l01' })
  assert.equal(ev.id, 'ev1')
  assert.equal(ev.quote, 'Model: AAA')
  assert.equal(ev.source_url, 'http://localhost:8001/l01')
})
