import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router'

interface Beat {
  id: string
  step: string
  title: string
  body: string
  icon: string
  progressTarget: number
}

const STORY_BEATS: Beat[] = [
  {
    id: 'emboss',
    step: '01 · DETAY',
    title: 'Sıcak Gofraj & Dikiş Detayı',
    body: 'Hakiki derinin doğal dokusuna sıcak demir kalıpla çökertilen Elon Leather mührü ve saraciye usulü dayanıklı mumlu iplik dikişleri.',
    icon: '✂️',
    progressTarget: 0.10,
  },
  {
    id: 'closure',
    step: '02 · MEKANİZMA',
    title: 'Gizli Kilit & Hassas Kapak',
    body: 'Deri katmanlarının içine gizlenen hassas kapanış sistemi. Tek hamlede pürüzsüzce açılır, cebinizde güvenle kapalı kalarak formunu korur.',
    icon: '🔒',
    progressTarget: 0.38,
  },
  {
    id: 'cards',
    step: '03 · MİMARİ',
    title: '3D Katmanlı Kart Mimarisi',
    body: 'Kapak açıldığında basamaklı bir akıcılıkla süzülen kart yuvaları. 20 karta kadar kart ve çift banknot gözünü kompakt 8x10 cm incelikte sunar.',
    icon: '💳',
    progressTarget: 0.68,
  },
]

const EDGE_COLOR = '#221b10'
const DESKTOP_FRAMES = 199
const MOBILE_FRAMES = 120
const POSTER_SRC = '/assets/sequence/rio/poster.webp'

