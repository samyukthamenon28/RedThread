import { useEffect, useRef } from 'react'

const GLYPH = {
  step: '◈',
  tool: '▸',
  page: '■',
  official: '§',
  error: '!',
}

function formatArgs(args) {
  if (!args || typeof args !== 'object') return ''
  return Object.entries(args)
    .map(([k, v]) => {
      const s = typeof v === 'string' ? v : JSON.stringify(v)
      const trimmed = s.length > 54 ? `${s.slice(0, 51)}…` : s
      return Object.keys(args).length === 1 ? trimmed : `${k}=${trimmed}`
    })
    .join(' ')
}

export function ActionLog({ log }) {
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [log.length])

  return (
    <section className="board-panel action-log-panel" aria-label="Agent action log">
      <div className="panel-head">
        <span className="panel-head-title">Action Trace</span>
        <span className="panel-head-meta">{log.length} events</span>
      </div>

      <ol className="action-log-list" ref={listRef}>
        {log.length === 0 && (
          <li className="log-empty">$ awaiting investigation stream…</li>
        )}
        {log.map((l, i) => {
          const argStr = l.kind === 'tool' ? formatArgs(l.args) : ''
          return (
            <li
              key={`${l.seq ?? i}-${i}`}
              className={`log-entry l-${l.kind}${l.allowed === false ? ' refused' : ''}`}
            >
              <span className="log-glyph" aria-hidden="true">
                {GLYPH[l.kind] || '·'}
              </span>
              <div>
                {l.kind === 'tool' && (
                  <>
                    <span className="log-tool">{l.tool}</span>
                    {argStr ? <span className="log-arg"> {argStr}</span> : null}
                    {l.allowed === false && (
                      <em className="log-refusal">[BLOCKED BY GUARD]</em>
                    )}
                    {l.reason && <span className="log-reason">{l.reason}</span>}
                    {l.allowed === false && l.error && (
                      <span className="log-reason" style={{ color: '#FF9EA0' }}>
                        {l.error}
                      </span>
                    )}
                  </>
                )}
                {l.kind === 'page' && (
                  <>
                    <span>Visited </span>
                    <a
                      className="log-link"
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.title || l.url}
                    </a>
                    {l.status === 'blocked' && (
                      <em className="log-refusal">[BLOCKED]</em>
                    )}
                  </>
                )}
                {(l.kind === 'step' || l.kind === 'official' || l.kind === 'error') && (
                  <span style={{ color: l.kind === 'error' ? '#FF9EA0' : 'var(--text)' }}>
                    {l.text}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
