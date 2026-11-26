import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import heroConfigJson from '../../public/hero/hero.config.json'
import framesJson from '../../public/hero/frames.json'
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

type ClipName = 'intro' | 'open_1' | 'open_2' | 'open_3' | 'open_4' | 'idle'
type HeroUiState = 'LOADING' | 'INTRO' | 'IDLE' | 'OPENING' | 'OPEN' | 'CLOSING'

type HotspotBox = {
  x: number
  y: number
  w: number
  h: number
}

type HeroProductConfig = {
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

const HERO_PRODUCTS = heroConfigJson.products as HeroProductConfig[]
const FPS = framesJson.fps || heroConfigJson.fps || 16
const CLIP_COUNTS = framesJson.clips as Record<Exclude<ClipName, 'idle'>, number>

function pad4(n: number): string {
  return String(n).padStart(4, '0')
}

function getFrameUrl(set: 'desktop' | 'mobile', clip: Exclude<ClipName, 'idle'>, frame1Based: number): string {
  return `/hero/frames/${set}/${clip}/${pad4(frame1Based)}.webp`
}

function drawCoverOrContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  mode: 'cover' | 'contain',
  alpha: number
) {
  if (!img.complete || img.naturalWidth === 0 || cw === 0 || ch === 0) return
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const scale = mode === 'cover' ? Math.max(cw / iw, ch / ih) : Math.min(cw / iw, ch / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = (cw - dw) / 2
  const dy = (ch - dh) / 2
  ctx.globalAlpha = alpha
  ctx.drawImage(img, dx, dy, dw, dh)
}

export function AppleHero({ onAddToCart: _onAddToCart }: AppleHeroProps) {
  const dockRef = useRef<HTMLDivElement>(null)
  const stageBoxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [uiState, setUiState] = useState<HeroUiState>('IDLE')
  const [activeWallet, setActiveWallet] = useState<number | null>(null) // 0..3
  const [showCard, setShowCard] = useState(false)
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState<number | null>(null)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [debugHotspots, setDebugHotspots] = useState<HotspotBox[]>(() =>
    HERO_PRODUCTS.map((p) => ({ ...p.hotspot }))
  )
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null])
  const autoOpenTimerRef = useRef<number | null>(null)

  // Frame cache & loader state
  const frameSetRef = useRef<'desktop' | 'mobile'>('desktop')
  const framesCacheRef = useRef<Record<string, HTMLImageElement[]>>({})
  const clipLoadPromisesRef = useRef<Record<string, Promise<HTMLImageElement[]>>>({})
  const loadedClipsRef = useRef<Set<string>>(new Set())

  // Player state machine refs (single source of truth for rAF)
  const playerRef = useRef<{
    clip: ClipName
    t: number
    dir: 1 | -1 | 0
    rate: number
    activeWallet: number | null
    pendingTarget: number | null // 0..3 or null
    crossfade: {
      fromImg: HTMLImageElement | null
      toClip: ClipName
      toT: number
      startTs: number
      durationMs: number
      afterDir: 1 | 0
      afterWallet: number | null
    } | null
    rafId: number | null
    lastTs: number
    hasInteracted: boolean
    autoOpenedOnce: boolean
    canvasVisible: boolean
  }>({
    clip: 'idle',
    t: 0,
    dir: 0,
    rate: 1,
    activeWallet: null,
    pendingTarget: null,
    crossfade: null,
    rafId: null,
    lastTs: 0,
    hasInteracted: false,
    autoOpenedOnce: false,
    canvasVisible: false,
  })

  const [canvasVisible, setCanvasVisible] = useState(false)

  const getIdleImage = useCallback((): HTMLImageElement | null => {
    const introFrames = framesCacheRef.current['intro']
    if (introFrames && introFrames.length > 0) {
      return introFrames[introFrames.length - 1]
    }
    return null
  }, [])

  const loadClip = useCallback((clip: Exclude<ClipName, 'idle'>): Promise<HTMLImageElement[]> => {
    if (loadedClipsRef.current.has(clip) && framesCacheRef.current[clip]) {
      return Promise.resolve(framesCacheRef.current[clip])
    }
    if (clip in clipLoadPromisesRef.current) {
      return clipLoadPromisesRef.current[clip]
    }

    const total = CLIP_COUNTS[clip] || 63
    const set = frameSetRef.current
    const imgs: HTMLImageElement[] = new Array(total)

    const promise = (async () => {
      const batchSize = 8
      for (let start = 0; start < total; start += batchSize) {
        const end = Math.min(total, start + batchSize)
        const batch: Promise<void>[] = []
        for (let i = start; i < end; i++) {
          const img = new Image()
          img.decoding = 'async'
          img.src = getFrameUrl(set, clip, i + 1)
          imgs[i] = img
          batch.push(
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve()
              } else {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              }
            })
          )
        }
        await Promise.all(batch)
      }
      framesCacheRef.current[clip] = imgs
      loadedClipsRef.current.add(clip)
      return imgs
    })()

    clipLoadPromisesRef.current[clip] = promise
    return promise
  }, [])

  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current
    const box = stageBoxRef.current
    if (!canvas || !box) return
    const rect = box.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const targetW = Math.round(rect.width * dpr)
    const targetH = Math.round(rect.height * dpr)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mode: 'cover' | 'contain' = window.innerWidth < 768 ? 'contain' : 'cover'
    ctx.clearRect(0, 0, targetW, targetH)
    if (mode === 'contain') {
      ctx.fillStyle = heroConfigJson.edgeColor || '#1b140f'
      ctx.fillRect(0, 0, targetW, targetH)
    }

    const p = playerRef.current

    // Crossfade transition (200 ms)
    if (p.crossfade) {
      const elapsed = performance.now() - p.crossfade.startTs
      const ratio = Math.min(1, Math.max(0, elapsed / p.crossfade.durationMs))
      if (p.crossfade.fromImg) {
        drawCoverOrContain(ctx, p.crossfade.fromImg, targetW, targetH, mode, 1 - ratio)
      }
      const toFrames =
        p.crossfade.toClip === 'idle'
          ? [getIdleImage()].filter((x): x is HTMLImageElement => Boolean(x))
          : framesCacheRef.current[p.crossfade.toClip]
      if (toFrames && toFrames.length > 0) {
        const toImg = toFrames[Math.min(toFrames.length - 1, Math.max(0, Math.round(p.crossfade.toT)))]
        if (toImg) {
          drawCoverOrContain(ctx, toImg, targetW, targetH, mode, ratio)
        }
      }
      ctx.globalAlpha = 1
      return
    }

    // Idle
    if (p.clip === 'idle') {
      const idleImg = getIdleImage()
      if (idleImg) {
        drawCoverOrContain(ctx, idleImg, targetW, targetH, mode, 1)
      }
      ctx.globalAlpha = 1
      return
    }

    // Fractional frame blending for active clip
    const frames = framesCacheRef.current[p.clip]
    if (!frames || frames.length === 0) return
    const maxF = frames.length - 1
    const clampedT = Math.min(maxF, Math.max(0, p.t))
    const f0 = Math.floor(clampedT)
    const f1 = Math.min(maxF, f0 + 1)
    const frac = clampedT - f0

    if (frames[f0]) {
      drawCoverOrContain(ctx, frames[f0], targetW, targetH, mode, 1)
    }
    if (frac > 0.01 && f1 !== f0 && frames[f1]) {
      drawCoverOrContain(ctx, frames[f1], targetW, targetH, mode, frac)
    }
    ctx.globalAlpha = 1
  }, [getIdleImage])

  const startLoopRef = useRef<() => void>(() => {})

  const startOpenClip = useCallback(
    (walletIdx: number, fromImg: HTMLImageElement | null) => {
      const clipName = `open_${walletIdx + 1}` as Exclude<ClipName, 'idle'>
      const p = playerRef.current
      p.activeWallet = walletIdx
      p.pendingTarget = null

      const begin = () => {
        setLoadingWallet(null)
        if (!p.canvasVisible) {
          p.canvasVisible = true
          setCanvasVisible(true)
        }
        p.activeWallet = walletIdx
        setActiveWallet(walletIdx)
        setShowCard(false)

        if (fromImg) {
          p.clip = clipName
          p.t = 0
          p.dir = 0
          p.rate = 1
          p.crossfade = {
            fromImg,
            toClip: clipName,
            toT: 0,
            startTs: performance.now(),
            durationMs: 200,
            afterDir: 1,
            afterWallet: walletIdx,
          }
          setUiState('OPENING')
          startLoopRef.current()
        } else {
          p.clip = clipName
          p.t = 0
          p.dir = 1
          p.rate = 1
          p.crossfade = null
          setUiState('OPENING')
          startLoopRef.current()
        }
      }

      if (loadedClipsRef.current.has(clipName)) {
        begin()
      } else {
        setLoadingWallet(walletIdx)
        loadClip(clipName).then(() => {
          // Only start if this wallet is still the latest intent
          if (playerRef.current.activeWallet === walletIdx && playerRef.current.pendingTarget === null) {
            begin()
          }
        })
      }
    },
    [loadClip]
  )

  const tick = useCallback(
    (now: number) => {
      const p = playerRef.current
      p.rafId = null
      if (!p.lastTs) p.lastTs = now
      const dt = Math.min(0.08, Math.max(0, (now - p.lastTs) / 1000))
      p.lastTs = now

      // 1. Handle 200 ms crossfade
      if (p.crossfade) {
        const elapsed = now - p.crossfade.startTs
        if (elapsed >= p.crossfade.durationMs) {
          const cf = p.crossfade
          p.crossfade = null
          p.clip = cf.toClip
          p.t = cf.toT
          p.dir = cf.afterDir
          p.rate = cf.afterDir === 1 ? 1 : 0
          if (cf.toClip === 'idle') {
            p.activeWallet = null
            setActiveWallet(null)
            setUiState('IDLE')
          } else {
            setUiState('OPENING')
          }
        }
        drawCurrentFrame()
        if (p.crossfade || p.dir !== 0) {
          p.rafId = window.requestAnimationFrame(tick)
        } else {
          p.rafId = null
          p.lastTs = 0
        }
        return
      }

      // 2. Advance clip playback
      if (p.dir !== 0 && p.clip !== 'idle') {
        const frames = framesCacheRef.current[p.clip]
        const maxF = frames ? frames.length - 1 : 62
        const speed = FPS * p.rate
        p.t += p.dir * speed * dt

        if (p.clip === 'intro') {
          if (p.t >= maxF) {
            p.t = maxF
            p.dir = 0
            p.clip = 'idle'
            setUiState('IDLE')
          }
        } else if (p.clip.startsWith('open_')) {
          if (p.dir === 1) {
            if (p.t >= maxF * 0.85) {
              setShowCard(true)
            }
            if (p.t >= maxF) {
              p.t = maxF
              p.dir = 0
              setUiState('OPEN')
              setShowCard(true)
            }
          } else if (p.dir === -1) {
            if (p.t <= 0) {
              p.t = 0
              p.dir = 0
              const fromImg = frames?.[0] || getIdleImage()
              const nextTarget = p.pendingTarget
              p.pendingTarget = null

              if (nextTarget !== null) {
                startOpenClip(nextTarget, fromImg)
                return
              } else {
                // Crossfade back to IDLE
                p.crossfade = {
                  fromImg,
                  toClip: 'idle',
                  toT: 0,
                  startTs: performance.now(),
                  durationMs: 200,
                  afterDir: 0,
                  afterWallet: null,
                }
              }
            }
          }
        }
      }

      drawCurrentFrame()

      if (p.dir !== 0 || p.crossfade !== null) {
        p.rafId = window.requestAnimationFrame(tick)
      } else {
        p.rafId = null
        p.lastTs = 0
      }
    },
    [drawCurrentFrame, getIdleImage, startOpenClip]
  )

  const startLoop = useCallback(() => {
    const p = playerRef.current
    if (p.rafId === null) {
      p.lastTs = performance.now()
      p.rafId = window.requestAnimationFrame(tick)
    }
  }, [tick])

  useEffect(() => {
    startLoopRef.current = startLoop
  }, [startLoop])

  const cancelAutoOpen = useCallback(() => {
    playerRef.current.hasInteracted = true
    if (autoOpenTimerRef.current !== null) {
      window.clearTimeout(autoOpenTimerRef.current)
      autoOpenTimerRef.current = null
    }
  }, [])

  const selectWallet = useCallback(
    (idx: number) => {
      cancelAutoOpen()
      if (idx < 0 || idx >= HERO_PRODUCTS.length) return

      const p = playerRef.current
      const clipName = `open_${idx + 1}` as Exclude<ClipName, 'idle'>

      // Reduced-motion / Save-Data fallback: instant poster crossfade
      if (isFallbackMode) {
        if (p.activeWallet === idx) {
          p.activeWallet = null
          p.clip = 'idle'
          setActiveWallet(null)
          setShowCard(false)
          setUiState('IDLE')
        } else {
          p.activeWallet = idx
          p.clip = clipName
          setActiveWallet(idx)
          setShowCard(true)
          setUiState('OPEN')
        }
        return
      }

      // Prioritize loading hovered/clicked clip immediately
      loadClip(clipName)

      // If in INTRO or IDLE -> open directly
      if (p.clip === 'idle' || p.clip === 'intro') {
        startOpenClip(idx, getIdleImage())
        return
      }

      // If still in crossfade or at t <= 0.5 of another clip, switch immediately
      if ((p.crossfade !== null || p.t <= 0.5) && p.activeWallet !== idx) {
        p.crossfade = null
        startOpenClip(idx, getIdleImage())
        return
      }

      // Currently playing/holding an open_i clip
      if (p.activeWallet === idx) {
        if (p.dir === -1) {
          // Was reversing -> flip forward immediately from current t!
          p.crossfade = null
          p.pendingTarget = null
          p.dir = 1
          p.rate = 1
          setUiState('OPENING')
          startLoop()
        } else {
          // Open or opening -> reverse back to idle
          p.crossfade = null
          p.pendingTarget = null
          p.dir = -1
          p.rate = 1.5
          setShowCard(false)
          setUiState('CLOSING')
          startLoop()
        }
        return
      }

      // Switching to a different wallet j != i: reverse current open_i, then crossfade to open_j
      p.crossfade = null
      p.pendingTarget = idx
      p.dir = -1
      p.rate = 1.5
      setShowCard(false)
      setUiState('CLOSING')
      startLoop()
    },
    [cancelAutoOpen, getIdleImage, isFallbackMode, loadClip, startLoop, startOpenClip]
  )

  const closeActive = useCallback(() => {
    cancelAutoOpen()
    const p = playerRef.current
    if (isFallbackMode) {
      p.activeWallet = null
      p.clip = 'idle'
      setActiveWallet(null)
      setShowCard(false)
      setUiState('IDLE')
      return
    }
    if (p.clip === 'idle' || p.activeWallet === null) return
    p.pendingTarget = null
    p.dir = -1
    p.rate = 1.5
    setShowCard(false)
    setUiState('CLOSING')
    startLoop()
  }, [cancelAutoOpen, isFallbackMode, startLoop])

  // Initial setup: detect viewport, reduced-motion/saveData, load intro -> background preload open_1..4
  useEffect(() => {
    const updateVp = () => {
      const mobile = window.innerWidth < 768
      setIsMobileViewport(mobile)
      frameSetRef.current = mobile ? 'mobile' : 'desktop'
      drawCurrentFrame()
    }
    updateVp()
    window.addEventListener('resize', updateVp)

    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === 'hotspots') {
      setIsDebugMode(true)
    }

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection
    const isSaveData = conn?.saveData === true
    const isSlowConn = conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)

    if (prefersReduced || isSaveData || isSlowConn) {
      setIsFallbackMode(true)
      playerRef.current.clip = 'idle'
      setUiState('IDLE')
      return () => window.removeEventListener('resize', updateVp)
    }

    let cancelled = false
    setUiState('LOADING')

    // Load intro frames first, then play intro, then preload open_1..4 in idle time
    loadClip('intro').then(() => {
      if (cancelled) return
      const p = playerRef.current
      if (!p.canvasVisible) {
        p.canvasVisible = true
        setCanvasVisible(true)
      }
      // If user already clicked a wallet while intro was loading, don't override
      if (p.activeWallet === null) {
        p.clip = 'intro'
        p.t = 0
        p.dir = 1
        p.rate = 1
        setUiState('INTRO')
        startLoop()
      }

      // Preload open_1..4 sequentially in idle time
      const preloadNext = (idx: number) => {
        if (cancelled || idx > 4) return
        const schedule =
          typeof window.requestIdleCallback === 'function'
            ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 1200 })
            : (cb: () => void) => window.setTimeout(cb, 150)
        schedule(() => {
          if (cancelled) return
          loadClip(`open_${idx}` as Exclude<ClipName, 'idle'>).then(() => preloadNext(idx + 1))
        })
      }
      preloadNext(1)
    })

    const onUserActivity = () => cancelAutoOpen()
    window.addEventListener('pointerdown', onUserActivity, { once: true, passive: true })
    window.addEventListener('scroll', onUserActivity, { once: true, passive: true })

    return () => {
      cancelled = true
      window.removeEventListener('resize', updateVp)
      window.removeEventListener('pointerdown', onUserActivity)
      window.removeEventListener('scroll', onUserActivity)
      if (playerRef.current.rafId !== null) {
        window.cancelAnimationFrame(playerRef.current.rafId)
      }
      if (autoOpenTimerRef.current !== null) window.clearTimeout(autoOpenTimerRef.current)
    }
  }, [cancelAutoOpen, drawCurrentFrame, loadClip, startLoop])

  // autoOpenFirst: 5s after IDLE if user hasn't interacted
  useEffect(() => {
    if (uiState !== 'IDLE') return
    if (!heroConfigJson.autoOpenFirst || isDebugMode) return
    if (!playerRef.current.hasInteracted && !playerRef.current.autoOpenedOnce) {
      autoOpenTimerRef.current = window.setTimeout(() => {
        if (!playerRef.current.hasInteracted && playerRef.current.clip === 'idle') {
          playerRef.current.autoOpenedOnce = true
          selectWallet(0)
        }
      }, heroConfigJson.autoOpenDelayMs || 5000)
    }
    return () => {
      if (autoOpenTimerRef.current !== null) {
        window.clearTimeout(autoOpenTimerRef.current)
        autoOpenTimerRef.current = null
      }
    }
  }, [isDebugMode, selectWallet, uiState])

  // Esc key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeActive()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeActive])

  // Expose window.__hero = { state, select(n), close() } for testing
  useEffect(() => {
    const api = {
      get state() {
        return {
          uiState,
          clip: playerRef.current.clip,
          t: Number(playerRef.current.t.toFixed(2)),
          dir: playerRef.current.dir,
          activeWallet: playerRef.current.activeWallet !== null ? playerRef.current.activeWallet + 1 : null,
        }
      },
      select(n: number) {
        if (n >= 1 && n <= HERO_PRODUCTS.length) {
          selectWallet(n - 1)
        }
      },
      close() {
        closeActive()
      },
    }
    ;(window as unknown as { __hero?: typeof api }).__hero = api
    return () => {
      delete (window as unknown as { __hero?: typeof api }).__hero
    }
  }, [closeActive, selectWallet, uiState])

  // Debug hotspot drag / resize
  const startDebugDrag = (idx: number, mode: 'move' | 'resize', e: React.PointerEvent) => {
    if (!isDebugMode || !stageBoxRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = stageBoxRef.current.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const orig = { ...debugHotspots[idx] }

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100
      const dyPct = ((ev.clientY - startY) / rect.height) * 100
      setDebugHotspots((prev) =>
        prev.map((box, i) => {
          if (i !== idx) return box
          if (mode === 'move') {
            return {
              ...box,
              x: Number(Math.max(0, Math.min(95, orig.x + dxPct)).toFixed(1)),
              y: Number(Math.max(0, Math.min(95, orig.y + dyPct)).toFixed(1)),
            }
          }
          return {
            ...box,
            w: Number(Math.max(5, Math.min(40, orig.w + dxPct)).toFixed(1)),
            h: Number(Math.max(8, Math.min(60, orig.h + dyPct)).toFixed(1)),
          }
        })
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

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
    uiState === 'OPENING' || uiState === 'OPEN' || uiState === 'CLOSING'

  const idleSet = isMobileViewport ? 'mobile' : 'desktop'
  const idlePosterUrl = getFrameUrl(idleSet, 'intro', CLIP_COUNTS.intro || 63)
  const fallbackOpenPosterUrl =
    isFallbackMode && activeWallet !== null
      ? getFrameUrl(idleSet, `open_${activeWallet + 1}` as Exclude<ClipName, 'idle'>, CLIP_COUNTS[`open_${activeWallet + 1}` as Exclude<ClipName, 'idle'>] || 63)
      : null

  return (
    <section
      className="interactive-hero"
      id="hero"
      aria-label="Elons Leather İnteraktif Cüzdan Sahnesi"
    >
      <div className="hero-viewport">
        <div
          className="hero-stage-shell"
          onClick={(e) => {
            if (e.target === e.currentTarget && uiState === 'OPEN') {
              closeActive()
            }
          }}
        >
          <div ref={stageBoxRef} className="hero-stage-box">
            {/* LCP Image: last frame of intro preloaded high priority */}
            <img
              src={idlePosterUrl}
              alt="Elons Leather el yapımı hakiki deri cüzdan koleksiyonu tepsi sunumu"
              width={1280}
              height={720}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
              className="hero-poster-layer"
            />

            {/* Reduced-motion / Save-Data crossfade poster */}
            {isFallbackMode && fallbackOpenPosterUrl && (
              <img
                src={fallbackOpenPosterUrl}
                alt={`${activeProductMeta?.name || ''} açık görünüm`}
                width={1280}
                height={720}
                className={`hero-poster-layer ${uiState === 'OPEN' ? 'is-visible' : 'is-hidden'}`}
              />
            )}

            {/* Single Canvas Frame-Sequence Renderer */}
            {!isFallbackMode && (
              <canvas
                ref={canvasRef}
                className={`hero-canvas-layer ${canvasVisible ? 'is-visible' : ''}`}
                aria-hidden="true"
                onClick={() => {
                  if (uiState === 'OPEN') closeActive()
                }}
              />
            )}

            {/* Hotspot Layer */}
            <div className="hero-hotspot-layer">
              {HERO_PRODUCTS.map((item, idx) => {
                const box = debugHotspots[idx]
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
                    onMouseEnter={() => loadClip(`open_${idx + 1}` as Exclude<ClipName, 'idle'>)}
                    onFocus={() => loadClip(`open_${idx + 1}` as Exclude<ClipName, 'idle'>)}
                    onPointerDown={(e) => {
                      loadClip(`open_${idx + 1}` as Exclude<ClipName, 'idle'>)
                      if (isDebugMode) {
                        startDebugDrag(idx, 'move', e)
                        return
                      }
                      if (e.pointerType === 'mouse') e.preventDefault()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.currentTarget.blur()
                      if (isDebugMode) return
                      selectWallet(idx)
                    }}
                  >
                    <span className="hero-hotspot-glow" aria-hidden="true" />
                    <span className="hero-hotspot-tooltip" role="tooltip">
                      {item.name}
                    </span>
                    {loadingWallet === idx && (
                      <span className="hero-hotspot-loader" aria-label="Yükleniyor" />
                    )}
                    {isDebugMode && (
                      <>
                        <span className="hero-debug-label">
                          {item.tabLabel} ({box.x},{box.y},{box.w},{box.h})
                        </span>
                        <span
                          className="hero-debug-resize"
                          onPointerDown={(e) => startDebugDrag(idx, 'resize', e)}
                        />
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="hero-vignette-overlay" aria-hidden="true" />
          </div>
        </div>

        {/* Top-left Headline */}
        <div
          className={`hero-headline-overlay ${
            isAnyOpenOrOpening ? 'is-dimmed' : ''
          }`}
        >
          <span className="apple-hero-eyebrow">
            ELONS LEATHER · EL YAPIMI HAKİKİ DERİ KOLEKSİYONU
          </span>
          <h1 className="hero-main-h1">
            Cebinizdeki dünyayı<br />
            <em>yeniden tanımlayın.</em>
          </h1>
          {uiState === 'IDLE' && (
            <p className="hero-idle-hint" aria-live="polite">
              <span className="hint-pulse-dot" aria-hidden="true" />
              Bir cüzdan seçin
            </p>
          )}
        </div>

        {/* Product Detail Glass Card */}
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
              <svg
                className="hero-card-stitch-svg"
                aria-hidden="true"
                viewBox="0 0 360 280"
                preserveAspectRatio="none"
              >
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
                  onClick={closeActive}
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
              } else if (e.key === 'Enter' || e.key === ' ') {
                if (currentIdx >= 0) {
                  e.preventDefault()
                  selectWallet(currentIdx)
                }
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
                  onMouseEnter={() => loadClip(`open_${idx + 1}` as Exclude<ClipName, 'idle'>)}
                  onFocus={() => loadClip(`open_${idx + 1}` as Exclude<ClipName, 'idle'>)}
                  onClick={() => selectWallet(idx)}
                >
                  <span>{item.tabLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Crawlable SEO Product Links */}
        <nav className="sr-only" aria-label="Öne Çıkan Cüzdan Bağlantıları">
          {HERO_PRODUCTS.map((item) => (
            <Link key={item.id} to={item.url}>
              {item.name} - {item.price}
            </Link>
          ))}
        </nav>

        {/* Debug Hotspot Editor Overlay (?debug=hotspots) */}
        {isDebugMode && (
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
              const firstVariant = prod.variants[0]
              const thumb = firstVariant?.images[0]?.thumb || firstVariant?.images[0]?.full || ''
              const price = getProductStartingPrice(prod)
              return (
                <Link key={prod.slug} to={`/urun/${prod.slug}/`} className="apple-dock-card">
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
