import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { categories, formatPrice, productImgUrl, products, type Product } from './data'

type AppleHeroProps = {
  onAddToCart: (product: Product) => void
}

type FlagshipSpec = {
  slug: string
  tabLabel: string
  tagline: string
  highlights: string[]
}

const FLAGSHIP_SPECS: FlagshipSpec[] = [
  {
    slug: 'apex-el-yapimi-hakiki-deri-miknatisli-cift-katli-cuzdan-ve-kartlik-antik-taba',
    tabLabel: 'Apex',
    tagline: 'Çift katlı neodyum mıknatıslı mimari. Tüm kartlarınız tek bir zarif katmanda.',
    highlights: ['Neodyum Mıknatıs', 'Çift Katlı Kart Gözü', 'Ücretsiz Sıcak Baskı'],
  },
  {
    slug: 'peru-magsafe-ozellikli-standli-mekanizmali-premium-hakiki-deri-kartlik-koyu-taba',
    tabLabel: 'Peru MagSafe',
    tagline: 'iPhone MagSafe uyumu, entegre stand ve tek dokunuşlu kademeli alüminyum mekanizma.',
    highlights: ['MagSafe & Standlı', 'RFID / NFC Kalkanı', 'Kademeli Tetik'],
  },
  {
    slug: 'oslo-hakiki-deri-unisex-cuzdan-12x9-cm-sik-ve-dayanikli-tasarim-taba-siyah',
    tabLabel: 'Oslo Classic',
    tagline: '12×9 cm kompakt oranlar, el saraç dikişi ve zamanla kişiselleşen doğal patina.',
    highlights: ['Kompakt 12×9 cm', 'Unisex İki Renk Doku', 'El Dikimi Saraç'],
  },
  {
    slug: 'rio-el-yapimi-hakiki-deri-miknatisli-cift-katli-cuzdan-ve-kartlik-taba-kahverengi',
    tabLabel: 'Rio',
    tagline: 'Yüksek kapasiteli kağıt para ve gizli kart bölmeleriyle günlük ergonomik konfor.',
    highlights: ['Güçlü Gizli Mıknatıs', '10+ Kart Kapasitesi', 'Birinci Sınıf Dana Derisi'],
  },
  {
    slug: 'dopp-kit-dallas-hasir-orgu-baskili-hakiki-deri-zarif-el-cantasi-taba-kahverengi',
    tabLabel: 'Dallas Çanta',
    tagline: 'Hasır örgü dokulu hakiki dana derisinden telefon, pasaport ve kişisel eşya organizer portföy çanta.',
    highlights: ['Hasır Örgü Baskılı Deri', 'Metal Fermuar & Sap', 'Ücretsiz İsim Baskısı'],
  },
]

