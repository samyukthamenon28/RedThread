export function Badges({ mode, onPaper = false, showDefaultMode = false }) {
  const modeLabel =
    mode === 'live'
      ? 'Live run'
      : mode === 'recorded'
        ? 'Recorded run'
        : mode === 'demo'
          ? 'Recorded run · Demo'
          : showDefaultMode
            ? 'Live run'
            : null
  const modeClass = mode || (showDefaultMode ? 'live' : '')

  return (
    <span className={`badges${onPaper ? ' on-paper' : ''}`}>
      <span className="badge sandbox">
        <span className="badge-dot" aria-hidden="true" />
        Sandbox shop
      </span>
      {modeLabel && (
        <span className={`badge ${modeClass}`}>
          <span className="badge-dot" aria-hidden="true" />
          {modeLabel}
        </span>
      )}
    </span>
  )
}
