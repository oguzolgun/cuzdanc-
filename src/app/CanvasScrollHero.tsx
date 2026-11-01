import { useEffect, useRef, useState } from 'react'

interface CanvasScrollHeroProps {
  onOpenMenu?: () => void
  onOpenCart?: () => void
  cartCount?: number
}

const TOTAL_FRAMES = 239
const PRIORITY_BATCH_SIZE = 30
const LERP_FACTOR = 0.1 // Butter-smooth (range 0.08 - 0.12)

export function CanvasScrollHero({ onOpenMenu, onOpenCart, cartCount = 0 }: CanvasScrollHeroProps) {
  const wrapperRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  // Direct overlay DOM element refs for 60fps zero-lag transitions
  const p1Ref = useRef<HTMLDivElement>(null)
  const p2Ref = useRef<HTMLDivElement>(null)
  const p3Ref = useRef<HTMLDivElement>(null)
  const p4Ref = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const progressLineRef = useRef<HTMLDivElement>(null)

  // Cache of preloaded HTMLImageElement
  const imagesRef = useRef<Record<number, HTMLImageElement>>({})
  const loadedCountRef = useRef<number>(0)
  const lastRenderedFrameRef = useRef<number>(0)
  const targetProgressRef = useRef<number>(0)
  const currentProgressRef = useRef<number>(0)

  // React state for initial loader line visibility & reduced-motion
  const [isPriorityReady, setIsPriorityReady] = useState(false)
  const [loadPercentage, setLoadPercentage] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isMobileSet, setIsMobileSet] = useState(false)

  // Determine mobile vs desktop assets set
  const getFrameUrl = (index: number, mobile: boolean) => {
    const padIndex = String(index).padStart(4, '0')
    const folder = mobile ? 'mobile' : 'desktop'
    return `/assets/frames/${folder}/frame_${padIndex}.webp`
  }

  // Draw a frame to canvas with "cover" fit and devicePixelRatio handling
  const drawFrame = (frameNum: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // Find requested frame or the closest loaded frame to avoid black flickers
    let img = imagesRef.current[frameNum]
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Find closest loaded frame
      let closest = 1
      let minDiff = Infinity
      for (const key of Object.keys(imagesRef.current)) {
        const k = Number(key)
        const diff = Math.abs(k - frameNum)
        if (diff < minDiff && imagesRef.current[k]?.complete && imagesRef.current[k]?.naturalWidth > 0) {
          minDiff = diff
          closest = k
        }
      }
      img = imagesRef.current[closest]
    }

    if (!img || !img.complete || img.naturalWidth === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const displayW = window.innerWidth
    const displayH = window.innerHeight

    const targetW = Math.round(displayW * dpr)
    const targetH = Math.round(displayH * dpr)

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }

    const canvasW = canvas.width
    const canvasH = canvas.height
    const imgW = img.naturalWidth
    const imgH = img.naturalHeight

    // Cover Fit calculation: preserve aspect ratio, fill canvas, center crop
    const scale = Math.max(canvasW / imgW, canvasH / imgH)
    const renderW = imgW * scale
    const renderH = imgH * scale
    const offsetX = (canvasW - renderW) / 2
    const offsetY = (canvasH - renderH) / 2

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH)
    lastRenderedFrameRef.current = frameNum
  }

  // Preload frames according to strategy
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 768px)').matches
    setReducedMotion(prefersReduced)
    setIsMobileSet(mobile)

    // Preload reduced-motion poster frame
    if (prefersReduced) {
      const poster = new Image()
      poster.src = getFrameUrl(TOTAL_FRAMES, mobile)
      poster.onload = () => {
        imagesRef.current[TOTAL_FRAMES] = poster
        drawFrame(TOTAL_FRAMES)
        setIsPriorityReady(true)
      }
      return
    }

    let isCancelled = false

    // Step 1: Preload Frame 1 immediately
    const firstImg = new Image()
    firstImg.src = getFrameUrl(1, mobile)
    const onFirstLoaded = () => {
      if (isCancelled) return
      imagesRef.current[1] = firstImg
      drawFrame(1)
    }
    if (firstImg.complete && firstImg.naturalWidth > 0) {
      onFirstLoaded()
    } else {
      firstImg.onload = onFirstLoaded
    }

    // Step 2: Priority batch (frames 2 to 30)
    let priorityLoaded = 0
    const priorityTotal = PRIORITY_BATCH_SIZE - 1

    const checkPriority = () => {
      priorityLoaded++
      const pct = Math.min(100, Math.round((priorityLoaded / priorityTotal) * 100))
      setLoadPercentage(pct)
      if (priorityLoaded >= priorityTotal) {
        setIsPriorityReady(true)
        // Step 3: Progressive background loading for frames 31 to 239
        loadBackgroundFrames()
      }
    }

    for (let i = 2; i <= PRIORITY_BATCH_SIZE; i++) {
      const img = new Image()
      img.src = getFrameUrl(i, mobile)
      if (img.decode) {
        img
          .decode()
          .then(() => {
            if (isCancelled) return
            imagesRef.current[i] = img
            checkPriority()
          })
          .catch(() => {
            if (isCancelled) return
            imagesRef.current[i] = img
            checkPriority()
          })
      } else {
        img.onload = () => {
          if (isCancelled) return
          imagesRef.current[i] = img
          checkPriority()
        }
        img.onerror = () => {
          if (isCancelled) return
          checkPriority()
        }
      }
    }

    // Load remaining frames progressively in batches to keep UI fluid
    const loadBackgroundFrames = () => {
      let currentIdx = PRIORITY_BATCH_SIZE + 1
      const batchChunk = 8

      const loadNextChunk = () => {
        if (isCancelled || currentIdx > TOTAL_FRAMES) return

        const endIdx = Math.min(TOTAL_FRAMES, currentIdx + batchChunk - 1)
        const promises: Promise<void>[] = []

        for (let j = currentIdx; j <= endIdx; j++) {
          const img = new Image()
          img.src = getFrameUrl(j, mobile)
          const p = (
            img.decode
              ? img.decode()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve()
                  img.onerror = () => resolve()
                })
          )
            .then(() => {
              if (!isCancelled) imagesRef.current[j] = img
            })
            .catch(() => {
              if (!isCancelled) imagesRef.current[j] = img
            })
          promises.push(p)
        }

        currentIdx = endIdx + 1
        Promise.all(promises).then(() => {
          if (!isCancelled && currentIdx <= TOTAL_FRAMES) {
            if (window.requestIdleCallback) {
              window.requestIdleCallback(() => loadNextChunk(), { timeout: 100 })
            } else {
              setTimeout(loadNextChunk, 20)
            }
          }
        })
      }

      loadNextChunk()
    }

    return () => {
      isCancelled = true
    }
  }, [])

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (lastRenderedFrameRef.current > 0) {
        drawFrame(lastRenderedFrameRef.current)
      }
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Scroll listener & 60fps lerp requestAnimationFrame loop
  useEffect(() => {
    if (reducedMotion) return

    const handleScroll = () => {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const scrollableDistance = rect.height - window.innerHeight
      if (scrollableDistance <= 0) return

      const progress = Math.max(0, Math.min(1, -rect.top / scrollableDistance))
      targetProgressRef.current = progress
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    let rafId: number

    const renderLoop = () => {
      // Lerp smoothing (0.10)
      const delta = targetProgressRef.current - currentProgressRef.current
      currentProgressRef.current += delta * LERP_FACTOR

      const p = currentProgressRef.current

      // Map progress to frame index (1 to 239)
      const targetFrame = Math.min(
        TOTAL_FRAMES,
        Math.max(1, Math.round(p * (TOTAL_FRAMES - 1)) + 1)
      )

      if (targetFrame !== lastRenderedFrameRef.current) {
        drawFrame(targetFrame)
      }

      // -------------------------------------------------------------
      // Overlay Text Timing Math (Smooth Fades & Subtle Slides)
      // Ranges specified:
      // 0 – 0.15:   Phase 1 (Small logo + "Her şey cebinde başlar.")
      // 0.30 – 0.50: Phase 2 ("Bir an. Bir düşüş.")
      // 0.55 – 0.85: Phase 3 ("Dünyaları cüzdana sığdırıyoruz.")
      // 0.90 – 1.0:  Phase 4 (CTA "Koleksiyonu Keşfet")
      // -------------------------------------------------------------

      // Phase 1 (0 to 0.15)
      if (p1Ref.current) {
        const p1Opacity = p <= 0.12 ? 1 : Math.max(0, 1 - (p - 0.12) / 0.06)
        const p1Y = p * -30
        p1Ref.current.style.opacity = p1Opacity.toFixed(3)
        p1Ref.current.style.transform = `translateY(${p1Y.toFixed(1)}px)`
        p1Ref.current.style.pointerEvents = p1Opacity > 0.3 ? 'auto' : 'none'
      }

      // Scroll Indicator (visible in phase 1, disappears toward 0.20 and at phase 4)
      if (scrollIndicatorRef.current) {
        const scrollOpacity = p < 0.15 ? Math.max(0, 1 - p / 0.15) : 0
        scrollIndicatorRef.current.style.opacity = scrollOpacity.toFixed(3)
      }

      // Phase 2 (0.30 to 0.50)
      if (p2Ref.current) {
        let p2Opacity = 0
        if (p >= 0.26 && p <= 0.54) {
          if (p < 0.32) p2Opacity = (p - 0.26) / 0.06
          else if (p > 0.48) p2Opacity = Math.max(0, 1 - (p - 0.48) / 0.06)
          else p2Opacity = 1
        }
        const p2Y = (p - 0.30) * -20
        p2Ref.current.style.opacity = p2Opacity.toFixed(3)
        p2Ref.current.style.transform = `translateY(${p2Y.toFixed(1)}px)`
        p2Ref.current.style.pointerEvents = p2Opacity > 0.3 ? 'auto' : 'none'
      }

      // Phase 3 (0.55 to 0.85)
      if (p3Ref.current) {
        let p3Opacity = 0
        if (p >= 0.52 && p <= 0.88) {
          if (p < 0.58) p3Opacity = (p - 0.52) / 0.06
          else if (p > 0.82) p3Opacity = Math.max(0, 1 - (p - 0.82) / 0.06)
          else p3Opacity = 1
        }
        const p3Y = (p - 0.55) * -25
        p3Ref.current.style.opacity = p3Opacity.toFixed(3)
        p3Ref.current.style.transform = `translateY(${p3Y.toFixed(1)}px)`
        p3Ref.current.style.pointerEvents = p3Opacity > 0.3 ? 'auto' : 'none'
      }

      // Phase 4 (0.90 to 1.0)
      if (p4Ref.current) {
        const p4Opacity = p >= 0.88 ? Math.min(1, (p - 0.88) / 0.06) : 0
        const p4Y = Math.max(0, (1 - p4Opacity) * 20)
        p4Ref.current.style.opacity = p4Opacity.toFixed(3)
        p4Ref.current.style.transform = `translateY(${p4Y.toFixed(1)}px)`
        p4Ref.current.style.pointerEvents = p4Opacity > 0.3 ? 'auto' : 'none'
      }

      // Header Nav transformation:
      // Transparent cream text during hero, blurred cream/brown bar after hero ends
      if (headerRef.current) {
        if (p >= 0.92) {
          headerRef.current.classList.add('is-scrolled')
        } else {
          headerRef.current.classList.remove('is-scrolled')
        }
      }

      rafId = requestAnimationFrame(renderLoop)
    }

    rafId = requestAnimationFrame(renderLoop)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId)
    }
  }, [reducedMotion])

  return (
    <>
      {/* =========================================================================
          GLOBAL HEADER NAV
          Transparent over the hero with cream text;
          Morphs into a blurred cream/brown bar after the hero ends
          ========================================================================= */}
      <header className="cuoriva-nav-header" ref={headerRef}>
        <div className="nav-container">
          <div className="nav-left">
            <a href="#hero" className="nav-brand" aria-label="Cuoriva Ana Sayfa">
              <span className="cr-monogram-wrap">
                <img src="/assets/cuoriva-mark.png" alt="CR" className="cr-monogram" />
              </span>
              <div className="nav-brand-text">
                <span className="brand-title">CUORIVA</span>
                <span className="brand-subtitle">LEATHER GOODS</span>
              </div>
            </a>
          </div>

          <nav className="nav-center" aria-label="Ana Menü">
            <a href="#koleksiyon" className="nav-link">
              Koleksiyon
            </a>
            <a href="#motto" className="nav-link">
              Hikâyemiz
            </a>
            <a href="#mekanizma" className="nav-link">
              Mekanizma
            </a>
            <a href="mailto:destek@cuoriva.com" className="nav-link">
              İletişim
            </a>
          </nav>

          <div className="nav-right">
            <button
              type="button"
              className="nav-action-btn menu-trigger"
              onClick={onOpenMenu}
              aria-label="Koleksiyon Menüsünü Aç"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
                <path d="M4 8h16M4 16h16" />
              </svg>
              <span className="btn-label">Menü</span>
            </button>

            <button
              type="button"
              className="nav-action-btn cart-trigger"
              onClick={onOpenCart}
              aria-label="Sepeti Görüntüle"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
                <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
                <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
              </svg>
              <span className="cart-badge">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          SCROLL-DRIVEN VIDEO HERO (CANVAS + IMAGE SEQUENCE)
          Wrapper: 500vh (desktop) / 400vh (mobile)
          Sticky Container: 100vh / 100svh
          ========================================================================= */}
      <section className="scroll-hero-wrapper" ref={wrapperRef} id="hero">
        {/* Anchor for Hikâyemiz / Motto jump */}
        <div id="motto" style={{ position: 'absolute', top: '55%', left: 0, width: 1, height: 1, pointerEvents: 'none' }} />

        <div className="scroll-hero-sticky" ref={stickyRef}>
          {/* Subtle Minimal Cognac Progress Bar (First Batch Loader) */}
          {!isPriorityReady && (
            <div
              className="hero-loader-progress"
              ref={progressLineRef}
              style={{ width: `${loadPercentage}%` }}
              aria-hidden="true"
            />
          )}

          {/* Fullscreen High-Performance Canvas */}
          <canvas ref={canvasRef} className="scroll-hero-canvas" />

          {/* Film Grain & Directional Warm Sunlight Scrim */}
          <div className="hero-film-grain" aria-hidden="true" />
          <div className="hero-warm-scrim" aria-hidden="true" />
          <div className="hero-floating-dust" aria-hidden="true" />

          {/* =====================================================================
              OVERLAY STORYTELLING TIED TO SCROLL PROGRESS
              Placed gracefully on the quieter left side so the wallet and
              CUORIVA embossing are never covered.
              ===================================================================== */}

          {/* --- PHASE 1: 0 - 0.15 --- */}
          <div className="hero-overlay-phase phase-1" ref={p1Ref}>
            <div className="phase-top-mark">
              <img src="/assets/cuoriva-mark.png" alt="CR" className="phase-cr-logo" />
              <div className="phase-mark-copy">
                <span className="phase-eyebrow">CUORIVA · ATELIER</span>
                <span className="phase-location">AKDENİZ · EL DİKİMİ</span>
              </div>
            </div>
            <h1 className="hero-headline serif-title">
              Her şey cebinde<br />
              <em className="italic-accent">başlar.</em>
            </h1>
            <p className="hero-subtext">
              Sıcak Akdeniz sokaklarının dinginliği ve ömür boyu formunu kaybetmeyecek hakiki deri bir yol arkadaşı.
            </p>
          </div>

          {/* --- PHASE 2: 0.30 - 0.50 (While Wallet Drops) --- */}
          <div className="hero-overlay-phase phase-2" ref={p2Ref}>
            <span className="phase-eyebrow-pill">ZAMAN YAVAŞLAR</span>
            <h2 className="hero-headline serif-title">
              Bir an.<br />
              <em className="italic-accent">Bir düşüş.</em>
            </h2>
            <p className="hero-subtext">
              Arnavut kaldırımlarına değen el yapımı konyak derinin hikâyesi burada başlıyor.
            </p>
          </div>

          {/* --- PHASE 3: 0.55 - 0.85 (As Cards Burst Out) --- */}
          <div className="hero-overlay-phase phase-3" ref={p3Ref}>
            <span className="phase-eyebrow-pill gold">İMZA MOTTO</span>
            <h2 className="hero-headline serif-title motto-burst">
              Dünyaları<br />
              cüzdana <em className="italic-accent gold-glow">sığdırıyoruz.</em>
            </h2>
            <p className="hero-subtext">
              Yalnızca nakit ve kartlar değil; seyahat biletleriniz, polaroidleriniz, anılarınız ve tüm dünyanız tek bir formda.
            </p>
          </div>

          {/* --- PHASE 4: 0.90 - 1.0 (Call to Action) --- */}
          <div className="hero-overlay-phase phase-4" ref={p4Ref}>
            <span className="phase-eyebrow-pill">KEŞFETMEYE BAŞLAYIN</span>
            <h2 className="hero-headline serif-title cta-heading">
              Cebinizdeki<br />
              <em className="italic-accent">dünyayı seçin.</em>
            </h2>
            <div className="hero-cta-group">
              <a href="#koleksiyon" className="hero-cta-btn primary-btn">
                <span>Koleksiyonu Keşfet</span>
                <svg viewBox="0 0 24 24" className="cta-icon">
                  <path d="M12 5v14M7 14l5 5 5-5" />
                </svg>
              </a>
              <a href="#mekanizma" className="hero-cta-btn secondary-btn">
                <span>Mekanizma Simülatörü</span>
              </a>
            </div>
          </div>

          {/* --- Subtle "Scroll" Indicator with Thin Animated Line (0 - 0.15) --- */}
          <div className="hero-scroll-indicator" ref={scrollIndicatorRef}>
            <div className="indicator-line-wrap">
              <div className="indicator-thin-line" />
            </div>
            <span className="indicator-label">AŞAĞI KAYDIRIN · CÜZDAN AÇILSIN</span>
          </div>
        </div>
      </section>
    </>
  )
}
