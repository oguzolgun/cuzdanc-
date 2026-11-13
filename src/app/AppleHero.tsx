import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  formatPrice,
  getCategoryBySlug,
  getProductStartingPrice,
  products,
  type ProductRecord,
  type ProductVariantRecord,
} from './data'

type AppleHeroProps = {
  onAddToCart: (product: ProductRecord, variant: ProductVariantRecord) => void
}

type FlagshipSpec = {
  slug: string
  tabLabel: string
  tagline: string
  highlights: string[]
}

const FLAGSHIP_SPECS: FlagshipSpec[] = [
  {
    slug: 'rio-boss-miknatisli-deri-cuzdan',
    tabLabel: 'Rio Boss',
    tagline:
      '8 x 10 cm kompakt ölçüsünde 20 karta kadar kapasite ve 2 ayrı banknot bölmesi sunan mıknatıslı hakiki deri cüzdan.',
    highlights: ['8 x 10 cm Ölçü', '20 Karta Kadar', '2 Banknot Bölmesi', 'İsim / Logo Baskısı'],
  },
  {
    slug: 'rio-miknatisli-deri-cuzdan',
    tabLabel: 'Rio',
    tagline:
      'Gizli mıknatıslı çift katlı tasarım ve beş farklı doğal renk seçeneğiyle günlük taşımada düzenli ergonomi.',
    highlights: ['Mıknatıslı Çift Kat', 'El Yapımı Hakiki Deri', '5 Renk Alternatifi', 'Ücretsiz İsim Baskısı'],
  },
  {
    slug: 'duo-klasik-deri-cuzdan',
    tabLabel: 'Duo',
    tagline:
      'Geleneksel katlanır cüzdan alışkanlıklarını özenli el dikişi ve sıcak deri dokusuyla buluşturan zamansız model.',
    highlights: ['Klasik El Yapımı Form', 'Hakiki Deri Gövde', '3 Zamansız Renk', 'Ücretsiz İsim Baskısı'],
  },
  {
    slug: 'wonder-ince-deri-kartlik',
    tabLabel: 'Wonder',
    tagline:
      'Yalnızca temel kartlarını yanında taşımak isteyenler için cepte ağırlık yapmayan ultra sade el yapımı kartlık.',
    highlights: ['İnce Minimal Siluet', 'El Yapımı Hakiki Deri', 'Siyah & Taba Renkler', 'Ücretsiz İsim Baskısı'],
  },
  {
    slug: 'atlas-deri-omuz-cantasi',
    tabLabel: 'Atlas Çanta',
    tagline:
      'Hareketli şehir günlerinde ve keşif seyahatlerinde ellerinizi serbest bırakan sıcak taba göğüs ve omuz çantası.',
    highlights: ['Omuz & Göğüs Kullanımı', 'Taba Hakiki Deri', 'El Yapımı İşçilik', 'Ücretsiz İsim Baskısı'],
  },
]

function bannerToThumb(bannerPath: string): string {
  return bannerPath.replace(/(\.[^.]+)$/, '-600$1')
}

