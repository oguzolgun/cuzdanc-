import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  getProductStartingPrice,
  formatPrice,
  products,
  type ProductRecord,
  type ProductVariantRecord,
} from './data'

type AppleHeroProps = {
  onAddToCart?: (product: ProductRecord, variant: ProductVariantRecord) => void
}

type HeroState = 'LOADING' | 'INTRO' | 'IDLE' | 'OPENING' | 'OPEN' | 'CLOSING'

type HotspotBox = {
  x: number
  y: number
  w: number
  h: number
}

type HeroProduct = {
  index: number
  id: string
  slug: string
  tabLabel: string
  name: string
  categoryLabel: string
  price: string
  colorCount: number
  url: string
  hotspot: HotspotBox
}

const HERO_PRODUCTS: HeroProduct[] = [
  {
    index: 0,
    id: 'lodos-pro',
    slug: 'lodos-pro-miknatisli-deri-cuzdan',
    tabLabel: '01 Lodos Pro',
    name: 'Lodos Pro',
    categoryLabel: 'MIKNATISLI DERİ CÜZDAN',
    price: '1.600 TL',
    colorCount: 3,
    url: '/urun/lodos-pro-miknatisli-deri-cuzdan/',
    hotspot: { x: 11.2, y: 35.8, w: 19.0, h: 40.5 },
  },
  {
    index: 1,
    id: 'lodos',
    slug: 'lodos-miknatisli-deri-cuzdan',
    tabLabel: '02 Lodos',
    name: 'Lodos',
    categoryLabel: 'MIKNATISLI DERİ CÜZDAN',
    price: '1.500 TL',
    colorCount: 5,
    url: '/urun/lodos-miknatisli-deri-cuzdan/',
    hotspot: { x: 32.0, y: 36.0, w: 18.0, h: 40.2 },
  },
  {
    index: 2,
    id: 'garbi',
    slug: 'garbi-mandalli-deri-cuzdan',
    tabLabel: '03 Garbi',
    name: 'Garbi',
    categoryLabel: 'KLASİK DERİ CÜZDAN',
    price: '1.400 TL',
    colorCount: 4,
    url: '/urun/garbi-mandalli-deri-cuzdan/',
    hotspot: { x: 52.0, y: 36.8, w: 17.8, h: 39.5 },
  },
  {
    index: 3,
    id: 'kesisleme',
    slug: 'kesisleme-klasik-deri-cuzdan',
    tabLabel: '04 Keşişleme',
    name: 'Keşişleme',
    categoryLabel: 'KLASİK DERİ CÜZDAN',
    price: '1.499 TL',
    colorCount: 3,
    url: '/urun/kesisleme-klasik-deri-cuzdan/',
    hotspot: { x: 71.5, y: 38.0, w: 18.5, h: 38.2 },
  },
]

const POSTERS = {
  s0: '/assets/hero/s0.webp',
  sEmpty: '/assets/hero/s_empty.webp',
  open: [
    '/assets/hero/o1.webp',
    '/assets/hero/o2.webp',
    '/assets/hero/o3.webp',
    '/assets/hero/o4.webp',
  ],
}

