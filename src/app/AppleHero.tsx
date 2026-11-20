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

type HeroState = 'INTRO' | 'IDLE' | 'OPEN'

type HotspotBox = {
  x: number
  y: number
  w: number
  h: number
}

// Vitrindeki 4 ürünü değiştirmek için yalnızca buradaki slug listesini güncellemek yeterlidir.
// Tüm görseller, fiyatlar, renk varyantları ve bağlantılar otomatik olarak data/products.json'dan çekilir.
const HERO_SHOWCASE_CONFIG: { slug: string; hotspot: HotspotBox }[] = [
  {
    slug: 'lodos-pro-miknatisli-deri-cuzdan',
    hotspot: { x: 11.2, y: 35.8, w: 19.0, h: 40.5 },
  },
  {
    slug: 'lodos-miknatisli-deri-cuzdan',
    hotspot: { x: 32.0, y: 36.0, w: 18.0, h: 40.2 },
  },
  {
    slug: 'garbi-mandalli-deri-cuzdan',
    hotspot: { x: 52.0, y: 36.8, w: 17.8, h: 39.5 },
  },
  {
    slug: 'etezyen-klasik-deri-cuzdan',
    hotspot: { x: 71.5, y: 38.0, w: 18.5, h: 38.2 },
  },
]

const POSTER_S0 = '/assets/hero/s0.webp'