export function AppleHero({ onAddToCart }: AppleHeroProps) {
  const flagshipSeries = useMemo(() => {
    return FLAGSHIP_SPECS.map((spec) => {
      const baseProduct = products.find((p) => p.slug === spec.slug)
      if (!baseProduct) return null
      const variants = products.filter(
        (p) => p.model === baseProduct.model && p.categorySlug === baseProduct.categorySlug
      )
      return { spec, baseProduct, variants }
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [])

  const [activeModelIdx, setActiveModelIdx] = useState(0)
  const [selectedSlugsByModel, setSelectedSlugsByModel] = useState<Record<string, string>>({})

  // Preload flagship product photos so tab & color switches are instant
  useEffect(() => {
    flagshipSeries.forEach(({ baseProduct }) => {
      const url = baseProduct.images[0]
      if (url) {
        const preloader = new Image()
        preloader.src = productImgUrl(url, 960)
      }
    })
  }, [flagshipSeries])

  const activeEntry = flagshipSeries[activeModelIdx] ?? flagshipSeries[0]
  if (!activeEntry) return null

  const activeSlug =
    selectedSlugsByModel[activeEntry.baseProduct.model] ?? activeEntry.baseProduct.slug
  const activeProduct =
    activeEntry.variants.find((v) => v.slug === activeSlug) ?? activeEntry.baseProduct

  return (
    <section className="apple-hero" id="hero">
      <div className="apple-hero-container">
        {/* Upper Crisp Apple Editorial Typography Stack */}
        <div className="apple-hero-header">
          <span className="apple-hero-eyebrow">
            ELON LEATHER · YENİ KOLEKSİYON & ÜCRETSİZ İSİM BASKISI
          </span>
          <h1 className="apple-hero-title">
            Cebinizdeki dünyayı<br />
            <em>yeniden tanımlayın.</em>
          </h1>
          <p className="apple-hero-subtitle">
            Tek dokunuşla açılan RFID korumalı mekanizmalar, neodyum mıknatıslar ve el dikimi %100 hakiki dana derisiyle 129 özgün tasarım.
          </p>
          <div className="apple-hero-ctas">
            <Link to="/kategori/tumu" className="apple-btn-primary">
              Koleksiyonu Keşfet ({products.length})
            </Link>
            <a href="#kisisellestir" className="apple-btn-secondary">
              İsim Baskısı Dene <span>→</span>
            </a>
          </div>
        </div>

        {/* Lower Interactive Apple-Style Flagship Product Showcase Stage */}
        <div className="apple-stage-card">
          <div className="apple-stage-grid">
            {/* Media Frame */}
            <div className="apple-stage-media">
              <img
                key={activeProduct.images[0]}
                src={productImgUrl(activeProduct.images[0], 960)}
                alt={activeProduct.name}
                className="apple-stage-photo"
              />
              <div className="apple-stage-media-badges">
                {activeProduct.tag && <span className="stage-badge-light">{activeProduct.tag}</span>}
                {activeProduct.rfidProtected && <span className="stage-badge-dark">RFID Korumalı</span>}
              </div>
            </div>

            {/* Specs, Color Dots & Quick Actions */}
            <div className="apple-stage-info">
              <div className="apple-stage-meta">
                <span className="stage-kicker">{activeProduct.category}</span>
                <h2>{activeProduct.model} Serisi</h2>
                <strong className="stage-price">{formatPrice(activeProduct.price)}</strong>
              </div>

              <p className="stage-tagline">{activeEntry.spec.tagline}</p>

              <ul className="stage-highlights">
                {activeEntry.spec.highlights.map((hl) => (
                  <li key={hl}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>

              {/* Variant Swatches */}
              {activeEntry.variants.length > 1 && (
                <div className="stage-swatches-wrap">
                  <div className="stage-swatches-label">
                    <span>Deri Rengi:</span>
                    <strong>{activeProduct.colorName}</strong>
                  </div>
                  <div className="stage-swatches-list">
                    {activeEntry.variants.map((variant) => (
                      <button
                        type="button"
                        key={variant.slug}
                        className={`stage-swatch-dot ${variant.slug === activeProduct.slug ? 'is-selected' : ''}`}
                        onClick={() =>
                          setSelectedSlugsByModel((prev) => ({
                            ...prev,
                            [activeEntry.baseProduct.model]: variant.slug,
                          }))
                        }
                        title={variant.colorName}
                        aria-label={`${activeEntry.baseProduct.model} - ${variant.colorName}`}
                      >
                        <i style={{ background: variant.colorHex }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="stage-actions">
                <Link to={`/urun/${activeProduct.slug}`} className="stage-action-buy">
                  Ürünü İncele &amp; Özelleştir
                </Link>
                <button
                  type="button"
                  className="stage-action-bag"
                  onClick={() => onAddToCart(activeProduct)}
                >
                  Sepete Ekle
                </button>
              </div>
            </div>
          </div>

          {/* Series Switcher Tabs (Apple-style Bottom Finish/Model Bar) */}
          <div className="apple-stage-switcher" role="tablist" aria-label="Öne çıkan seriler">
            {flagshipSeries.map((entry, idx) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeModelIdx === idx}
                key={entry.baseProduct.model}
                className={`stage-tab-btn ${activeModelIdx === idx ? 'is-active' : ''}`}
                onClick={() => setActiveModelIdx(idx)}
              >
                <small>0{idx + 1}</small>
                <span>{entry.spec.tabLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Apple Store Horizontal Category Dock */}
        <div className="apple-category-dock" aria-label="Kategorilere göz atın">
          <div className="apple-dock-header">
            <span id="motto">Tüm Koleksiyon · 7 Kategori</span>
            <Link to="/kategori/tumu">129 Parçanın Tamamını Gör →</Link>
          </div>
          <div className="apple-dock-track">
            {categories.map((cat) => (
              <Link to={`/kategori/${cat.slug}`} key={cat.slug} className="apple-dock-card">
                <div className="apple-dock-thumb">
                  <img src={productImgUrl(cat.image, 420)} alt={cat.name} />
                </div>
                <div className="apple-dock-label">
                  <strong>{cat.name}</strong>
                  <span>{cat.count} Parça</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