// TODO: Add dedicated 9:16 mobile asset set in v2 for larger vertical wallet framing on phones.
export function AppleHero({ onAddToCart: _onAddToCart }: AppleHeroProps) {
  const dockRef = useRef<HTMLDivElement>(null)
  const stageBoxRef = useRef<HTMLDivElement>(null)

  const [heroState, setHeroState] = useState<HeroState>('IDLE')
  const [activeWallet, setActiveWallet] = useState<number | null>(null)
  const [targetWallet, setTargetWallet] = useState<number | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState<number | null>(null)
  const [visibleClip, setVisibleClip] = useState<string | null>(null)
  const [debugHotspots, setDebugHotspots] = useState<HotspotBox[] | null>(null)
  const [isDebugMode, setIsDebugMode] = useState(false)

  const stateRef = useRef<{
    heroState: HeroState
    activeWallet: number | null
    targetWallet: number | null
    hasInteracted: boolean
    autoOpenedOnce: boolean
  }>({
    heroState: 'IDLE',
    activeWallet: null,
    targetWallet: null,
    hasInteracted: false,
    autoOpenedOnce: false,
  })

  const introVideoRef = useRef<HTMLVideoElement | null>(null)
  const openVideoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null, null])
  const closeVideoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null, null])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null])
  const autoOpenTimerRef = useRef<number | null>(null)

  const syncRefs = (nextState: HeroState, nextActive: number | null, nextTarget: number | null) => {
    stateRef.current.heroState = nextState
    stateRef.current.activeWallet = nextActive
    stateRef.current.targetWallet = nextTarget
    setHeroState(nextState)
    setActiveWallet(nextActive)
    setTargetWallet(nextTarget)
  }

  const cancelAutoOpen = useCallback(() => {
    stateRef.current.hasInteracted = true
    if (autoOpenTimerRef.current !== null) {
      window.clearTimeout(autoOpenTimerRef.current)
      autoOpenTimerRef.current = null
    }
  }, [])

  const revealVideoWhenPainted = useCallback((video: HTMLVideoElement, clipKey: string) => {
    const onPainted = () => {
      setVisibleClip(clipKey)
    }
    const vWithRvfc = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
    }
    if (typeof vWithRvfc.requestVideoFrameCallback === 'function') {
      vWithRvfc.requestVideoFrameCallback(onPainted)
    } else {
      const handlePlaying = () => {
        onPainted()
        video.removeEventListener('playing', handlePlaying)
      }
      video.addEventListener('playing', handlePlaying)
    }
  }, [])

  const preloadPair = useCallback((idx: number) => {
    const ov = openVideoRefs.current[idx]
    const cv = closeVideoRefs.current[idx]
    if (ov && ov.preload === 'none') {
      ov.preload = 'auto'
      ov.load()
    }
    if (cv && cv.preload === 'none') {
      cv.preload = 'auto'
      cv.load()
    }
  }, [])

  const playOpenClip = useCallback(
    (idx: number, startTime = 0, rate = 1.2) => {
      preloadPair(idx)
      const video = openVideoRefs.current[idx]
      if (!video || isFallbackMode) {
        syncRefs('OPEN', idx, null)
        setVisibleClip(null)
        setShowCard(true)
        return
      }

      const startPlayback = () => {
        setLoadingWallet(null)
        syncRefs('OPENING', idx, null)
        setShowCard(startTime > (video.duration || 1.1) * 0.85)
        video.currentTime = startTime
        video.playbackRate = rate
        revealVideoWhenPainted(video, `open_${idx}`)
        video.play().catch(() => {
          syncRefs('OPEN', idx, null)
          setVisibleClip(null)
          setShowCard(true)
        })
      }

      if (video.readyState >= 2) {
        startPlayback()
      } else {
        setLoadingWallet(idx)
        const onReady = () => {
          video.removeEventListener('canplay', onReady)
          startPlayback()
        }
        video.addEventListener('canplay', onReady)
        video.load()
      }
    },
    [isFallbackMode, preloadPair, revealVideoWhenPainted]
  )

  const playCloseClip = useCallback(
    (idx: number, nextTarget: number | null, startTime = 0, rate = 1.6) => {
      preloadPair(idx)
      setShowCard(false)
      const video = closeVideoRefs.current[idx]
      if (!video || isFallbackMode) {
        if (nextTarget !== null) {
          playOpenClip(nextTarget, 0, 1.2)
        } else {
          syncRefs('IDLE', null, null)
          setVisibleClip(null)
        }
        return
      }

      const startPlayback = () => {
        setLoadingWallet(null)
        syncRefs('CLOSING', idx, nextTarget)
        video.currentTime = startTime
        video.playbackRate = rate
        revealVideoWhenPainted(video, `close_${idx}`)
        video.play().catch(() => {
          setVisibleClip(null)
          if (nextTarget !== null) {
            playOpenClip(nextTarget, 0, 1.2)
          } else {
            syncRefs('IDLE', null, null)
          }
        })
      }

      if (video.readyState >= 2) {
        startPlayback()
      } else {
        setLoadingWallet(idx)
        const onReady = () => {
          video.removeEventListener('canplay', onReady)
          startPlayback()
        }
        video.addEventListener('canplay', onReady)
        video.load()
      }
    },
    [isFallbackMode, playOpenClip, preloadPair, revealVideoWhenPainted]
  )

  const handleSelectWallet = useCallback(
    (idx: number) => {
      cancelAutoOpen()
      const { heroState: st, activeWallet: cur } = stateRef.current

      if (st === 'INTRO') {
        const iv = introVideoRef.current
        if (iv) iv.pause()
        setVisibleClip(null)
        playOpenClip(idx, 0, 1.2)
        return
      }

      if (st === 'IDLE' || st === 'LOADING') {
        playOpenClip(idx, 0, 1.2)
        return
      }

      if (st === 'OPEN' && cur !== null) {
        if (cur === idx) {
          playCloseClip(cur, null, 0, 1.6)
        } else {
          playCloseClip(cur, idx, 0, 1.6)
        }
        return
      }

      if (st === 'OPENING' && cur !== null) {
        const ov = openVideoRefs.current[cur]
        if (ov) ov.pause()
        const dur = ov?.duration || 1.13
        const mirrored = Math.max(0, dur - (ov?.currentTime || 0))
        if (cur === idx) {
          playCloseClip(cur, null, mirrored, 1.6)
        } else {
          playCloseClip(cur, idx, mirrored, 1.6)
        }
        return
      }

      if (st === 'CLOSING' && cur !== null) {
        if (cur === idx) {
          const cv = closeVideoRefs.current[cur]
          if (cv) cv.pause()
          const dur = cv?.duration || 1.13
          const mirrored = Math.max(0, dur - (cv?.currentTime || 0))
          playOpenClip(idx, mirrored, 1.2)
        } else {
          stateRef.current.targetWallet = idx
          setTargetWallet(idx)
        }
      }
    },
    [cancelAutoOpen, playCloseClip, playOpenClip]
  )

  const handleCloseActive = useCallback(() => {
    cancelAutoOpen()
    const { heroState: st, activeWallet: cur } = stateRef.current
    if (cur === null) return
    if (st === 'OPEN') {
      playCloseClip(cur, null, 0, 1.6)
    } else if (st === 'OPENING') {
      const ov = openVideoRefs.current[cur]
      if (ov) ov.pause()
      const dur = ov?.duration || 1.13
      const mirrored = Math.max(0, dur - (ov?.currentTime || 0))
      playCloseClip(cur, null, mirrored, 1.6)
    }
  }, [cancelAutoOpen, playCloseClip])

  // Initial setup: check fallbacks, debug mode, intro autoplay, and autoOpenFirst
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === 'hotspots') {
      setIsDebugMode(true)
      setDebugHotspots(HERO_PRODUCTS.map((p) => ({ ...p.hotspot })))
    }

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection
    const isSaveData = conn?.saveData === true
    const isSlowConn = conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)

    if (prefersReduced || isSaveData || isSlowConn) {
      setIsFallbackMode(true)
      syncRefs('IDLE', null, null)
      return
    }

    // Play intro once after mount
    const iv = introVideoRef.current
    if (iv) {
      syncRefs('INTRO', null, null)
      revealVideoWhenPainted(iv, 'intro')
      iv.play().catch(() => {
        setVisibleClip(null)
        syncRefs('IDLE', null, null)
      })
    } else {
      syncRefs('IDLE', null, null)
    }

    const onUserActivity = () => cancelAutoOpen()
    window.addEventListener('pointerdown', onUserActivity, { once: true, passive: true })
    window.addEventListener('scroll', onUserActivity, { once: true, passive: true })

    return () => {
      window.removeEventListener('pointerdown', onUserActivity)
      window.removeEventListener('scroll', onUserActivity)
      if (autoOpenTimerRef.current !== null) window.clearTimeout(autoOpenTimerRef.current)
    }
  }, [cancelAutoOpen, revealVideoWhenPainted])

  // Start 5s autoOpenFirst once IDLE is reached (clips preload on hover/focus/click to protect LCP)
  useEffect(() => {
    if (heroState !== 'IDLE') return

    if (!stateRef.current.hasInteracted && !stateRef.current.autoOpenedOnce && !isDebugMode) {
      autoOpenTimerRef.current = window.setTimeout(() => {
        if (!stateRef.current.hasInteracted && stateRef.current.heroState === 'IDLE') {
          stateRef.current.autoOpenedOnce = true
          playOpenClip(0, 0, 1.2)
        }
      }, 6500)
    }

    return () => {
      if (autoOpenTimerRef.current !== null) {
        window.clearTimeout(autoOpenTimerRef.current)
        autoOpenTimerRef.current = null
      }
    }
  }, [heroState, isDebugMode, playOpenClip])

  // Esc key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseActive()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleCloseActive])

  const dockProducts = useMemo(() => {
    const boss = products.find((p) => p.slug === 'lodos-pro-miknatisli-deri-cuzdan')
    const rest = products.filter((p) => p.slug !== 'lodos-pro-miknatisli-deri-cuzdan')
    return boss ? [boss, ...rest] : products
  }, [])

  const scrollDock = (dir: -1 | 1) => {
    const el = dockRef.current
    if (!el) return
    el.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  const activeProductMeta = activeWallet !== null ? HERO_PRODUCTS[activeWallet] : null
  const isAnyOpenOrOpening =
    heroState === 'OPENING' || heroState === 'OPEN' || heroState === 'CLOSING'

  const activeHotspots = debugHotspots || HERO_PRODUCTS.map((p) => p.hotspot)

  // Determine which base poster sits underneath video layers
  const currentPosterSrc =
    heroState === 'OPEN' && activeWallet !== null ? POSTERS.open[activeWallet] : POSTERS.s0

  return (
    <section
      className="interactive-hero"
      id="hero"
      aria-label="Elon Leather İnteraktif Cüzdan Sahnesi"
    >
      <div className="hero-viewport">
        {/* Background stage container (16:9 cover on desktop, contain on mobile) */}
        <div
          className="hero-stage-shell"
          onClick={(e) => {
            if (e.target === e.currentTarget && heroState === 'OPEN') {
              handleCloseActive()
            }
          }}
        >
          <div ref={stageBoxRef} className="hero-stage-box">
            {/* LCP Image: s0.webp preloaded high priority */}
            <img
              src={POSTERS.s0}
              alt="Elon Leather el yapımı hakiki deri cüzdan koleksiyonu tepsi sunumu"
              width={1280}
              height={720}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
              className="hero-poster-layer"
            />

            {/* Opened wallet end poster underneath active clip */}
            {activeWallet !== null && (
              <img
                src={currentPosterSrc}
                alt={`${HERO_PRODUCTS[activeWallet].name} açık görünüm`}
                width={1280}
                height={720}
                className={`hero-poster-layer ${heroState === 'OPEN' ? 'is-visible' : 'is-hidden'}`}
              />
            )}

            {/* Video Pool (disabled in reduced-motion / saveData / slow-net fallback) */}
            {!isFallbackMode && (
              <>
                <video
                  ref={introVideoRef}
                  muted
                  playsInline
                  preload="metadata"
                  className={`hero-video-layer ${visibleClip === 'intro' ? 'is-visible' : ''}`}
                  onEnded={() => {
                    setVisibleClip(null)
                    syncRefs('IDLE', null, null)
                  }}
                >
                  <source src="/assets/hero/intro.webm" type="video/webm" />
                  <source src="/assets/hero/intro.mp4" type="video/mp4" />
                </video>

                {HERO_PRODUCTS.map((item, idx) => (
                  <div key={item.id} className="hero-clip-pair">
                    <video
                      ref={(el) => {
                        openVideoRefs.current[idx] = el
                      }}
                      muted
                      playsInline
                      preload="none"
                      className={`hero-video-layer ${visibleClip === `open_${idx}` ? 'is-visible' : ''}`}
                      onTimeUpdate={(e) => {
                        const v = e.currentTarget
                        if (
                          stateRef.current.heroState === 'OPENING' &&
                          stateRef.current.activeWallet === idx &&
                          v.duration > 0 &&
                          v.currentTime / v.duration >= 0.85
                        ) {
                          setShowCard(true)
                        }
                      }}
                      onEnded={() => {
                        if (
                          stateRef.current.heroState === 'OPENING' &&
                          stateRef.current.activeWallet === idx
                        ) {
                          syncRefs('OPEN', idx, null)
                          setShowCard(true)
                          setVisibleClip(null)
                        }
                      }}
                    >
                      <source src={`/assets/hero/open_${idx + 1}.webm`} type="video/webm" />
                      <source src={`/assets/hero/open_${idx + 1}.mp4`} type="video/mp4" />
                    </video>

                    <video
                      ref={(el) => {
                        closeVideoRefs.current[idx] = el
                      }}
                      muted
                      playsInline
                      preload="none"
                      className={`hero-video-layer ${visibleClip === `close_${idx}` ? 'is-visible' : ''}`}
                      onEnded={() => {
                        setVisibleClip(null)
                        const nextTarget = stateRef.current.targetWallet
                        if (nextTarget !== null) {
                          playOpenClip(nextTarget, 0, 1.2)
                        } else {
                          syncRefs('IDLE', null, null)
                        }
                      }}
                    >
                      <source src={`/assets/hero/close_${idx + 1}.webm`} type="video/webm" />
                      <source src={`/assets/hero/close_${idx + 1}.mp4`} type="video/mp4" />
                    </video>
                  </div>
                ))}
              </>
            )}

            {/* Hotspot Layer aligned to 16:9 stage box */}
            <div className="hero-hotspot-layer">
              {HERO_PRODUCTS.map((item, idx) => {
                const box = activeHotspots[idx]
                const isSelected = activeWallet === idx && isAnyOpenOrOpening
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`hero-hotspot-btn ${isSelected ? 'is-selected' : ''} ${
                      isDebugMode ? 'is-debug' : ''
                    }`}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.w}%`,
                      height: `${box.h}%`,
                    }}
                    aria-label={`${item.name} cüzdanını aç (${item.price})`}
                    onMouseEnter={() => preloadPair(idx)}
                    onFocus={() => preloadPair(idx)}
                    onPointerDown={() => preloadPair(idx)}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isDebugMode) return
                      handleSelectWallet(idx)
                    }}
                  >
                    <span className="hero-hotspot-glow" aria-hidden="true" />
                    <span className="hero-hotspot-tooltip" role="tooltip">
                      {item.name}
                    </span>
                    {loadingWallet === idx && (
                      <span className="hero-hotspot-loader" aria-hidden="true" />
                    )}
                    {isDebugMode && (
                      <span className="hero-debug-label">
                        {idx + 1}: {item.name}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Subtle warm vignette & fine film grain */}
            <div className="hero-vignette-overlay" aria-hidden="true" />
          </div>
        </div>

        {/* Top-left Headline (dims/shrinks while a wallet is open) */}
        <div
          className={`hero-headline-overlay ${
            isAnyOpenOrOpening ? 'is-dimmed' : ''
          }`}
        >
          <span className="apple-hero-eyebrow">
            ELON LEATHER · EL YAPIMI HAKİKİ DERİ KOLEKSİYONU
          </span>
          <h1 className="hero-main-h1">
            Cebinizdeki dünyayı<br />
            <em>yeniden tanımlayın.</em>
          </h1>
          {heroState === 'IDLE' && (
            <p className="hero-idle-hint" aria-live="polite">
              <span className="hint-pulse-dot" aria-hidden="true" />
              Bir cüzdan seçin
            </p>
          )}
        </div>

        {/* Product Detail Glass Card (Desktop Right / Mobile Below Stage) */}
        <div
          className={`hero-product-card-wrap ${
            showCard && activeProductMeta ? 'is-visible' : ''
          }`}
          role="tabpanel"
          aria-live="polite"
          aria-hidden={!showCard || !activeProductMeta}
        >
          {activeProductMeta && (
            <div className="hero-product-card">
              {/* Self-drawing stitched dashed border */}
              <svg className="hero-card-stitch-svg" aria-hidden="true" viewBox="0 0 360 280" preserveAspectRatio="none">
                <rect
                  x="3"
                  y="3"
                  width="354"
                  height="274"
                  rx="14"
                  ry="14"
                  fill="none"
                  stroke="#B08D57"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  className="hero-card-stitch-rect"
                />
              </svg>

              <span className="hero-card-cat">{activeProductMeta.categoryLabel}</span>
              <h2 className="hero-card-title">{activeProductMeta.name}</h2>
              <p className="hero-card-price">{activeProductMeta.price}</p>
              <p className="hero-card-meta">
                {activeProductMeta.colorCount} renk seçeneği · El yapımı hakiki deri
              </p>

              <div className="hero-card-actions">
                <Link
                  to={activeProductMeta.url}
                  className="hero-card-btn-primary"
                  tabIndex={showCard ? 0 : -1}
                >
                  Ürünü İncele →
                </Link>
                <button
                  type="button"
                  className="hero-card-btn-quiet"
                  tabIndex={showCard ? 0 : -1}
                  onClick={handleCloseActive}
                >
                  Diğer cüzdanlar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom 4-Wallet Selector Tablist */}
        <div className="hero-selector-bar">
          <div
            className="hero-selector-tablist"
            role="tablist"
            aria-label="Cüzdan seçici"
            onKeyDown={(e) => {
              const currentIdx = tabRefs.current.findIndex((el) => el === document.activeElement)
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                const next = (currentIdx + 1) % HERO_PRODUCTS.length
                tabRefs.current[next]?.focus()
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prev = (currentIdx - 1 + HERO_PRODUCTS.length) % HERO_PRODUCTS.length
                tabRefs.current[prev]?.focus()
              }
            }}
          >
            {HERO_PRODUCTS.map((item, idx) => {
              const isActive = activeWallet === idx && isAnyOpenOrOpening
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`hero-selector-tab ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => preloadPair(idx)}
                  onFocus={() => preloadPair(idx)}
                  onClick={() => handleSelectWallet(idx)}
                >
                  <span>{item.tabLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Crawlable SEO Product Links for Search Engines */}
        <nav className="sr-only" aria-label="Öne Çıkan Cüzdan Bağlantıları">
          {HERO_PRODUCTS.map((item) => (
            <Link key={item.id} to={item.url}>
              {item.name} - {item.price}
            </Link>
          ))}
        </nav>

        {/* Debug Hotspot Editor Overlay (?debug=hotspots) */}
        {isDebugMode && debugHotspots && (
          <div className="hero-debug-panel">
            <strong>Hotspot Debug (?debug=hotspots)</strong>
            <pre>{JSON.stringify(debugHotspots, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Horizontal Collection Dock (12 Models) */}
      <div className="apple-collection-dock">
        <div className="apple-dock-header">
          <div>
            <span className="apple-dock-eyebrow">Öne Çıkan Modeller</span>
            <h2 className="apple-dock-title">Atölye Koleksiyonu · {products.length} Model</h2>
          </div>
          <div className="apple-dock-actions">
            <Link to="/kategoriler/" className="apple-dock-all-link">
              Tüm Ürünleri Gör →
            </Link>
          </div>
        </div>

        <div className="apple-dock-carousel">
          <button
            type="button"
            className="dock-edge-arrow is-prev"
            onClick={() => scrollDock(-1)}
            aria-label="Önceki modeller"
          >
            ‹
          </button>

          <div className="apple-dock-track" ref={dockRef}>
          {dockProducts.map((prod) => {
            const thumb = prod.variants[0]?.images[0]?.thumb || prod.variants[0]?.images[0]?.full
            const price = getProductStartingPrice(prod)
            return (
              <Link
                key={prod.slug}
                to={`/urun/${prod.slug}/`}
                className="apple-dock-card"
              >
                <div className="apple-dock-thumb">
                  {thumb && (
                    <img
                      src={thumb}
                      alt={prod.name}
                      width={300}
                      height={300}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="apple-dock-label">
                  <strong>{prod.modelName}</strong>
                  <span className="apple-dock-category">{prod.productType}</span>
                  <span className="apple-dock-price">{formatPrice(price)}</span>
                </div>
              </Link>
            )
          })}
          </div>

          <button
            type="button"
            className="dock-edge-arrow is-next"
            onClick={() => scrollDock(1)}
            aria-label="Sonraki modeller"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  )
}