export function AppleHero({ onAddToCart }: AppleHeroProps) {
  const dockRef = useRef<HTMLDivElement>(null)
  const stageBoxRef = useRef<HTMLDivElement>(null)

  const [heroState, setHeroState] = useState<HeroState>('IDLE')
  const [activeWallet, setActiveWallet] = useState<number | null>(null)
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0)
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(1) // Açılışta İç Tasarım (2-acik-gorunum)
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [introVisible, setIntroVisible] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(false)

  const stateRef = useRef<{
    heroState: HeroState
    hasInteracted: boolean
    autoOpenedOnce: boolean
  }>({
    heroState: 'IDLE',
    hasInteracted: false,
    autoOpenedOnce: false,
  })

  const introVideoRef = useRef<HTMLVideoElement | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null])
  const autoOpenTimerRef = useRef<number | null>(null)

  // Dinamik ürün listesi: data/products.json üzerinden canlı eşleştirme
  const heroItems = useMemo(() => {
    return HERO_SHOWCASE_CONFIG.map((cfg, index) => {
      const product = products.find((p) => p.slug === cfg.slug) || products[index]
      const startingPrice = getProductStartingPrice(product)
      const priceLabel = formatPrice(startingPrice) || 'Fiyat sorunuz'
      return {
        index,
        id: product.slug,
        slug: product.slug,
        tabLabel: `0${index + 1} ${product.modelName}`,
        name: product.modelName,
        categoryLabel: product.productType.toLocaleUpperCase('tr-TR'),
        price: priceLabel,
        colorCount: product.variants.length,
        url: `/urun/${product.slug}/`,
        hotspot: cfg.hotspot,
        product,
      }
    })
  }, [])

  const cancelAutoOpen = useCallback(() => {
    stateRef.current.hasInteracted = true
    if (autoOpenTimerRef.current !== null) {
      window.clearTimeout(autoOpenTimerRef.current)
      autoOpenTimerRef.current = null
    }
  }, [])

  const openWalletShowcase = useCallback((idx: number) => {
    const iv = introVideoRef.current
    if (iv && !iv.paused) {
      iv.pause()
    }
    setIntroVisible(false)

    const targetItem = heroItems[idx]
    const defaultImgIdx =
      targetItem?.product.variants[0]?.images && targetItem.product.variants[0].images.length > 1
        ? 1
        : 0

    stateRef.current.heroState = 'OPEN'
    setHeroState('OPEN')
    setActiveWallet(idx)
    setSelectedVariantIdx(0)
    setSelectedImageIdx(defaultImgIdx)
  }, [heroItems])

  const handleSelectWallet = useCallback(
    (idx: number) => {
      cancelAutoOpen()
      if (stateRef.current.heroState === 'OPEN' && activeWallet === idx) {
        stateRef.current.heroState = 'IDLE'
        setHeroState('IDLE')
        setActiveWallet(null)
        return
      }
      openWalletShowcase(idx)
    },
    [activeWallet, cancelAutoOpen, openWalletShowcase]
  )

  const handleCloseActive = useCallback(() => {
    cancelAutoOpen()
    stateRef.current.heroState = 'IDLE'
    setHeroState('IDLE')
    setActiveWallet(null)
  }, [cancelAutoOpen])

  // İlk yükleme: azaltılmış hareket / düşük veri kontrolü ve intro videosu
  useEffect(() => {
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
      stateRef.current.heroState = 'IDLE'
      setHeroState('IDLE')
      return
    }

    const iv = introVideoRef.current
    if (iv) {
      stateRef.current.heroState = 'INTRO'
      setHeroState('INTRO')
      const onPlaying = () => {
        setIntroVisible(true)
        iv.removeEventListener('playing', onPlaying)
      }
      iv.addEventListener('playing', onPlaying)
      iv.play().catch(() => {
        setIntroVisible(false)
        stateRef.current.heroState = 'IDLE'
        setHeroState('IDLE')
      })
    }

    const onUserActivity = () => cancelAutoOpen()
    window.addEventListener('pointerdown', onUserActivity, { once: true, passive: true })
    window.addEventListener('scroll', onUserActivity, { once: true, passive: true })

    return () => {
      window.removeEventListener('pointerdown', onUserActivity)
      window.removeEventListener('scroll', onUserActivity)
      if (autoOpenTimerRef.current !== null) window.clearTimeout(autoOpenTimerRef.current)
    }
  }, [cancelAutoOpen])

  // Etkileşim olmazsa 6.5 sn sonra ilk ürünü nazikçe öne çıkar
  useEffect(() => {
    if (heroState !== 'IDLE') return
    if (!stateRef.current.hasInteracted && !stateRef.current.autoOpenedOnce && !isDebugMode) {
      autoOpenTimerRef.current = window.setTimeout(() => {
        if (!stateRef.current.hasInteracted && stateRef.current.heroState === 'IDLE') {
          stateRef.current.autoOpenedOnce = true
          openWalletShowcase(0)
        }
      }, 6500)
    }
    return () => {
      if (autoOpenTimerRef.current !== null) {
        window.clearTimeout(autoOpenTimerRef.current)
        autoOpenTimerRef.current = null
      }
    }
  }, [heroState, isDebugMode, openWalletShowcase])

  // Esc tuşu ile kapat
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

  const isOpen = heroState === 'OPEN' && activeWallet !== null
  const activeItem = activeWallet !== null ? heroItems[activeWallet] : null
  const activeVariant =
    activeItem?.product.variants[selectedVariantIdx] || activeItem?.product.variants[0] || null
  const variantImages = activeVariant?.images || []
  const activeImage = variantImages[selectedImageIdx] || variantImages[0] || null
  const activePrice =
    activeVariant && formatPrice(activeVariant.price)
      ? formatPrice(activeVariant.price)
      : activeItem?.price

  const viewTabs = [
    { idx: 1, label: 'İç Tasarım' },
    { idx: 0, label: 'Dış Görünüm' },
    { idx: variantImages.length > 3 ? 3 : 2, label: 'Detay' },
  ].filter((t) => Boolean(variantImages[t.idx]))

  return (
    <section
      className="interactive-hero"
      id="hero"
      aria-label="Elon Leather İnteraktif Cüzdan Sahnesi"
    >
      <div className="hero-viewport">
        {/* Arka Plan Tepsi Sahnesi */}
        <div
          className="hero-stage-shell"
          onClick={() => {
            if (isOpen) handleCloseActive()
          }}
        >
          <div
            ref={stageBoxRef}
            className={`hero-stage-box ${isOpen ? 'is-dimmed-stage' : ''}`}
          >
            {/* LCP Görseli: s0.webp */}
            <img
              src={POSTER_S0}
              alt="Elon Leather el yapımı hakiki deri cüzdan koleksiyonu tepsi sunumu"
              width={1280}
              height={720}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
              className="hero-poster-layer"
            />

            {/* İlk açılış intro videosu (tepsiden yükseliş) */}
            {!isFallbackMode && (
              <video
                ref={introVideoRef}
                muted
                playsInline
                preload="metadata"
                className={`hero-video-layer ${introVisible ? 'is-visible' : ''}`}
                onEnded={() => {
                  setIntroVisible(false)
                  stateRef.current.heroState = 'IDLE'
                  setHeroState('IDLE')
                }}
              >
                <source src="/assets/hero/intro.webm" type="video/webm" />
                <source src="/assets/hero/intro.mp4" type="video/mp4" />
              </video>
            )}

            {/* Tepsi Yuvası Tıklama Alanları (yalnızca IDLE iken aktif) */}
            <div className={`hero-hotspot-layer ${isOpen ? 'is-inactive' : ''}`}>
              {heroItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`hero-hotspot-btn ${isDebugMode ? 'is-debug' : ''}`}
                  style={{
                    left: `${item.hotspot.x}%`,
                    top: `${item.hotspot.y}%`,
                    width: `${item.hotspot.w}%`,
                    height: `${item.hotspot.h}%`,
                  }}
                  tabIndex={isOpen ? -1 : 0}
                  aria-label={`${item.name} cüzdanını incele (${item.price})`}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'mouse') e.preventDefault()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.currentTarget.blur()
                    if (isDebugMode) return
                    handleSelectWallet(idx)
                  }}
                >
                  <span className="hero-hotspot-glow" aria-hidden="true" />
                  <span className="hero-hotspot-tooltip" role="tooltip">
                    {item.name}
                  </span>
                  {isDebugMode && <span className="hero-debug-label">{item.tabLabel}</span>}
                </button>
              ))}
            </div>

            <div className="hero-vignette-overlay" aria-hidden="true" />
          </div>
        </div>

        {/* Sol Üst Başlık */}
        <div className={`hero-headline-overlay ${isOpen ? 'is-dimmed' : ''}`}>
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

        {/* Açık Durum: Gerçek Stüdyo Fotoğraflı Dinamik Ürün Vitrini (Sol) + Detay Kartı (Sağ) */}
        <div
          className={`hero-showcase-overlay ${isOpen && activeItem ? 'is-visible' : ''}`}
          role="tabpanel"
          aria-live="polite"
          aria-hidden={!isOpen}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseActive()
          }}
        >
          {activeItem && activeVariant && (
            <div className="hero-showcase-grid">
              {/* Sol: Gerçek Stüdyo Fotoğrafı + İç/Dış/Detay Geçişi */}
              <div className="hero-studio-stage">
                <div className="hero-studio-frame">
                  {activeImage && (
                    <img
                      key={activeImage.full}
                      src={activeImage.full}
                      alt={activeImage.alt || `${activeItem.name} ${activeVariant.renk}`}
                      width={activeImage.width || 1200}
                      height={activeImage.height || 1800}
                      className="hero-studio-img"
                    />
                  )}
                </div>

                {viewTabs.length > 1 && (
                  <div className="hero-studio-views" role="group" aria-label="Ürün görünümü seç">
                    {viewTabs.map((vt) => (
                      <button
                        key={vt.idx}
                        type="button"
                        className={`hero-view-pill ${selectedImageIdx === vt.idx ? 'is-active' : ''}`}
                        onClick={() => setSelectedImageIdx(vt.idx)}
                      >
                        {vt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sağ: Ürün Bilgi, Renk Varyantı & CTA Kartı */}
              <div className="hero-product-card">
                <svg
                  className="hero-card-stitch-svg"
                  aria-hidden="true"
                  viewBox="0 0 360 320"
                  preserveAspectRatio="none"
                >
                  <rect
                    x="3"
                    y="3"
                    width="354"
                    height="314"
                    rx="14"
                    ry="14"
                    fill="none"
                    stroke="#B08D57"
                    strokeWidth="1.5"
                    strokeDasharray="6 5"
                    className="hero-card-stitch-rect"
                  />
                </svg>

                <span className="hero-card-cat">{activeItem.categoryLabel}</span>
                <h2 className="hero-card-title">{activeItem.name}</h2>
                <p className="hero-card-price">{activePrice}</p>
                <p className="hero-card-meta">
                  {activeVariant.renk} · {activeItem.colorCount} renk seçeneği · El yapımı hakiki deri
                </p>

                {/* Canlı Renk Varyantı Seçici */}
                {activeItem.product.variants.length > 1 && (
                  <div className="hero-card-swatches" role="group" aria-label="Renk seçenekleri">
                    {activeItem.product.variants.map((v, vIdx) => (
                      <button
                        key={v.sku || v.renkSlug}
                        type="button"
                        className={`hero-swatch-btn ${selectedVariantIdx === vIdx ? 'is-active' : ''}`}
                        style={{ backgroundColor: v.colorHex }}
                        title={v.renk}
                        aria-label={`${v.renk} rengini seç`}
                        aria-pressed={selectedVariantIdx === vIdx}
                        onClick={() => {
                          setSelectedVariantIdx(vIdx)
                          if (!v.images[selectedImageIdx]) {
                            setSelectedImageIdx(v.images.length > 1 ? 1 : 0)
                          }
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="hero-card-actions">
                  <Link
                    to={activeItem.url}
                    className="hero-card-btn-primary"
                    tabIndex={isOpen ? 0 : -1}
                  >
                    Ürünü İncele →
                  </Link>
                  {onAddToCart && (
                    <button
                      type="button"
                      className="hero-card-btn-secondary"
                      tabIndex={isOpen ? 0 : -1}
                      onClick={() => onAddToCart(activeItem.product, activeVariant)}
                    >
                      Sepete Ekle
                    </button>
                  )}
                  <button
                    type="button"
                    className="hero-card-btn-quiet"
                    tabIndex={isOpen ? 0 : -1}
                    onClick={handleCloseActive}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alt 4'lü Cüzdan Seçici Çubuk */}
        <div className="hero-selector-bar">
          <div
            className="hero-selector-tablist"
            role="tablist"
            aria-label="Cüzdan seçici"
            onKeyDown={(e) => {
              const currentIdx = tabRefs.current.findIndex((el) => el === document.activeElement)
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                const next = (currentIdx + 1) % heroItems.length
                tabRefs.current[next]?.focus()
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prev = (currentIdx - 1 + heroItems.length) % heroItems.length
                tabRefs.current[prev]?.focus()
              }
            }}
          >
            {heroItems.map((item, idx) => {
              const isSelected = activeWallet === idx && isOpen
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`hero-selector-tab ${isSelected ? 'is-active' : ''}`}
                  onClick={() => handleSelectWallet(idx)}
                >
                  <span>{item.tabLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* SEO İçin Taranabilir Ürün Bağlantıları */}
        <nav className="sr-only" aria-label="Öne Çıkan Cüzdan Bağlantıları">
          {heroItems.map((item) => (
            <Link key={item.id} to={item.url}>
              {item.name} - {item.price}
            </Link>
          ))}
        </nav>
      </div>

      {/* Yatay Koleksiyon Şeridi (12 Model) */}
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
