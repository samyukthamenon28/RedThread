import { useEffect, useState } from 'react'

function withCacheBust(url, seq, retry) {
  if (!url) return null
  if (/^data:image\//i.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${seq || 0}${retry ? `&r=${retry}` : ''}`
}

function shortPath(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.pathname && u.pathname !== '/' ? `${u.host}${u.pathname}` : u.host
  } catch {
    return url
  }
}

export function BrowserPanel({ page, step, maxSteps, running }) {
  const [retryCount, setRetryCount] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const [currLoaded, setCurrLoaded] = useState(false)
  const [displayShot, setDisplayShot] = useState(null)
  const [prevShot, setPrevShot] = useState(null)

  const targetSrc = page.shot ? withCacheBust(page.shot, page.shotSeq, retryCount) : null

  // Reset error & prepare smooth crossfade whenever the shot URL or sequence advances
  useEffect(() => {
    setRetryCount(0)
    setImgFailed(false)
    if (!page.shot) {
      setDisplayShot(null)
      setPrevShot(null)
      setCurrLoaded(false)
      return
    }
    const nextSrc = withCacheBust(page.shot, page.shotSeq, 0)
    setDisplayShot((curr) => {
      if (curr && curr !== nextSrc) setPrevShot(curr)
      return nextSrc
    })
    setCurrLoaded(false)
  }, [page.shot, page.shotSeq])

  const handleImgError = () => {
    // Retry once after 450ms in case Playwright is still flushing the JPEG to disk
    if (retryCount < 1 && page.shot) {
      const nextRetry = retryCount + 1
      window.setTimeout(() => {
        setRetryCount(nextRetry)
        setDisplayShot(withCacheBust(page.shot, page.shotSeq, nextRetry))
      }, 450)
      return
    }
    setImgFailed(true)
  }

  const hasVisitedPages = page.count > 0 || Boolean(page.url)
  const showImage = Boolean(displayShot) && !imgFailed
  const isBlocked = page.status === 'blocked'

  return (
    <section className="board-panel" aria-label="Live browser monitor">
      <div className="panel-head">
        <span className="panel-head-title">
          <span className="paper-pin pin-red" aria-hidden="true" />
          Agent Monitor
        </span>
        <span className="monitor-step">
          STEP {String(step || 0).padStart(2, '0')}
          {maxSteps ? ` / ${String(maxSteps).padStart(2, '0')}` : ''}
        </span>
      </div>

      <div className="monitor-chrome">
        <span className={`rec-badge${running ? ' active' : ''}`}>
          <span className="rec-dot" aria-hidden="true" />
          {running ? 'REC' : 'IDLE'}
        </span>
        <span className="monitor-url" title={page.url || 'Standby'}>
          {page.url || 'about:blank — awaiting target'}
        </span>
      </div>

      <div className={`monitor-viewport${running ? ' is-recording' : ''}`}>
        {showImage ? (
          <>
            {prevShot && (
              <img
                className="monitor-frame-img monitor-frame-prev"
                src={prevShot}
                alt=""
                aria-hidden="true"
              />
            )}
            <img
              key={targetSrc}
              className={`monitor-frame-img monitor-frame-curr${currLoaded ? ' loaded' : ''}`}
              src={displayShot}
              alt={`Captured browser frame of ${page.title || page.url}`}
              onLoad={() => {
                setCurrLoaded(true)
                setImgFailed(false)
              }}
              onError={handleImgError}
            />
          </>
        ) : hasVisitedPages ? (
          <div className="monitor-telemetry">
            <div>
              <div className="telemetry-top">
                <span className="label-caps">
                  {page.sourceTier === 'A' ? 'Tier A · Official Notice' : 'DOM Capture Feed'}
                </span>
                <span className="label-caps" style={{ color: isBlocked ? '#FF8E90' : 'var(--brass)' }}>
                  {isBlocked ? 'BLOCKED' : running ? 'CAPTURING' : 'RECORDED'}
                </span>
              </div>
              <p className="telemetry-page-title">{page.title || shortPath(page.url)}</p>
              <div className="telemetry-url">{page.url}</div>
            </div>

            <div>
              <span className="label-caps" style={{ fontSize: '0.58rem' }}>
                {imgFailed
                  ? 'Frame file unavailable on /shots — showing live DOM telemetry'
                  : 'Recorded fixture stream (no JPEG frames attached)'}
              </span>
              {page.history?.length > 0 && (
                <div className="telemetry-trail">
                  {page.history.slice(-5).map((h, i) => (
                    <span
                      key={`${h.seq}-${i}`}
                      className={`telemetry-chip${h.status === 'blocked' ? ' blocked' : ''}`}
                      title={h.url}
                    >
                      {shortPath(h.url).split('/').pop() || 'home'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="monitor-empty">
            <svg
              className="monitor-schematic"
              viewBox="0 0 120 74"
              fill="none"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="116" height="70" rx="3" stroke="#3B4050" strokeWidth="1.5" />
              <line x1="2" y1="15" x2="118" y2="15" stroke="#292D38" strokeWidth="1.2" />
              <circle cx="10" cy="8.5" r="2" fill="#E5383B" />
              <circle cx="17" cy="8.5" r="2" fill="#3B4050" />
              <circle cx="24" cy="8.5" r="2" fill="#3B4050" />
              <rect x="33" y="6" width="76" height="5" rx="1" fill="#1B1E25" />
              <rect x="12" y="24" width="44" height="6" rx="1" fill="#292D38" />
              <rect x="12" y="34" width="96" height="4" rx="1" fill="#1E222B" />
              <rect x="12" y="42" width="80" height="4" rx="1" fill="#1E222B" />
              <rect x="12" y="52" width="32" height="10" rx="1.5" stroke="#E5383B" strokeDasharray="3 2" strokeWidth="1" />
              <path d="M44 57 C 64 57, 74 42, 92 42" stroke="#E5383B" strokeWidth="1.3" />
              <circle cx="94" cy="42" r="3" fill="#E5383B" />
            </svg>
            <div className="monitor-empty-title">
              {running ? 'Connecting to Chromium…' : 'Waiting for agent'}
            </div>
            <div className="monitor-empty-sub">
              Browser frames stream here as the investigator opens official notices and shop listings.
            </div>
          </div>
        )}

        {isBlocked && (
          <div className="monitor-blocked-ribbon" role="status">
            <span>!</span>
            <span>
              BLOCKED{page.blockReason ? ` — ${page.blockReason}` : ' — Bot check stopped agent'}
            </span>
          </div>
        )}
      </div>

      <div className="monitor-footer">
        <span>
          <strong>{page.count}</strong> {page.count === 1 ? 'page' : 'pages'} visited
        </span>
        <span>
          {isBlocked
            ? 'Unresolved · bot check'
            : showImage
              ? '1280×800 JPEG'
              : hasVisitedPages
                ? 'Telemetry active'
                : 'Standby'}
        </span>
      </div>
    </section>
  )
}
