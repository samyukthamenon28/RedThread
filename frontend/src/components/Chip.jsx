import { useState } from 'react'
import { TIER_STYLE, REASON_TEXT } from '../constants.js'

export function Chip({
  tier,
  reasons = [],
  expandable = false,
  long = false,
  onPaper = true,
  animate = false,
  flat = false,
}) {
  const [open, setOpen] = useState(false)
  const s = TIER_STYLE[tier] || {
    label: tier || 'Unresolved',
    stamp: tier || 'UNRESOLVED',
    long: tier || 'Unresolved',
    accent: '#9CA3AF',
    inkOnPaper: '#4B525C',
    paperTint: 'rgba(156, 163, 175, 0.14)',
  }
  const tip = reasons.map((r) => REASON_TEXT[r] || r).join(' ')
  const color = onPaper ? s.inkOnPaper : s.accent
  const background = onPaper ? s.paperTint : 'rgba(14, 15, 18, 0.7)'

  const classes = [
    'stamp',
    animate ? 'stamp-animate' : '',
    flat ? 'stamp-flat' : '',
    expandable ? 'stamp-btn' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const labelText = long ? s.long : s.stamp || s.label
  const Tag = expandable ? 'button' : 'span'

  return (
    <span className="chipwrap">
      <Tag
        type={expandable ? 'button' : undefined}
        className={classes}
        style={{ color, borderColor: color, background }}
        title={tip || s.long}
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
        aria-expanded={expandable ? open : undefined}
      >
        {labelText}
      </Tag>
      {open && <ReasonList reasons={reasons} />}
    </span>
  )
}

export function ReasonList({ reasons }) {
  if (!reasons?.length) return null
  return (
    <ul className="verdict-reasons">
      {reasons.map((r) => (
        <li key={r} className="verdict-reason-item">
          <span className="reason-code-pill">{r}</span>
          <span>{REASON_TEXT[r] || r}</span>
        </li>
      ))}
    </ul>
  )
}

// Verified-quote ink stamp. Deep archival cobalt ink or crimson dashed unverified — never green.
export function Verified({ ok }) {
  if (ok == null) return <span className="ink-seal unquoted">No quote supplied</span>
  return ok ? (
    <span className="ink-seal verified">✓ Quote verified</span>
  ) : (
    <span className="ink-seal unverified">✗ Unverified</span>
  )
}
