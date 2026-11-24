import { STAGES } from '../constants.js'

export function Stepper({ stages }) {
  const reachedIdx = STAGES.reduce((acc, [k], i) => (stages[k] ? i : acc), -1)
  const fillPct = reachedIdx <= 0 ? 0 : (reachedIdx / (STAGES.length - 1)) * 100

  return (
    <nav className="stepper-strip" aria-label="Pipeline progress">
      <ol className="stepper-track">
        <div className="stepper-thread-bg" aria-hidden="true">
          <div className="stepper-thread-fill" style={{ width: `${fillPct}%` }} />
        </div>
        {STAGES.map(([key, label], i) => {
          const isDone = Boolean(stages[key])
          const isNext = !isDone && i === reachedIdx + 1
          const num = String(i + 1).padStart(2, '0')
          return (
            <li
              key={key}
              className={`stepper-node${isDone ? ' done' : ''}${isNext ? ' next' : ''}`}
            >
              <span className="stepper-pin" aria-hidden="true">
                {num}
              </span>
              <span className="stepper-label">
                {label}
                {isDone ? <span className="sr"> (completed)</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