export function AppleHero({ onAddToCart }: AppleHeroProps) {
  const dockRef = useRef<HTMLDivElement>(null)

  const flagshipSeries = useMemo(() => {
    return FLAGSHIP_SPECS.map((spec) => {
      const product = products.find((p) => p.slug === spec.slug)
      if (!product) return null
      const category = getCategoryBySlug(product.primaryCategory)
      return { spec, product, category }
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [])

  const [activeModelIdx, setActiveModelIdx] = useState(0)
  const [selectedVariantByModel, setSelectedVariantByModel] = useState<Record<string, string>>({})

  const dockProducts = useMemo(() => {
    const boss = products.find((p) => p.slug === 'rio-boss-miknatisli-deri-cuzdan')
    const rest = products.filter((p) => p.slug !== 'rio-boss-miknatisli-deri-cuzdan')
    return boss ? [boss, ...rest] : products
  }, [])

  const activeEntry = flagshipSeries[activeModelIdx] ?? flagshipSeries[0]
  if (!activeEntry) return null

  const totalSeries = flagshipSeries.length
  const handlePrevSeries = () => {
    setActiveModelIdx((prev) => (prev - 1 + totalSeries) % totalSeries)
  }
  const handleNextSeries = () => {
    setActiveModelIdx((prev) => (prev + 1) % totalSeries)
  }

  const { product: activeProduct, spec, category } = activeEntry
  const activeColorSlug = selectedVariantByModel[activeProduct.id] || activeProduct.variants[0].renkSlug
  const activeVariant =
    activeProduct.variants.find((v) => v.renkSlug === activeColorSlug) || activeProduct.variants[0]
  const heroImage = activeVariant.images[0]
  const formattedPrice = formatPrice(activeVariant.price)

  return (
    <section className="apple-hero" id="hero">
      <div className="apple-hero-container">
        <div className="apple-hero-split">
          <div className="apple-hero-header">
            <span className="apple-hero-eyebrow">
              ELON LEATHER · EL YAPIMI HAKİKİ DERİ KOLEKSİYONU
            </span>
            <h1 className="apple-hero-title">
              Cebinizdeki dünyayı<br />
              <em>yeniden tanımlayın.</em>
            </h1>
            <p className="apple-hero-subtitle">
              Doğal damarlı hakiki deri cüzdanlar, ince kartlıklar, çantalar ve günlük aksesuarlarla 12 özgün atölye tasarımı.
            </p>
            <div className="apple-hero-ctas">
              <Link to="/cuzdan-kartlik/" className="apple-btn-primary">
                Koleksiyonu Keşfet ({products.length} Seri)
              </Link>
              <a href="#kisisellestir" className="apple-btn-secondary">
                İsim Baskısı Dene <span>→</span>
              </a>
            </div>
          </div>

          {/* Interactive Flagship Showcase Stage (Right Column) */}
          <div
            className="apple-stage-card"
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                handlePrevSeries()
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                handleNextSeries()
              }
            }}
          >
            <div className="apple-stage-grid">
              <div className="apple-stage-media">
                {heroImage && (
                  <picture key={heroImage.full}>
                    <source media="(max-width: 768px)" srcSet={heroImage.thumb} />
                    <img
                      src={heroImage.full}
                      alt={heroImage.alt}
                      width={heroImage.width}
                      height={heroImage.height}
                      fetchPriority="high"
                      loading="eager"
                      decoding="sync"
                      className="apple-stage-photo"
                    />
                  </picture>
                )}
                <div className="apple-stage-media-badges">
                  <span className="stage-badge-light">Hakiki Deri · El Yapımı</span>
                  {activeProduct.personalization.isimYazdirma && (
                    <span className="stage-badge-dark">Ücretsiz İsim Baskısı</span>
                  )}
                </div>
              </div>

              <div className="apple-stage-info">
                <div className="apple-stage-meta">
                  <span className="stage-kicker">{category?.name || activeProduct.productType}</span>
                  <h2>{activeProduct.modelName} Serisi</h2>
                  {formattedPrice && <strong className="stage-price">{formattedPrice}</strong>}
                </div>

                <p className="stage-tagline">{spec.tagline}</p>

                <ul className="stage-highlights">
                  {spec.highlights.map((hl) => (
                    <li key={hl}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>

                {activeProduct.variants.length > 1 && (
                  <div className="stage-swatches-wrap">
                    <div className="stage-swatches-label">
                      <span>Deri Rengi:</span>
                      <strong>{activeVariant.renk}</strong>
                    </div>
                    <div className="stage-swatches-list">
                      {activeProduct.variants.map((variant) => (
                        <button
                          type="button"
                          key={variant.sku}
                          className={`stage-swatch-dot ${variant.renkSlug === activeVariant.renkSlug ? 'is-selected' : ''}`}
                          onClick={() =>
                            setSelectedVariantByModel((prev) => ({
                              ...prev,
                              [activeProduct.id]: variant.renkSlug,
                            }))
                          }
                          title={variant.renk}
                          aria-label={`${activeProduct.modelName} - ${variant.renk}`}
                        >
                          <i style={{ background: variant.colorHex }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="stage-actions">
                  <Link
                    to={`/urun/${activeProduct.slug}/?renk=${encodeURIComponent(activeVariant.renkSlug)}`}
                    className="stage-action-buy"
                  >
                    Ürünü İncele &amp; Özelleştir
                  </Link>
                  {typeof activeVariant.price === 'number' && (
                    <button
                      type="button"
                      className="stage-action-bag"
                      onClick={() => onAddToCart(activeProduct, activeVariant)}
                    >
                      Sepete Ekle
                    </button>
                  )}
                </div>
              </div>

              {/* Vertical Up / Down Stepper Rail (replaces bottom 1-5 bar) */}
              <div className="apple-stage-vertical-nav" aria-label="Öne çıkan seriler arası geçiş">
                <button
                  type="button"
                  className="stage-arrow-btn"
                  onClick={handlePrevSeries}
                  aria-label="Önceki seri"
                  title="Önceki seri"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>

                <div className="stage-rail-status">
                  <span className="stage-rail-counter">
                    <strong>0{activeModelIdx + 1}</strong>
                    <small>/0{totalSeries}</small>
                  </span>
                  <div className="stage-rail-dots" role="tablist" aria-label="Seri seçimi">
                    {flagshipSeries.map((entry, idx) => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeModelIdx === idx}
                        aria-label={`${idx + 1}. seri: ${entry.spec.tabLabel}`}
                        title={entry.spec.tabLabel}
                        key={entry.product.id}
                        className={`stage-rail-dot ${activeModelIdx === idx ? 'is-active' : ''}`}
                        onClick={() => setActiveModelIdx(idx)}
                      >
                        <i aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="stage-arrow-btn"
                  onClick={handleNextSeries}
                  aria-label="Sonraki seri"
                  title="Sonraki seri"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Curated Product Dock with Prices */}
        <div className="apple-category-dock" aria-label="Öne çıkan ürün modelleri">
          <div className="apple-dock-header">
            <div>
              <span className="apple-dock-eyebrow">Öne Çıkan Modeller</span>
              <h3 className="apple-dock-title">Atölye Koleksiyonu · {dockProducts.length} Model</h3>
            </div>
            <div className="apple-dock-actions">
              <div className="dock-scroll-arrows" aria-label="Koleksiyon kaydırma butonları">
                <button
                  type="button"
                  onClick={() => dockRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  aria-label="Önceki ürünler"
                  title="Önceki ürünler"
                  className="dock-arrow-btn"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => dockRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  aria-label="Sonraki ürünler"
                  title="Sonraki ürünler"
                  className="dock-arrow-btn"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
              <Link to="/cuzdan-kartlik/" className="apple-dock-all-link">
                Tüm Ürünleri Gör →
              </Link>
            </div>
          </div>
          <div className="apple-dock-track" ref={dockRef}>
            {dockProducts.map((prod) => {
              const primaryVariant = prod.variants[0]
              const thumbImg = primaryVariant?.images[0]
              const startingPrice = getProductStartingPrice(prod)
              const formattedStartingPrice = formatPrice(startingPrice)
              const cat = getCategoryBySlug(prod.primaryCategory)
              return (
                <Link to={`/urun/${prod.slug}/`} key={prod.slug} className="apple-dock-card">
                  <div className="apple-dock-thumb">
                    {thumbImg && (
                      <img
                        src={thumbImg.thumb}
                        alt={prod.name}
                        width={thumbImg.width}
                        height={thumbImg.height}
                        loading="lazy"
                        fetchPriority="low"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="apple-dock-label">
                    <strong>{prod.modelName}</strong>
                    <span className="apple-dock-category">{cat?.name || prod.productType}</span>
                    {formattedStartingPrice ? (
                      <span className="apple-dock-price">{formattedStartingPrice}</span>
                    ) : (
                      <span className="apple-dock-price-pending">Fiyat Belirleniyor</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