export function Magnetic3DShowcase({ isPdp = false }: { isPdp?: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isFallback, setIsFallback] = useState(false)
  const [activeBeatIndex, setActiveBeatIndex] = useState(0)
  const [progressState, setProgressState] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  const framesRef = useRef<(HTMLImageElement | null)[]>([])
  const currentDrawnRef = useRef<number>(-1)
  const progressRef = useRef<{ target: number; smoothed: number }>({ target: 0, smoothed: 0 })
  const isMobileRef = useRef<boolean>(false)

  // Scroll smoothly to a specific story beat
  const scrollToProgress = useCallback((targetP: number) => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const wrapperTop = rect.top + window.scrollY
    const maxScroll = rect.height - window.innerHeight
    if (maxScroll > 0) {
      const targetY = wrapperTop + targetP * maxScroll
      window.scrollTo({ top: targetY, behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    // Check fallbacks: prefers-reduced-motion, saveData, slow connections
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    const isSaveData = conn?.saveData === true
    const isSlowConn = conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)

    if (prefersReduced || isSaveData || isSlowConn) {
      setIsFallback(true)
      return
    }

    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const checkIsMobile = () => window.innerWidth <= 768
    isMobileRef.current = checkIsMobile()

    let totalFrames = isMobileRef.current ? MOBILE_FRAMES : DESKTOP_FRAMES
    let activePattern = isMobileRef.current
      ? '/assets/sequence/rio/mobile/f_%04d.webp'
      : '/assets/sequence/rio/desktop/f_%04d.webp'

    framesRef.current = new Array(totalFrames).fill(null)

    const getFrameUrl = (index: number) => {
      const numStr = String(index + 1).padStart(4, '0')
      return activePattern.replace('%04d', numStr)
    }

    // Render frame to canvas with edge background & cover/contain scaling
    const drawFrame = (img: HTMLImageElement) => {
      if (!img || !canvas || !ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)

      if (w === 0 || h === 0) return

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }

      ctx.save()
      ctx.scale(dpr, dpr)

      // Solid edge fill background
      ctx.fillStyle = EDGE_COLOR
      ctx.fillRect(0, 0, w, h)

      const imgW = img.naturalWidth || img.width
      const imgH = img.naturalHeight || img.height
      if (imgW === 0 || imgH === 0) {
        ctx.restore()
        return
      }

      const imgRatio = imgW / imgH
      const canvasRatio = w / h

      let renderW: number, renderH: number, offsetX: number, offsetY: number

      if (isMobileRef.current) {
        // Mobile Contain mode - never crop the wallet
        if (canvasRatio > imgRatio) {
          renderH = h
          renderW = h * imgRatio
          offsetX = (w - renderW) / 2
          offsetY = 0
        } else {
          renderW = w
          renderH = w / imgRatio
          offsetX = 0
          offsetY = (h - renderH) / 2
        }
      } else {
        // Desktop Cover mode - immersive studio fill
        if (canvasRatio > imgRatio) {
          renderW = w
          renderH = w / imgRatio
          offsetX = 0
          offsetY = (h - renderH) / 2
        } else {
          renderH = h
          renderW = h * imgRatio
          offsetX = (w - renderW) / 2
          offsetY = 0
        }
      }

      ctx.drawImage(img, Math.round(offsetX), Math.round(offsetY), Math.round(renderW), Math.round(renderH))
      ctx.restore()
    }

    const getNearestLoadedFrame = (targetIdx: number): HTMLImageElement | null => {
      const frames = framesRef.current
      if (frames[targetIdx]) return frames[targetIdx]
      let step = 1
      while (targetIdx - step >= 0 || targetIdx + step < frames.length) {
        if (targetIdx - step >= 0 && frames[targetIdx - step]) return frames[targetIdx - step]
        if (targetIdx + step < frames.length && frames[targetIdx + step]) return frames[targetIdx + step]
        step++
      }
      return null
    }

    // 2-tier loading: Step 4 first (immediate response), then idle fill
    let hasLoadedFirstBatch = false
    const startLoading = () => {
      if (hasLoadedFirstBatch) return
      hasLoadedFirstBatch = true

      const phase1Indices: number[] = []
      for (let i = 0; i < totalFrames; i += 4) {
        phase1Indices.push(i)
      }
      if (phase1Indices[phase1Indices.length - 1] !== totalFrames - 1) {
        phase1Indices.push(totalFrames - 1)
      }

      let p1Cursor = 0
      const concurrency = 6

      const loadNextP1 = () => {
        if (p1Cursor >= phase1Indices.length) {
          setIsLoaded(true)
          startPhase2()
          return
        }
        const idx = phase1Indices[p1Cursor++]
        const img = new Image()
        img.src = getFrameUrl(idx)
        img.decode().catch(() => {}).then(() => {
          framesRef.current[idx] = img
          const currentTargetIdx = Math.round(progressRef.current.smoothed * (totalFrames - 1))
          if (Math.abs(currentTargetIdx - idx) <= 2 && currentDrawnRef.current === -1) {
            drawFrame(img)
            currentDrawnRef.current = idx
          }
          loadNextP1()
        })
      }

      for (let c = 0; c < concurrency; c++) {
        loadNextP1()
      }

      const startPhase2 = () => {
        const remaining: number[] = []
        for (let i = 0; i < totalFrames; i++) {
          if (!framesRef.current[i]) remaining.push(i)
        }

        let rCursor = 0
        const idleStep = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => {
          while ((deadline.timeRemaining() > 5 || deadline.didTimeout) && rCursor < remaining.length) {
            const idx = remaining[rCursor++]
            const img = new Image()
            img.src = getFrameUrl(idx)
            img.decode().catch(() => {}).then(() => {
              framesRef.current[idx] = img
            })
          }
          if (rCursor < remaining.length) {
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(idleStep, { timeout: 1000 })
            } else {
              setTimeout(() => idleStep({ timeRemaining: () => 10, didTimeout: true }), 50)
            }
          }
        }

        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(idleStep, { timeout: 1000 })
        } else {
          setTimeout(() => idleStep({ timeRemaining: () => 10, didTimeout: true }), 50)
        }
      }
    }

    // Lazy load observer (rootMargin: 150% 0px to protect LCP)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startLoading()
          }
        }
      },
      { rootMargin: '150% 0px' }
    )
    observer.observe(wrapper)

    // Animation Loop with lerp smoothing (~0.1)
    let rafId: number
    const tick = () => {
      const rect = wrapper.getBoundingClientRect()
      const maxScroll = rect.height - window.innerHeight

      if (maxScroll > 0) {
        const rawP = -rect.top / maxScroll
        progressRef.current.target = Math.min(Math.max(rawP, 0), 1)
      }

      const diff = progressRef.current.target - progressRef.current.smoothed
      if (Math.abs(diff) > 0.0001) {
        progressRef.current.smoothed += diff * 0.1
      } else {
        progressRef.current.smoothed = progressRef.current.target
      }

      const p = progressRef.current.smoothed
      setProgressState(p)

      // Determine active story beat
      if (p < 0.25) {
        setActiveBeatIndex(0)
      } else if (p < 0.50) {
        setActiveBeatIndex(1)
      } else if (p < 0.85) {
        setActiveBeatIndex(2)
      } else {
        setActiveBeatIndex(3) // Outro / CTA phase
      }

      const frameIdx = Math.round(p * (totalFrames - 1))
      if (frameIdx !== currentDrawnRef.current) {
        const bestImg = getNearestLoadedFrame(frameIdx)
        if (bestImg) {
          drawFrame(bestImg)
          currentDrawnRef.current = frameIdx
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    const handleResize = () => {
      const newMobile = checkIsMobile()
      if (newMobile !== isMobileRef.current) {
        isMobileRef.current = newMobile
        totalFrames = isMobileRef.current ? MOBILE_FRAMES : DESKTOP_FRAMES
        activePattern = isMobileRef.current
          ? '/assets/sequence/rio/mobile/f_%04d.webp'
          : '/assets/sequence/rio/desktop/f_%04d.webp'
        framesRef.current = new Array(totalFrames).fill(null)
        hasLoadedFirstBatch = false
        startLoading()
      }
      const currentImg = getNearestLoadedFrame(Math.round(progressRef.current.smoothed * (totalFrames - 1)))
      if (currentImg) drawFrame(currentImg)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  if (isFallback) {
    return (
      <section className="magnetic-fallback-section" id="3d-deneyim" aria-label="Elon Leather Deri Cüzdan Tanıtımı">
        <div className="magnetic-fallback-container">
          <div className="magnetic-fallback-header">
            <span className="magnetic-3d-eyebrow">ELON LEATHER · ATÖLYE FİLMİ</span>
            <h2 className="magnetic-3d-title">
              Zanaatın Üçüncü Boyutu:
              <br />
              <em>Hassas Kapak &amp; 3D Kart Süzülüşü.</em>
            </h2>
            <p className="magnetic-3d-subtitle">
              Doğal damarlı derinin sıcak gofraj mührü, gizli kilit mekanizması ve basamaklı kart mimarisi.
            </p>
          </div>

          <div className="magnetic-fallback-poster-wrapper">
            <img
              src={POSTER_SRC}
              alt="Elon Leather el yapımı hakiki deri cüzdan"
              width="1280"
              height="720"
              loading="lazy"
              className="magnetic-fallback-poster"
            />
          </div>

          <div className="magnetic-fallback-grid">
            {STORY_BEATS.map((beat) => (
              <div key={beat.id} className="magnetic-fallback-card">
                <div className="feature-card-icon">{beat.icon}</div>
                <span className="seq-card-kicker">{beat.step}</span>
                <h3>{beat.title}</h3>
                <p>{beat.body}</p>
              </div>
            ))}
          </div>

          <div className="magnetic-cta-band">
            <div className="magnetic-cta-info">
              <span className="magnetic-cta-kicker">ATÖLYE AMİRAL GEMİSİ</span>
              <h4>Dünyaları cüzdana sığdırıyoruz.</h4>
              <p>Zeytin Karası Yeşil, Taba Kahverengi ve Gece Siyahı renk seçenekleriyle.</p>
            </div>
            <div className="magnetic-cta-actions">
              {isPdp ? (
                <a href="#buy-box" className="magnetic-btn-primary">
                  Hemen Kişiselleştir &amp; Satın Al (1.600 TL) ↑
                </a>
              ) : (
                <Link to="/urun/rio-boss-miknatisli-deri-cuzdan/" className="magnetic-btn-primary">
                  Rio Boss&apos;u İncele &amp; Sipariş Ver (1.600 TL) →
                </Link>
              )}
              <Link to="/cuzdan-kartlik/" className="magnetic-btn-secondary">
                Tüm Cüzdanlar
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={wrapperRef}
      className="magnetic-seq-wrapper"
      id="3d-deneyim"
      aria-label="Elon Leather Zanaat ve 3D Film Deneyimi"
      data-seq-wrapper
      data-seq-src="/assets/sequence/rio/desktop/f_%04d.webp"
      data-seq-frames={DESKTOP_FRAMES}
      data-seq-mobile-src="/assets/sequence/rio/mobile/f_%04d.webp"
      data-seq-mobile-frames={MOBILE_FRAMES}
      data-seq-poster={POSTER_SRC}
      data-seq-edge-color={EDGE_COLOR}
    >
      <div className="magnetic-seq-stage">
        {/* Poster placeholder until canvas draws */}
        {!isLoaded && (
          <img
            src={POSTER_SRC}
            alt="Elon Leather el yapımı hakiki deri cüzdan"
            width="1280"
            height="720"
            loading="lazy"
            decoding="async"
            className="magnetic-seq-poster-placeholder"
          />
        )}

        <noscript>
          <img
            src={POSTER_SRC}
            alt="Elon Leather el yapımı hakiki deri cüzdan atölye filmi"
            width="1280"
            height="720"
            loading="lazy"
            decoding="async"
            className="magnetic-seq-poster-placeholder"
          />
        </noscript>

        {/* 3D Scroll Canvas */}
        <canvas
          ref={canvasRef}
          className="magnetic-seq-canvas"
          role="img"
          aria-label="Elon Leather el yapımı deri cüzdan 3D animasyon filmi"
          data-seq-canvas
        />

        {/* Ambient Dark Leather Vignette Overlay */}
        <div className="magnetic-seq-vignette" aria-hidden="true" />

        {/* Top Header Badge */}
        <div className="magnetic-seq-top-header">
          <span className="magnetic-3d-eyebrow">ELON LEATHER · ATÖLYE FİLMİ</span>
          <h2 className="magnetic-3d-title">
            Zanaatın Üçüncü Boyutu:
            <br />
            <em>Hassas Kapak &amp; 3D Kart Süzülüşü.</em>
          </h2>
        </div>

        {/* Story Synced Cards (Desktop Left / Mobile Bottom) */}
        <div className="magnetic-seq-story-container" aria-live="polite">
          {STORY_BEATS.map((beat, index) => {
            const isActive = activeBeatIndex === index
            return (
              <div
                key={beat.id}
                className={`magnetic-seq-card ${isActive ? 'is-active' : ''}`}
                aria-hidden={!isActive}
              >
                <div className="seq-card-header">
                  <span className="seq-card-icon">{beat.icon}</span>
                  <span className="seq-card-kicker">{beat.step}</span>
                </div>
                <h3 className="seq-card-title">{beat.title}</h3>
                <p className="seq-card-body">{beat.body}</p>
              </div>
            )
          })}

          {/* Outro / Final CTA Beat (0.85 - 1.00) */}
          <div
            className={`magnetic-seq-card seq-card-outro ${activeBeatIndex === 3 ? 'is-active' : ''}`}
            aria-hidden={activeBeatIndex !== 3}
          >
            <div className="seq-card-header">
              <span className="seq-card-icon">✨</span>
              <span className="seq-card-kicker">04 · SON SÖZ</span>
            </div>
            <h3 className="seq-card-title">Dünyaları cüzdana sığdırıyoruz.</h3>
            <p className="seq-card-body">
              Ağırlık yapmayan, zamanla karakter kazanan ve ustalıkla dikilen zamansız el işçiliği.
            </p>
            <div className="seq-outro-actions">
              {isPdp ? (
                <a
                  href="#buy-box"
                  className="magnetic-btn-primary"
                  tabIndex={activeBeatIndex === 3 ? 0 : -1}
                >
                  Hemen Kişiselleştir (1.600 TL) ↑
                </a>
              ) : (
                <Link
                  to="/urun/rio-boss-miknatisli-deri-cuzdan/"
                  className="magnetic-btn-primary"
                  tabIndex={activeBeatIndex === 3 ? 0 : -1}
                >
                  Rio Boss&apos;u İncele →
                </Link>
              )}
              <Link
                to="/cuzdan-kartlik/"
                className="magnetic-btn-secondary"
                tabIndex={activeBeatIndex === 3 ? 0 : -1}
              >
                Tüm Cüzdanlar
              </Link>
            </div>
          </div>
        </div>

        {/* Slim 3-Dot Progress Rail */}
        <nav className="magnetic-seq-rail" aria-label="Film bölümleri gezinme çubuğu">
          <div className="seq-rail-track" aria-hidden="true">
            <div
              className="seq-rail-fill"
              style={{ height: `${Math.min(progressState / 0.85, 1) * 100}%` }}
            />
          </div>
          {STORY_BEATS.map((beat, index) => {
            const isBeatActive = activeBeatIndex === index
            return (
              <button
                key={beat.id}
                type="button"
                className={`seq-rail-dot ${isBeatActive ? 'is-active' : ''}`}
                onClick={() => scrollToProgress(beat.progressTarget)}
                aria-label={`${beat.step}: ${beat.title}`}
                aria-current={isBeatActive ? 'step' : undefined}
                title={beat.title}
              >
                <span className="seq-dot-indicator" />
                <span className="seq-dot-tooltip">{beat.title}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </section>
  )
}
