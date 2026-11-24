import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { NODE_COLOR, TIER_STYLE } from '../constants.js'

const getEndId = (x) => (typeof x === 'object' && x !== null ? x.id : x)

function nodeDims(node) {
  if (node.type === 'Recall') return { w: 156, h: 56 }
  if (node.type === 'Listing') return { w: 140, h: 42 }
  const len = Math.min(24, String(node.label || node.id || '').length)
  return { w: Math.max(72, len * 5.2 + 24), h: 24 }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawPin(ctx, x, y, color, radius = 4.2) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + 0.8, y + 1.4, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = '#0E0F12'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.32, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.68)'
  ctx.fill()
  ctx.restore()
}

function drawPartialQuadCurve(ctx, sx, sy, cx, cy, tx, ty, t) {
  if (t >= 0.995) {
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(cx, cy, tx, ty)
    ctx.stroke()
    return
  }
  const q0x = sx + (cx - sx) * t
  const q0y = sy + (cy - sy) * t
  const q1x = cx + (tx - cx) * t
  const q1y = cy + (ty - cy) * t
  const bx = q0x + (q1x - q0x) * t
  const by = q0y + (q1y - q0y) * t
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.quadraticCurveTo(q0x, q0y, bx, by)
  ctx.stroke()
}

function truncate(str, max) {
  const s = String(str || '')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

export function GraphPanel({ graph, onSelect, focusNodeId = null }) {
  const boxRef = useRef(null)
  const fgRef = useRef(null)
  const [size, setSize] = useState({ w: 740, h: 600 })
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [hoveredLinkId, setHoveredLinkId] = useState(null)
  const userInteracted = useRef(false)
  const programmaticZoomUntil = useRef(0)
  const prevPositions = useRef(new Map())

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Track exact container dimensions
  useEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 40 && rect.height > 40) {
        setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Build graph data with evenly seeded orbital starting positions so cards never clump
  const { data, tierByNode, adjacency } = useMemo(() => {
    const ids = new Set(graph.nodes.map((n) => n.id))
    const validLinks = graph.links
      .filter((l) => ids.has(getEndId(l.source)) && ids.has(getEndId(l.target)))
      .map((l) => ({ ...l }))

    const tierMap = new Map()
    const adj = new Map()
    const addAdj = (a, b, lid) => {
      if (!adj.has(a)) adj.set(a, { nodes: new Set([a]), links: new Set() })
      adj.get(a).nodes.add(b)
      adj.get(a).links.add(lid)
    }

    validLinks.forEach((l) => {
      const s = getEndId(l.source)
      const t = getEndId(l.target)
      addAdj(s, t, l.id)
      addAdj(t, s, l.id)
      if (l.type === 'MATCHES' && l.tier) {
        tierMap.set(s, l.tier)
      }
    })

    const nonRecall = graph.nodes.filter((n) => n.type !== 'Recall')
    const listingNodes = nonRecall.filter((n) => n.type === 'Listing')
    const otherNodes = nonRecall.filter((n) => n.type !== 'Listing')

    const nodes = graph.nodes.map((n) => {
      const prev = prevPositions.current.get(n.id)
      const copy = { ...n }
      if (copy.type === 'Recall') {
        copy.x = 0
        copy.y = 0
        copy.fx = 0
        copy.fy = 0
      } else if (prev) {
        copy.x = prev.x
        copy.y = prev.y
      } else if (copy.type === 'Listing') {
        const idx = Math.max(0, listingNodes.findIndex((x) => x.id === n.id))
        const total = Math.max(listingNodes.length, 1)
        const angle = -Math.PI * 0.72 + (idx / total) * Math.PI * 2
        const radius = 195
        copy.x = Math.cos(angle) * radius
        copy.y = Math.sin(angle) * radius * 0.85
      } else {
        const idx = Math.max(0, otherNodes.findIndex((x) => x.id === n.id))
        const total = Math.max(otherNodes.length, 1)
        const angle = Math.PI * 0.25 + (idx / total) * Math.PI * 2
        const radius = 145
        copy.x = Math.cos(angle) * radius
        copy.y = Math.sin(angle) * radius * 0.85
      }
      return copy
    })

    return { data: { nodes, links: validLinks }, tierByNode: tierMap, adjacency: adj }
  }, [graph])

  // Tune D3 forces with wide spacing + rectangle collision repulsion
  useEffect(() => {
    const fg = fgRef.current
    if (!fg || data.nodes.length === 0) return

    const charge = fg.d3Force('charge')
    if (charge && typeof charge.strength === 'function') {
      charge.strength((n) => (n.type === 'Recall' ? -1100 : n.type === 'Listing' ? -680 : -460))
    }
    const linkForce = fg.d3Force('link')
    if (linkForce && typeof linkForce.distance === 'function') {
      linkForce.distance((l) => (l.type === 'MATCHES' ? 190 : 135))
    }
    // Custom card-overlap repulsion force so paper tags never stack over each other
    fg.d3Force('cardCollide', () => {
      const nodes = data.nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        if (a.x == null || a.y == null) continue
        const da = nodeDims(a)
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          if (b.x == null || b.y == null) continue
          const db = nodeDims(b)
          const minX = (da.w + db.w) / 2 + 22
          const minY = (da.h + db.h) / 2 + 20
          const dx = b.x - a.x
          const dy = b.y - a.y
          const ox = minX - Math.abs(dx)
          const oy = minY - Math.abs(dy)
          if (ox > 0 && oy > 0) {
            if (ox < oy) {
              const push = (dx >= 0 ? 1 : -1) * ox * 0.35
              if (a.fx == null) a.x -= push
              if (b.fx == null) b.x += push
            } else {
              const push = (dy >= 0 ? 1 : -1) * oy * 0.35
              if (a.fy == null) a.y -= push
              if (b.fy == null) b.y += push
            }
          }
        }
      }
    })
    fg.d3ReheatSimulation()
  }, [data])

  // Exact bounding-box camera fit accounting for full card dimensions
  const fitBoard = useCallback(
    (ms = 380) => {
      const fg = fgRef.current
      if (!fg || data.nodes.length === 0) return

      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      let count = 0

      for (const n of data.nodes) {
        if (n.x == null || n.y == null) continue
        const { w, h } = nodeDims(n)
        minX = Math.min(minX, n.x - w / 2 - 14)
        maxX = Math.max(maxX, n.x + w / 2 + 14)
        minY = Math.min(minY, n.y - h / 2 - 14)
        maxY = Math.max(maxY, n.y + h / 2 + 14)
        count += 1
      }
      if (!count) return

      const pad = 42
      const boxW = Math.max(120, maxX - minX)
      const boxH = Math.max(100, maxY - minY)
      const availW = Math.max(200, size.w - pad * 2)
      const availH = Math.max(180, size.h - pad * 2)
      const targetZoom = Math.max(0.42, Math.min(1.55, Math.min(availW / boxW, availH / boxH)))
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2

      programmaticZoomUntil.current = Date.now() + ms + 350
      fg.centerAt(cx, cy, ms)
      fg.zoom(targetZoom, ms)
    },
    [data.nodes, size.w, size.h]
  )

  useEffect(() => {
    if (data.nodes.length === 0) {
      userInteracted.current = false
      return undefined
    }
    if (!userInteracted.current) {
      const dur = reducedMotion ? 0 : 360
      const t1 = window.setTimeout(() => fitBoard(dur), 220)
      const t2 = window.setTimeout(() => fitBoard(dur), 750)
      const t3 = window.setTimeout(() => fitBoard(dur), 1450)
      return () => {
        window.clearTimeout(t1)
        window.clearTimeout(t2)
        window.clearTimeout(t3)
      }
    }
    return undefined
  }, [data.nodes.length, size.w, size.h, fitBoard, reducedMotion])

  const activeFocusId = hoveredNodeId || focusNodeId

  const highlightSets = useMemo(() => {
    if (activeFocusId && adjacency.has(activeFocusId)) {
      return adjacency.get(activeFocusId)
    }
    if (hoveredLinkId) {
      const lnk = data.links.find((l) => l.id === hoveredLinkId)
      if (lnk) {
        return {
          nodes: new Set([getEndId(lnk.source), getEndId(lnk.target)]),
          links: new Set([lnk.id]),
        }
      }
    }
    return null
  }, [activeFocusId, hoveredLinkId, adjacency, data.links])

  const paintLink = useCallback(
    (link, ctx) => {
      const s = link.source
      const t = link.target
      if (!s || !t || s.x == null || t.x == null) return

      const isMatch = link.type === 'MATCHES'
      const tierInfo = link.tier ? TIER_STYLE[link.tier] : null
      const strokeColor = isMatch
        ? tierInfo?.accent || '#E5383B'
        : 'rgba(201, 164, 92, 0.44)'

      const isDimmed = highlightSets && !highlightSets.links.has(link.id)
      const isHighlighted = highlightSets && highlightSets.links.has(link.id)

      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.hypot(dx, dy) || 1
      const sag = Math.min(30, dist * 0.14)
      const midX = (s.x + t.x) / 2
      const midY = (s.y + t.y) / 2 + sag

      const age = Date.now() - (link._bornAt || 0)
      const progress = reducedMotion ? 1 : Math.min(1, Math.max(0.08, age / 560))

      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.12 : isHighlighted ? 1 : isMatch ? 0.94 : 0.65
      ctx.strokeStyle = strokeColor
      ctx.lineCap = 'round'

      const baseWidth = isMatch
        ? link.tier === 'CONFIRMED'
          ? 2.3
          : link.tier === 'NO_MATCH'
            ? 1.3
            : 1.85
        : 1.15
      ctx.lineWidth = isHighlighted ? baseWidth + 0.95 : baseWidth

      if (isMatch && (link.tier === 'CONFLICT' || link.tier === 'NO_MATCH' || link.tier === 'UNRESOLVED')) {
        ctx.setLineDash(link.tier === 'CONFLICT' ? [6, 3] : [4, 4])
      } else {
        ctx.setLineDash([])
      }

      if (!isDimmed && isMatch && (link.tier === 'CONFIRMED' || link.tier === 'LIKELY' || isHighlighted)) {
        ctx.shadowColor = strokeColor
        ctx.shadowBlur = isHighlighted ? 13 : 8
      }

      drawPartialQuadCurve(ctx, s.x, s.y, midX, midY, t.x, t.y, progress)
      ctx.restore()
    },
    [highlightSets, reducedMotion]
  )

  const paintNode = useCallback(
    (node, ctx) => {
      if (node.x == null || node.y == null) return
      prevPositions.current.set(node.id, { x: node.x, y: node.y })

      const isDimmed = highlightSets && !highlightSets.nodes.has(node.id)
      const isHighlighted = highlightSets && highlightSets.nodes.has(node.id)
      const age = Date.now() - (node._bornAt || 0)
      const isFresh = !reducedMotion && age < 1400

      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.16 : 1

      if (isFresh) {
        const popT = Math.min(1, age / 240)
        const scalePop = 0.74 + 0.26 * popT
        ctx.translate(node.x, node.y)
        ctx.scale(scalePop, scalePop)
        ctx.translate(-node.x, -node.y)

        if (node.type === 'Listing' || node.type === 'Recall') {
          const ringP = age / 1400
          ctx.beginPath()
          ctx.arc(node.x, node.y, 20 + ringP * 38, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(229, 56, 59, ${(1 - ringP) * 0.55})`
          ctx.lineWidth = 1.6
          ctx.stroke()
        }
      }

      const { w, h } = nodeDims(node)
      const x = node.x - w / 2
      const y = node.y - h / 2

      if (node.type === 'Recall') {
        ctx.shadowColor = isHighlighted ? 'rgba(229, 56, 59, 0.6)' : 'rgba(0, 0, 0, 0.62)'
        ctx.shadowBlur = isHighlighted ? 20 : 12
        ctx.shadowOffsetY = 3

        roundedRect(ctx, x, y, w, h, 3)
        ctx.fillStyle = '#EFE8D8'
        ctx.fill()
        ctx.shadowColor = 'transparent'

        ctx.lineWidth = isHighlighted ? 2 : 1.2
        ctx.strokeStyle = isHighlighted ? '#E5383B' : '#C8BCA2'
        ctx.stroke()

        ctx.fillStyle = '#E5383B'
        ctx.fillRect(x, y, 5, h)

        ctx.font = '700 7px "IBM Plex Mono", monospace'
        ctx.fillStyle = '#B51F24'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText('OFFICIAL RECALL', x + 11, y + 8)

        ctx.font = '400 13px "Instrument Serif", Georgia, serif'
        ctx.fillStyle = '#171512'
        ctx.fillText(truncate(node.label, 22), x + 11, y + 19)

        if (node.props?.brand) {
          ctx.font = '500 7px "IBM Plex Mono", monospace'
          ctx.fillStyle = '#564E43'
          ctx.fillText(truncate(node.props.brand, 24), x + 11, y + 38)
        }

        drawPin(ctx, node.x, y + 2, '#E5383B', 5.2)
      } else if (node.type === 'Listing') {
        const tier = tierByNode.get(node.id)
        const tierStyle = tier ? TIER_STYLE[tier] : null

        ctx.shadowColor = isHighlighted
          ? 'rgba(229, 56, 59, 0.48)'
          : 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = isHighlighted ? 14 : 7
        ctx.shadowOffsetY = 2

        roundedRect(ctx, x, y, w, h, 2.5)
        ctx.fillStyle = '#EFE8D8'
        ctx.fill()
        ctx.shadowColor = 'transparent'

        ctx.lineWidth = isHighlighted ? 1.8 : 1
        ctx.strokeStyle = isHighlighted ? '#E5383B' : tierStyle?.inkOnPaper || '#C8BCA2'
        ctx.stroke()

        ctx.fillStyle = tierStyle?.accent || '#64748B'
        ctx.fillRect(x, y, 4, h)

        ctx.font = '700 6.4px "IBM Plex Mono", monospace'
        ctx.fillStyle = tierStyle?.inkOnPaper || '#564E43'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(tierStyle ? tierStyle.stamp : 'LISTING', x + 9, y + 7)

        ctx.font = '600 9px "IBM Plex Sans", sans-serif'
        ctx.fillStyle = '#171512'
        ctx.fillText(truncate(node.label, 24), x + 9, y + 19)

        drawPin(
          ctx,
          node.x,
          y + 1,
          tier === 'CONFIRMED' ? '#E5383B' : '#C9A45C',
          4
        )
      } else {
        const pinColor = NODE_COLOR[node.type] || '#C9A45C'
        const label = truncate(node.label, 22)
        ctx.font = '500 7.6px "IBM Plex Mono", monospace'
        const measuredW = Math.max(w, ctx.measureText(label).width + 22)
        const bx = node.x - measuredW / 2

        roundedRect(ctx, bx, y, measuredW, h, 2.5)
        ctx.fillStyle = '#1B1E25'
        ctx.fill()
        ctx.lineWidth = isHighlighted ? 1.6 : 1.1
        ctx.strokeStyle = isHighlighted ? '#EFE8D8' : pinColor
        ctx.stroke()

        ctx.fillStyle = '#ECE7DC'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, node.x, node.y + 1)

        drawPin(ctx, node.x, y, pinColor, 3.4)
      }

      ctx.restore()
    },
    [highlightSets, tierByNode, reducedMotion]
  )

  const paintNodeHitArea = useCallback((node, color, ctx) => {
    if (node.x == null || node.y == null) return
    const { w, h } = nodeDims(node)
    ctx.fillStyle = color
    ctx.fillRect(node.x - w / 2 - 4, node.y - h / 2 - 4, w + 8, h + 8)
  }, [])

  const hoveredNodeObj = hoveredNodeId
    ? data.nodes.find((n) => n.id === hoveredNodeId)
    : null

  return (
    <section className="board-panel graph-panel" aria-label="Evidence board">
      <div className="panel-head">
        <span className="panel-head-title">
          <span className="paper-pin pin-red" aria-hidden="true" />
          Evidence Board
        </span>
        <div className="graph-controls">
          <span className="panel-head-meta" style={{ marginRight: '0.35rem' }}>
            {data.nodes.length} pins · {data.links.length} threads
          </span>
          <button
            type="button"
            className="graph-ctrl-btn"
            onClick={() => {
              userInteracted.current = true
              const fg = fgRef.current
              if (fg) fg.zoom(fg.zoom() * 1.25, 220)
            }}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="graph-ctrl-btn"
            onClick={() => {
              userInteracted.current = true
              const fg = fgRef.current
              if (fg) fg.zoom(fg.zoom() * 0.8, 220)
            }}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="graph-ctrl-btn"
            onClick={() => {
              userInteracted.current = false
              fitBoard(320)
            }}
          >
            Fit board
          </button>
        </div>
      </div>

      <div className="graph-stage" ref={boxRef}>
        {hoveredNodeObj && (
          <div className="graph-hover-hint">
            {hoveredNodeObj.type}: {hoveredNodeObj.label} — click to inspect evidence
          </div>
        )}

        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={150}
          d3AlphaDecay={0.032}
          d3VelocityDecay={0.34}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => 'replace'}
          linkHoverPrecision={10}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintNodeHitArea}
          onNodeHover={(n) => {
            setHoveredNodeId(n ? n.id : null)
            if (boxRef.current) boxRef.current.style.cursor = n ? 'pointer' : 'grab'
          }}
          onLinkHover={(l) => {
            setHoveredLinkId(l ? l.id : null)
            if (boxRef.current && !hoveredNodeId) {
              boxRef.current.style.cursor = l ? 'pointer' : 'grab'
            }
          }}
          onNodeClick={(n) => onSelect({ kind: 'node', node: n })}
          onLinkClick={(l) => onSelect({ kind: 'link', link: l })}
          onNodeDragEnd={() => {
            userInteracted.current = true
          }}
          onZoom={() => {
            if (data.nodes.length > 0 && Date.now() > programmaticZoomUntil.current) {
              userInteracted.current = true
            }
          }}
          onEngineStop={() => {
            if (!userInteracted.current) fitBoard(reducedMotion ? 0 : 360)
          }}
        />

        {data.nodes.length === 0 && (
          <div className="graph-empty-overlay">
            <span className="paper-pin pin-red" aria-hidden="true" />
            <h3>The board is clear</h3>
            <p>
              As the agent verifies identifiers and connects listings to the official notice, pins
              and red threads will draw themselves here.
            </p>
          </div>
        )}
      </div>

      <ul className="graph-legend" aria-label="Evidence board legend">
        <li>
          <span className="legend-pin" style={{ background: NODE_COLOR.Recall }} />
          Recall card
        </li>
        <li>
          <span className="legend-pin" style={{ background: NODE_COLOR.Listing }} />
          Listing tag
        </li>
        <li>
          <span className="legend-pin" style={{ background: NODE_COLOR.ProductModel }} />
          Model
        </li>
        <li>
          <span className="legend-pin" style={{ background: NODE_COLOR.Identifier }} />
          GTIN
        </li>
        <li>
          <span className="legend-pin" style={{ background: NODE_COLOR.Seller }} />
          Seller
        </li>
        {['CONFIRMED', 'LIKELY', 'RELATED', 'CONFLICT', 'NO_MATCH', 'UNRESOLVED'].map((t) => (
          <li key={t}>
            <span
              className="legend-thread"
              style={{ background: TIER_STYLE[t].accent }}
            />
            {TIER_STYLE[t].stamp}
          </li>
        ))}
      </ul>
    </section>
  )
}
