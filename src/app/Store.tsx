import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router'
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  categories,
  formatPrice,
  getActiveVariant,
  getCategoryBySlug,
  getChildCategories,
  getParentCategory,
  getProductBySlug,
  getProductStartingPrice,
  getProductsByCategory,
  isConfiguredValue,
  parentCategories,
  products,
  siteConfig,
  subCategories,
  type ProductRecord,
  type ProductVariantRecord,
} from './data'
import {
  buildCategorySeo,
  buildHomeSeo,
  buildNotFoundSeo,
  buildProductSeo,
  buildStorySeo,
  useDocumentSeo,
} from './seo'
import { HeaderNav } from './HeaderNav'
import { AppleHero } from './AppleHero'

export type PersonalizationAddon = 'none' | 'logo' | 'image'

export type CartItem = {
  product: ProductRecord
  variant: ProductVariantRecord
  quantity: number
  engraving?: string
  personalizationAddon?: PersonalizationAddon
}

type StoreContext = {
  addToCart: (
    product: ProductRecord,
    variant?: ProductVariantRecord,
    quantity?: number,
    engraving?: string,
    personalizationAddon?: PersonalizationAddon
  ) => void
  openMenu: () => void
  openCart: () => void
  cartCount: number
}

function getAddonExtraPrice(product: ProductRecord, addon: PersonalizationAddon = 'none'): number {
  if (addon === 'logo' && product.personalization.logoEkleme) {
    return product.personalization.logoExtraPrice ?? siteConfig.personalizationDefaults.logoAdditionExtraTry
  }
  if (addon === 'image' && product.personalization.gorselBaski) {
    return product.personalization.imageExtraPrice ?? siteConfig.personalizationDefaults.imagePrintExtraTry
  }
  return 0
}

function getCartUnitPrice(item: CartItem): number | null {
  if (typeof item.variant.price !== 'number') return null
  return item.variant.price + getAddonExtraPrice(item.product, item.personalizationAddon)
}

function bannerToThumb(bannerPath: string): string {
  return bannerPath.replace(/(\.[^.]+)$/, '-600$1')
}

function Icon({
  name,
}: {
  name:
    | 'bag'
    | 'menu'
    | 'close'
    | 'arrow'
    | 'minus'
    | 'plus'
    | 'check'
    | 'search'
}) {
  const paths = {
    bag: (
      <>
        <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
        <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
      </>
    ),
    menu: <path d="M4 8h16M4 16h16" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    minus: <path d="M6 12h12" />,
    plus: <path d="M6 12h12M12 6v12" />,
    check: <polyline points="20 6 9 17 4 12" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand-logo ${light ? 'is-light' : ''}`}>
      <img src="/assets/elon-logo.png" alt="ELON LEATHER" width={148} height={92} loading="lazy" />
    </span>
  )
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const targetId = hash.slice(1)
      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
      }, 60)
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

/* =========================================================================
   STORE LAYOUT (Frosted Header + Mobile Drawer + Cart Drawer + Footer)
   ========================================================================= */
export function StoreLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutSubmitted, setCheckoutSubmitted] = useState(false)

  const addToCart = (
    product: ProductRecord,
    variant: ProductVariantRecord = product.variants[0],
    quantity = 1,
    engraving = '',
    personalizationAddon: PersonalizationAddon = 'none'
  ) => {
    if (typeof variant.price !== 'number') return
    const normalizedEngraving = engraving.trim().toUpperCase()
    setCheckoutSubmitted(false)
    setCart((current) => {
      const match = current.find(
        (item) =>
          item.product.slug === product.slug &&
          item.variant.renkSlug === variant.renkSlug &&
          (item.engraving || '') === normalizedEngraving &&
          (item.personalizationAddon || 'none') === personalizationAddon
      )
      if (match) {
        return current.map((item) =>
          item === match ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [
        ...current,
        {
          product,
          variant,
          quantity,
          engraving: normalizedEngraving,
          personalizationAddon,
        },
      ]
    })
    setCartOpen(true)
  }

  const count = cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => {
    const unit = getCartUnitPrice(item)
    return sum + (unit ?? 0) * item.quantity
  }, 0)

  const openMenu = () => setMenuOpen(true)
  const openCart = () => setCartOpen(true)

  const whatsappEnabled = isConfiguredValue(siteConfig.whatsappNumber)
  const shippingBadgeEnabled = isConfiguredValue(siteConfig.shippingBadgeText)

  const buildOrderSummaryMailto = () => {
    const lines = cart.map((item) => {
      const unit = getCartUnitPrice(item)
      const parts = [
        `${item.product.modelName} (${item.variant.renk}) x${item.quantity}`,
        unit !== null ? formatPrice(unit * item.quantity) : '',
        item.engraving ? `İsim Baskı: ${item.engraving}` : '',
        item.personalizationAddon === 'logo'
          ? 'Özel Logo Baskısı (+150 TL)'
          : item.personalizationAddon === 'image'
            ? 'Özel Görsel Baskı (+300 TL)'
            : '',
      ].filter(Boolean)
      return `- ${parts.join(' | ')}`
    })
    const subject = encodeURIComponent('Elon Leather Sipariş Talebi')
    const body = encodeURIComponent(
      `Merhaba Elon Leather Atölyesi,\n\nAşağıdaki ürünler hakkında sipariş oluşturmak istiyorum:\n\n${lines.join('\n')}\n\nAra Toplam: ${formatPrice(subtotal) || '-'}\n`
    )
    return `mailto:${siteConfig.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="store-shell">
      <ScrollToTop />

      <HeaderNav cartCount={count} onOpenCart={openCart} onOpenMobileMenu={openMenu} />

      {/* Fullscreen Navigation Canvas (Mobile / Quick Directory) */}
      <div className={`menu-canvas ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="menu-photo" />
        <div className="menu-content">
          <button type="button" className="canvas-close" onClick={() => setMenuOpen(false)}>
            <Icon name="close" />
            <span>Kapat</span>
          </button>
          <p className="overline">ELON LEATHER · KOLEKSİYON DİZİNİ</p>
          <nav aria-label="Mobil Kategori Menüsü">
            {categories.map((category, idx) => {
              const modelCount = getProductsByCategory(category.slug).length
              return (
                <NavLink
                  key={category.slug}
                  to={`/${category.slug}/`}
                  onClick={() => setMenuOpen(false)}
                >
                  <small>{String(idx + 1).padStart(2, '0')}</small>
                  <span>
                    {category.name} <em>({modelCount})</em>
                  </span>
                  <Icon name="arrow" />
                </NavLink>
              )
            })}
          </nav>
          <div className="menu-secondary">
            <Link to="/hikayemiz/" onClick={() => setMenuOpen(false)}>
              Hikâyemiz
            </Link>
            <Link to="/#kisisellestir" onClick={() => setMenuOpen(false)}>
              İsim Baskı Atölyesi
            </Link>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`drawer-backdrop ${cartOpen ? 'is-open' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? 'is-open' : ''}`} aria-label="Sepet">
        <div className="cart-head">
          <div>
            <p className="overline">Elon Leather Atelier</p>
            <h2>
              Sepetiniz <span>({count})</span>
            </h2>
          </div>
          <button type="button" onClick={() => setCartOpen(false)} aria-label="Sepeti kapat">
            <Icon name="close" />
          </button>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <Icon name="bag" />
              <h3>Sepetiniz henüz boş</h3>
              <p>El yapımı deri cüzdan, çanta veya kartlık seçmek için koleksiyonlara göz atın.</p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false)
                  setMenuOpen(true)
                }}
              >
                Koleksiyonu Keşfet
              </button>
            </div>
          ) : (
            cart.map((item, idx) => {
              const firstImg = item.variant.images[0]
              const unit = getCartUnitPrice(item)
              const linePrice = unit !== null ? formatPrice(unit * item.quantity) : null
              return (
                <article
                  className="cart-item"
                  key={`${item.product.slug}-${item.variant.renkSlug}-${item.engraving || ''}-${item.personalizationAddon || 'none'}-${idx}`}
                >
                  {firstImg && (
                    <img
                      src={firstImg.thumb}
                      alt={firstImg.alt}
                      width={firstImg.width}
                      height={firstImg.height}
                    />
                  )}
                  <div>
                    <h3>
                      <Link
                        to={`/urun/${item.product.slug}/?renk=${encodeURIComponent(item.variant.renkSlug)}`}
                        onClick={() => setCartOpen(false)}
                      >
                        {item.product.modelName}
                      </Link>
                    </h3>
                    <p>
                      {item.variant.renk} · Adet {item.quantity}
                    </p>
                    {item.engraving && (
                      <span className="cart-engraving-badge">
                        ✦ İsim Baskı: <strong>{item.engraving}</strong>
                      </span>
                    )}
                    {item.personalizationAddon === 'logo' && (
                      <span className="cart-engraving-badge">
                        ✦ Ek Seçenek: <strong>Özel Logo (+150 TL)</strong>
                      </span>
                    )}
                    {item.personalizationAddon === 'image' && (
                      <span className="cart-engraving-badge">
                        ✦ Ek Seçenek: <strong>Görsel Baskı (+300 TL)</strong>
                      </span>
                    )}
                    {linePrice && <strong>{linePrice}</strong>}
                  </div>
                  <button
                    type="button"
                    aria-label="Ürünü kaldır"
                    onClick={() => setCart((current) => current.filter((_, i) => i !== idx))}
                  >
                    <Icon name="close" />
                  </button>
                </article>
              )
            })
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-summary">
            <p>
              <span>Ara Toplam</span>
              <strong>{formatPrice(subtotal) || '—'}</strong>
            </p>
            {shippingBadgeEnabled && (
              <p className="cart-perk">
                <Icon name="check" />
                <span>{siteConfig.shippingBadgeText}</span>
              </p>
            )}
            {whatsappEnabled ? (
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="checkout-btn"
              >
                WhatsApp ile Siparişi Tamamla <Icon name="arrow" />
              </a>
            ) : (
              <>
                <a
                  href={buildOrderSummaryMailto()}
                  className="checkout-btn"
                  onClick={() => setCheckoutSubmitted(true)}
                >
                  Sipariş Talebini E-posta ile İlet <Icon name="arrow" />
                </a>
                {checkoutSubmitted && (
                  <p className="cart-checkout-note">
                    E-posta uygulamanız açılmadıysa sepet detayınızı{' '}
                    <strong>{siteConfig.email}</strong> adresine iletebilirsiniz.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </aside>

      <div className="page-content">
        <Outlet
          context={
            {
              addToCart,
              openMenu,
              openCart,
              cartCount: count,
            } satisfies StoreContext
          }
        />
        <Footer />
      </div>
    </div>
  )
}

/* =========================================================================
   PRODUCT CARD (Per-model grouping + interactive color swatches)
   ========================================================================= */
function ProductCard({
  product,
  index = 0,
  eager = false,
}: {
  product: ProductRecord
  index?: number
  eager?: boolean
}) {
  const [selectedVariantSlug, setSelectedVariantSlug] = useState(product.variants[0]?.renkSlug || '')

  useEffect(() => {
    setSelectedVariantSlug(product.variants[0]?.renkSlug || '')
  }, [product.slug, product.variants])

  const activeVariant =
    product.variants.find((v) => v.renkSlug === selectedVariantSlug) || product.variants[0]

  const isDefaultVariant = activeVariant?.renkSlug === product.variants[0]?.renkSlug
  const targetUrl = isDefaultVariant
    ? `/urun/${product.slug}/`
    : `/urun/${product.slug}/?renk=${encodeURIComponent(activeVariant.renkSlug)}`

  const primaryCat = getCategoryBySlug(product.primaryCategory)
  const mainImg = activeVariant?.images[0]
  const hoverImg = activeVariant?.images[1]
  const formattedPrice = formatPrice(activeVariant?.price)

  return (
    <article className="shop-card" style={{ '--delay': `${(index % 9) * 45}ms` } as CSSProperties}>
      <Link to={targetUrl} className="shop-card-image">
        <span className="product-tag">{product.variants.length > 1 ? `${product.variants.length} Renk` : activeVariant?.renk}</span>
        {mainImg && (
          <img
            src={mainImg.thumb}
            alt={mainImg.alt}
            width={mainImg.width}
            height={mainImg.height}
            className="primary-card-img"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
          />
        )}
        {hoverImg && (
          <img
            src={hoverImg.thumb}
            alt=""
            width={hoverImg.width}
            height={hoverImg.height}
            className="secondary-card-img"
            loading="lazy"
            aria-hidden="true"
          />
        )}
        <div className="card-action">
          İncele &amp; Renk Seç <Icon name="arrow" />
        </div>
      </Link>
      <div className="shop-card-info">
        <div>
          <p>{primaryCat?.name || product.productType}</p>
          <h3 className="shop-card-title">
            <Link to={targetUrl}>{product.name}</Link>
          </h3>
          <div className="card-meta-row">
            {product.variants.length > 1 ? (
              <div className="card-swatch-dots" role="group" aria-label="Renk seçenekleri">
                {product.variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.sku}
                    className={`card-swatch-dot ${variant.renkSlug === activeVariant.renkSlug ? 'active' : ''}`}
                    onClick={() => setSelectedVariantSlug(variant.renkSlug)}
                    title={variant.renk}
                    aria-label={`${product.modelName} - ${variant.renk}`}
                  >
                    <i style={{ background: variant.colorHex }} />
                  </button>
                ))}
              </div>
            ) : (
              <span className="card-color-chip">
                <i style={{ background: activeVariant?.colorHex || '#8C4319' }} />
                {activeVariant?.renk}
              </span>
            )}
            {product.personalization.isimYazdirma && (
              <span className="custom-perk-hint">✦ Ücretsiz İsim Baskısı</span>
            )}
          </div>
        </div>
        {formattedPrice ? (
          <strong>{formattedPrice}</strong>
        ) : (
          <span className="card-price-pending">Fiyat Güncelleniyor</span>
        )}
      </div>
    </article>
  )
}

/* =========================================================================
   LIVE LEATHER EMBOSSING STUDIO (Preserved User Design)
   ========================================================================= */
function EmbossingStudio() {
  const [name, setName] = useState('BURAYA İSİM GİRİNİZ')
  const [leatherColor, setLeatherColor] = useState<'cognac' | 'chestnut' | 'olive' | 'black'>('cognac')

  const leatherPalette = {
    cognac: { name: 'Konyak Taba', bg: '#96481e', stitch: '#cf9872', isDark: false },
    chestnut: { name: 'Antik Kestane', bg: '#4e281c', stitch: '#9c6f5d', isDark: true },
    olive: { name: 'Zeytin Yeşili', bg: '#3e4233', stitch: '#868c73', isDark: true },
    black: { name: 'Gece Siyahı', bg: '#1c1b1a', stitch: '#42413e', isDark: true },
  }

  const selected = leatherPalette[leatherColor]

  return (
    <section className="embossing-studio-section" id="kisisellestir">
      <div className="studio-header">
        <p className="overline">İsteğe Bağlı Kişiselleştirme Atölyesi</p>
        <h2>
          Cüzdanınıza ruh katın:<br />
          <em>Adınız deriye kazınsın.</em>
        </h2>
        <p>
          Elon Leather atölyesinde seçili hakiki deri cüzdan, kartlık ve aksesuarlara sıcak gofraj baskıyla isminizi
          veya baş harflerinizi işleyebilirsiniz.
        </p>
      </div>

      <div className="studio-workbench">
        <div
          className={`leather-swatch-display ${selected.isDark ? 'is-dark' : ''}`}
          style={{ background: selected.bg }}
        >
          <div className="leather-grain-overlay" />
          <div className="leather-hand-stitching" style={{ borderColor: selected.stitch }} />

          <div className="swatch-brand-stamp">
            <img
              src="/assets/elon-mark.png"
              alt="ELON LEATHER"
              width={38}
              height={38}
              loading="lazy"
              className="swatch-el-mark"
            />
            <div className="swatch-brand-info">
              <span className="swatch-brand-name">ELON LEATHER</span>
              <span className="swatch-brand-sub">EL DİKİMİ ATELIER</span>
            </div>
          </div>

          <div className="swatch-corner-emboss">
            <div className="embossed-name-output style-blind">
              {name.trim() ? name.toUpperCase() : 'BURAYA İSİM GİRİNİZ'}
            </div>
          </div>
        </div>

        <div className="studio-controls">
          <div className="emboss-input-group">
            <div className="emboss-input-header">
              <label htmlFor="custom-name-input">Deriye İşlenecek İsim veya Baş Harfler</label>
              <span className="emboss-input-badge">✦ Ücretsiz İsim Baskısı</span>
            </div>

            <div className="emboss-input-box">
              <svg viewBox="0 0 24 24" className="emboss-input-icon" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>

              <input
                id="custom-name-input"
                type="text"
                maxLength={siteConfig.personalizationDefaults.maxNameLength}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Buraya isim giriniz..."
                className="emboss-text-field"
                autoComplete="off"
                spellCheck="false"
              />

              <div className="emboss-input-actions">
                {name.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setName('')}
                    className="emboss-clear-btn"
                    title="Temizle"
                    aria-label="Metni temizle"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                <span className="emboss-char-count">
                  {name.length}/{siteConfig.personalizationDefaults.maxNameLength}
                </span>
              </div>
            </div>

            <p className="emboss-input-hint">
              <strong>✦ Canlı Önizleme:</strong> Buraya yazdığınız isim soldaki deriye anında sıcak gofrajla yansıtılır.
            </p>
          </div>

          <div className="leather-color-group">
            <span className="leather-color-header">Deri Tonunu Önizleyin</span>
            <div className="leather-color-buttons">
              {(Object.keys(leatherPalette) as (keyof typeof leatherPalette)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`color-btn ${leatherColor === key ? 'active' : ''}`}
                  onClick={() => setLeatherColor(key)}
                >
                  <i style={{ background: leatherPalette[key].bg }} />
                  <span>{leatherPalette[key].name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="studio-cta-wrap">
            <Link to="/cuzdan-kartlik/" className="primary-link">
              Bu Baskıyla Bir Ürün Seçin <Icon name="arrow" />
            </Link>
            <p className="studio-note">
              * Seçtiğiniz ürünün sayfasında isminizi belirtebilir; Rio Boss modelinde logo veya görsel baskı seçeneğini tercih edebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
   HOMEPAGE (/)
   ========================================================================= */
const FEATURED_MODEL_SLUGS = [
  'rio-boss-miknatisli-deri-cuzdan',
  'rio-miknatisli-deri-cuzdan',
  'duo-klasik-deri-cuzdan',
  'wonder-ince-deri-kartlik',
  'elegant-deri-el-cantasi',
  'atlas-deri-omuz-cantasi',
]

export function HomePage() {
  const { addToCart } = useOutletContext<StoreContext>()

  const homeSeo = useMemo(() => {
    const heroProduct = getProductBySlug('rio-boss-miknatisli-deri-cuzdan') || products[0]
    return buildHomeSeo(siteConfig, heroProduct?.variants[0]?.images[0])
  }, [])
  useDocumentSeo(homeSeo)

  const featuredProducts = useMemo(() => {
    return FEATURED_MODEL_SLUGS.map((slug) => getProductBySlug(slug)).filter(
      (p): p is ProductRecord => Boolean(p)
    )
  }, [])

  return (
    <main>
      <AppleHero onAddToCart={(product, variant) => addToCart(product, variant, 1)} />

      {/* Category Grid covering all 9 active product sub-categories */}
      <section className="category-runway" id="koleksiyon">
        <header className="category-runway-head">
          <div>
            <p className="overline">Koleksiyonlar · {products.length} Özgün Seri</p>
            <h2>Her yolculuk için bir Elon Leather.</h2>
          </div>
          <Link to="/cuzdan-kartlik/" className="category-runway-all">
            Tüm Koleksiyon <Icon name="arrow" />
          </Link>
        </header>
        <div className="category-cards-grid">
          {subCategories.map((category) => {
            const catProducts = getProductsByCategory(category.slug)
            const variantTotal = catProducts.reduce((sum, p) => sum + p.variants.length, 0)
            return (
              <Link to={`/${category.slug}/`} className="category-card" key={category.slug}>
                <div className="category-card-body">
                  <div>
                    <h3>{category.name}</h3>
                    <p className="category-card-count">
                      {catProducts.length} Model · {variantTotal} Renk
                    </p>
                  </div>
                  <span className="category-card-cta">
                    Keşfet <Icon name="arrow" />
                  </span>
                </div>
                <div className="category-card-media">
                  <img
                    src={bannerToThumb(category.bannerImage)}
                    alt={category.name}
                    width={600}
                    height={600}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <EmbossingStudio />

      {/* Featured Products */}
      <section className="new-arrivals">
        <header className="split-heading">
          <div>
            <p className="overline">Atölye Seçkisi</p>
            <h2>Öne Çıkan Deri Tasarımlar</h2>
          </div>
          <Link to="/cuzdan-kartlik/">
            Tüm Cüzdan &amp; Kartlıklar <Icon name="arrow" />
          </Link>
        </header>
        <div className="editorial-grid">
          {featuredProducts.map((product, index) => (
            <ProductCard product={product} index={index} key={product.slug} />
          ))}
        </div>
      </section>

      {/* Authentic Craft Editorial Band */}
      <section className="craft-band">
        <div className="craft-mark">
          <img src="/assets/elon-mark.png" alt="ELON LEATHER" width={105} height={105} loading="lazy" />
        </div>
        <div className="craft-band-image">
          <img
            src="/assets/elon-craft-editorial.webp"
            alt="El yapımı hakiki deri cüzdan taşıyan Elon Leather stil portresi"
            width={990}
            height={1080}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="craft-band-copy">
          <p className="overline">Derinin Hafızası</p>
          <h2>
            Her dikiş,<br />
            <em>sizinle yaşayan bir form.</em>
          </h2>
          <p>
            Doğal dokulu hakiki deriler zamanı gizlemez. Cebinizdeki formunu, günlük temaslarınızı ve yaptığınız
            yolculukları yüzeyindeki benzersiz patinada saklar.
          </p>
          <div className="craft-details-checklist">
            <span>✓ %100 el yapımı hakiki deri gövde ve özenli dikiş</span>
            <span>✓ Cüzdan, kartlık, pasaportluk, çanta ve küçük deri aksesuar seçkisi</span>
            <span>✓ İsteğe bağlı sıcak gofraj isim baskısı (Rio Boss’ta ek logo ve görsel)</span>
          </div>
          <Link to="/hikayemiz/">
            Hikâyemizi &amp; Zanaatımızı Keşfedin <Icon name="arrow" />
          </Link>
        </div>
      </section>

      {/* Honest Service Pillars (Zero unconfirmed claims) */}
      <section className="service-strip">
        <div>
          <span>01</span>
          <h3>İsteğe Bağlı İsim Baskısı</h3>
          <p>Koleksiyondaki tüm modellerde deriye sıcak gofraj baskıyla ücretsiz isim işlenebilir.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Doğal Hakiki Deri</h3>
          <p>Her seri, günlük kullanım alışkanlıklarına göre el işçiliğiyle üretilen hakiki derilerden oluşur.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Model Bazlı Şeffaf Varyantlar</h3>
          <p>Her model tek sayfada gerçek renk seçenekleriyle sunulur; yalnızca doğrulanan teknik veriler paylaşılır.</p>
        </div>
      </section>
    </main>
  )
}

/* =========================================================================
   CATEGORY PAGE (/:slug/) — Supports all 3 parents + 9 sub-categories
   ========================================================================= */
export function CategoryPage() {
  const { slug = '' } = useParams()
  const category = getCategoryBySlug(slug)
  const parentCategory = category ? getParentCategory(category) : undefined

  const [sort, setSort] = useState<'onerilen' | 'artan' | 'azalan' | 'alfabetik'>('onerilen')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setSearchQuery('')
    setSort('onerilen')
  }, [slug])

  const baseItems = useMemo(() => {
    if (!category) return []
    return getProductsByCategory(category.slug)
  }, [category])

  const childCategories = useMemo(() => {
    if (!category) return []
    return getChildCategories(category.slug)
  }, [category])

  const siblingCategories = useMemo(() => {
    if (!category || !category.parentSlug) return []
    return getChildCategories(category.parentSlug)
  }, [category])

  const relatedCategories = useMemo(() => {
    if (!category) return []
    return category.relatedSlugs
      .map((s) => getCategoryBySlug(s))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
  }, [category])

  const seoPayload = useMemo(() => {
    if (!category) return buildNotFoundSeo(siteConfig)
    return buildCategorySeo(siteConfig, category, parentCategory, baseItems)
  }, [category, parentCategory, baseItems])

  useDocumentSeo(seoPayload)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR')
    if (!q) return baseItems
    return baseItems.filter((prod) => {
      const modelHit =
        prod.name.toLocaleLowerCase('tr-TR').includes(q) ||
        prod.modelName.toLocaleLowerCase('tr-TR').includes(q) ||
        prod.productType.toLocaleLowerCase('tr-TR').includes(q)
      const colorHit = prod.variants.some((v) => v.renk.toLocaleLowerCase('tr-TR').includes(q))
      return modelHit || colorHit
    })
  }, [baseItems, searchQuery])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'artan') {
      return list.sort((a, b) => {
        const pa = getProductStartingPrice(a) ?? Number.MAX_SAFE_INTEGER
        const pb = getProductStartingPrice(b) ?? Number.MAX_SAFE_INTEGER
        return pa - pb
      })
    }
    if (sort === 'azalan') {
      return list.sort((a, b) => {
        const pa = getProductStartingPrice(a) ?? -1
        const pb = getProductStartingPrice(b) ?? -1
        return pb - pa
      })
    }
    if (sort === 'alfabetik') {
      return list.sort((a, b) => a.modelName.localeCompare(b.modelName, 'tr-TR'))
    }
    return list
  }, [filtered, sort])

  if (!category) {
    return <NotFound />
  }

  const totalVariants = baseItems.reduce((sum, p) => sum + p.variants.length, 0)
  const navPillCategories = childCategories.length > 0 ? childCategories : siblingCategories

  return (
    <main className="category-page">
      <section className="category-intro">
        <nav className="breadcrumb" aria-label="İçerik Haritası">
          <Link to="/">Ana Sayfa</Link>
          {parentCategory && (
            <>
              {' / '}
              <Link to={`/${parentCategory.slug}/`}>{parentCategory.name}</Link>
            </>
          )}
          {' / '}
          <span aria-current="page">{category.name}</span>
        </nav>

        <p className="overline">
          {String(sorted.length).padStart(2, '0')} Model · {totalVariants} Renk Alternatifi
        </p>
        <h1>{category.h1}</h1>
        <p className="category-short-intro">{category.shortIntro}</p>
      </section>

      {/* Crawl-friendly Internal Category Pills + Filter Toolbar */}
      <div className="shop-toolbar">
        <div className="category-pills" role="navigation" aria-label="İlgili kategoriler">
          {parentCategory && (
            <Link to={`/${parentCategory.slug}/`} className="pill-link">
              Tüm {parentCategory.name}
            </Link>
          )}
          {navPillCategories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/${cat.slug}/`}
              className={`pill-link ${cat.slug === category.slug ? 'active' : ''}`}
            >
              {cat.name} ({getProductsByCategory(cat.slug).length})
            </Link>
          ))}
        </div>

        <div className="toolbar-controls">
          <div className="catalog-search-box">
            <Icon name="search" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Model veya renk ara..."
              aria-label="Kategori içinde ara"
            />
          </div>

          <label className="sort-label">
            Sırala
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="onerilen">Önerilen Sıralama</option>
              <option value="artan">Fiyat: Düşükten Yükseğe</option>
              <option value="azalan">Fiyat: Yüksekten Düşüğe</option>
              <option value="alfabetik">Model Adı (A-Z)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Product Grid */}
      <section aria-labelledby="catalog-section-heading">
        <h2 id="catalog-section-heading" className="catalog-section-heading">
          {category.name} Koleksiyonu Modelleri
        </h2>
        {sorted.length === 0 ? (
          <div className="empty-catalog-state">
            <p className="overline">Sonuç Bulunamadı</p>
            <p className="empty-catalog-copy">Aramanızla eşleşen bir deri model bulunamadı.</p>
            <button type="button" onClick={() => setSearchQuery('')}>
              Aramayı Temizle
            </button>
          </div>
        ) : (
          <div className="catalog-grid">
            {sorted.map((product, index) => (
              <ProductCard
                product={product}
                index={index}
                eager={index < 2}
                key={product.slug}
              />
            ))}
          </div>
        )}
      </section>

      {/* SEO Editorial Buying Guide */}
      <section className="category-guide-band" aria-labelledby="category-guide-heading">
        <div className="category-guide-header">
          <p className="overline">Satın Alma Rehberi</p>
          <h2 id="category-guide-heading">{category.name} Seçerken Dikkat Edilmesi Gerekenler</h2>
        </div>
        <div className="category-guide-grid">
          {category.seoGuideSections.map((sec) => (
            <article key={sec.heading} className="category-guide-card">
              <h3>{sec.heading}</h3>
              {sec.paragraphs.map((paragraph, pIdx) => (
                <p key={pIdx}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </section>

      {/* Visible Category FAQ Section (No FAQPage schema) */}
      {category.faq.length > 0 && (
        <section className="category-faq-band" aria-labelledby="category-faq-heading">
          <div className="category-faq-header">
            <p className="overline">Merak Edilenler</p>
            <h2 id="category-faq-heading">{category.name} Hakkında Sık Sorulan Sorular</h2>
          </div>
          <div className="faq-accordion-list">
            {category.faq.map((item) => (
              <details key={item.question} className="faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Contextual Internal Links */}
      <section className="internal-links-band" aria-label="Diğer kategoriler">
        <p className="overline">İlgili Kategoriler</p>
        <div className="internal-links-row">
          {parentCategory && (
            <Link to={`/${parentCategory.slug}/`} className="internal-link-chip">
              {parentCategory.name} →
            </Link>
          )}
          {relatedCategories.map((rel) => (
            <Link key={rel.slug} to={`/${rel.slug}/`} className="internal-link-chip">
              {rel.name} →
            </Link>
          ))}
          <Link to="/hikayemiz/" className="internal-link-chip">
            Elon Leather Hikâyesi →
          </Link>
        </div>
      </section>
    </main>
  )
}

/* =========================================================================
   PRODUCT DETAIL PAGE (/urun/:slug/?renk=...)
   ========================================================================= */
export function ProductPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart } = useOutletContext<StoreContext>()

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  const product = getProductBySlug(slug)
  const colorParam = hydrated ? searchParams.get('renk') : null
  const activeVariant = product ? getActiveVariant(product, colorParam) : undefined
  const primaryCat = product ? getCategoryBySlug(product.primaryCategory) : undefined
  const parentCat = primaryCat ? getParentCategory(primaryCat) : undefined

  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wantsEngraving, setWantsEngraving] = useState(false)
  const [engravingText, setEngravingText] = useState('')
  const [personalizationAddon, setPersonalizationAddon] = useState<PersonalizationAddon>('none')

  useEffect(() => {
    setActiveImgIdx(0)
  }, [slug, activeVariant?.renkSlug])

  useEffect(() => {
    setQuantity(1)
    setWantsEngraving(false)
    setEngravingText('')
    setPersonalizationAddon('none')
  }, [slug])

  const seoPayload = useMemo(() => {
    if (!product || !activeVariant || !primaryCat) {
      return buildNotFoundSeo(siteConfig)
    }
    return buildProductSeo(
      siteConfig,
      product,
      activeVariant,
      primaryCat,
      parentCat,
      Boolean(colorParam)
    )
  }, [product, activeVariant, primaryCat, parentCat, colorParam])

  useDocumentSeo(seoPayload)

  const related = useMemo(() => {
    if (!product) return []
    const explicitlyRelated = product.relatedProducts
      .map((s) => getProductBySlug(s))
      .filter((p): p is ProductRecord => Boolean(p))
    if (explicitlyRelated.length >= 3) return explicitlyRelated.slice(0, 3)
    const fallback = products.filter(
      (p) => p.slug !== product.slug && !explicitlyRelated.some((r) => r.slug === p.slug)
    )
    return [...explicitlyRelated, ...fallback].slice(0, 3)
  }, [product])

  if (!product || !activeVariant) {
    return <NotFound />
  }

  const images = activeVariant.images
  const safeImgIdx = activeImgIdx < images.length ? activeImgIdx : 0
  const currentImage = images[safeImgIdx]

  const hasNumericPrice = typeof activeVariant.price === 'number'
  const addonExtra = getAddonExtraPrice(product, personalizationAddon)
  const unitPrice = hasNumericPrice ? (activeVariant.price as number) + addonExtra : null
  const totalButtonPrice = unitPrice !== null ? formatPrice(unitPrice * quantity) : null

  const hasLogoOption = product.personalization.logoEkleme
  const hasImageOption = product.personalization.gorselBaski
  const logoExtraTry =
    product.personalization.logoExtraPrice ?? siteConfig.personalizationDefaults.logoAdditionExtraTry
  const imageExtraTry =
    product.personalization.imageExtraPrice ?? siteConfig.personalizationDefaults.imagePrintExtraTry
  const maxNameChars = siteConfig.personalizationDefaults.maxNameLength

  // Technical spec rows: omit every field marked "TODO" so "TODO" NEVER renders
  const specRows: Array<{ label: string; value: string }> = [
    { label: 'Model', value: product.modelName },
    { label: 'Ürün Tipi', value: product.productType },
    { label: 'Deri Rengi', value: activeVariant.renk },
    { label: 'Ürün Kodu (SKU)', value: activeVariant.sku },
    { label: 'Malzeme', value: product.specs.malzeme },
    { label: 'Üretim', value: product.specs.uretim },
    { label: 'Ölçü / Boyut', value: product.specs.boyut },
    { label: 'Kart Kapasitesi', value: product.specs.kartKapasitesi },
    { label: 'Banknot Bölmesi', value: product.specs.banknotBolmesi },
    { label: 'Kapama / Kilit Tipi', value: product.specs.kapama },
    { label: 'Ek Not', value: product.exactNameNote || '' },
  ].filter((row) => isConfiguredValue(row.value))

  const handleVariantSelect = (variant: ProductVariantRecord) => {
    if (variant.renkSlug === activeVariant.renkSlug) return
    if (variant.renkSlug === product.variants[0]?.renkSlug) {
      setSearchParams({})
    } else {
      setSearchParams({ renk: variant.renkSlug })
    }
  }

  const handleAdd = () => {
    if (!hasNumericPrice) return
    addToCart(
      product,
      activeVariant,
      quantity,
      wantsEngraving ? engravingText : '',
      personalizationAddon
    )
  }

  const longParagraphs = product.longDescription
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <main className="product-main">
      <div className="product-page">
        {/* Gallery Column */}
        <div
          className="product-gallery"
          tabIndex={images.length > 1 ? 0 : undefined}
          onKeyDown={(e) => {
            if (images.length <= 1) return
            if (e.key === 'ArrowRight') {
              setActiveImgIdx((i) => (i + 1) % images.length)
            } else if (e.key === 'ArrowLeft') {
              setActiveImgIdx((i) => (i - 1 + images.length) % images.length)
            }
          }}
        >
          <div className="gallery-stage">
            {currentImage && (
              <picture>
                {safeImgIdx === 0 && (
                  <source media="(max-width: 768px)" srcSet={currentImage.thumb} />
                )}
                <img
                  src={currentImage.full}
                  alt={currentImage.alt}
                  width={currentImage.width}
                  height={currentImage.height}
                  loading={safeImgIdx === 0 ? 'eager' : 'lazy'}
                  decoding={safeImgIdx === 0 ? 'sync' : 'async'}
                  fetchPriority={safeImgIdx === 0 ? 'high' : undefined}
                />
              </picture>
            )}

            {images.length > 1 && (
              <div className="gallery-nav-controls">
                <button
                  type="button"
                  aria-label="Önceki görsel"
                  onClick={() => setActiveImgIdx((i) => (i - 1 + images.length) % images.length)}
                >
                  ‹
                </button>
                <span>
                  {safeImgIdx + 1} / {images.length}
                </span>
                <button
                  type="button"
                  aria-label="Sonraki görsel"
                  onClick={() => setActiveImgIdx((i) => (i + 1) % images.length)}
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((img, idx) => (
                <button
                  type="button"
                  key={img.full}
                  className={safeImgIdx === idx ? 'active' : ''}
                  onClick={() => setActiveImgIdx(idx)}
                  aria-label={`${product.modelName} görsel ${idx + 1}`}
                >
                  <img
                    src={img.thumb}
                    alt=""
                    width={img.width}
                    height={img.height}
                    loading="lazy"
                    fetchPriority="low"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Purchase Column */}
        <section className="product-purchase">
          <nav className="breadcrumb" aria-label="İçerik Haritası">
            <Link to="/">Ana Sayfa</Link>
            {parentCat && (
              <>
                {' / '}
                <Link to={`/${parentCat.slug}/`}>{parentCat.name}</Link>
              </>
            )}
            {primaryCat && (
              <>
                {' / '}
                <Link to={`/${primaryCat.slug}/`}>{primaryCat.name}</Link>
              </>
            )}
          </nav>

          <p className="overline">
            {primaryCat?.name || product.productType} · SKU {activeVariant.sku}
          </p>
          <h1>
            {product.modelName} {product.productType} - {activeVariant.renk}
          </h1>

          {unitPrice !== null ? (
            <strong className="detail-price">{formatPrice(unitPrice)}</strong>
          ) : (
            <p className="price-pending-banner">
              Fiyat ve teknik ölçü bilgileri atölyemiz tarafından güncellenmektedir.
            </p>
          )}

          <p className="product-description">{product.shortDescription}</p>

          {/* Variant Color Switcher */}
          <div className="option-block">
            <div className="option-label">
              <span>
                Deri Rengi {product.variants.length > 1 ? `(${product.variants.length} Seçenek)` : ''}
              </span>
              <strong>{activeVariant.renk}</strong>
            </div>
            <div className="swatches">
              {product.variants.map((variant) => (
                <button
                  type="button"
                  key={variant.sku}
                  className={variant.renkSlug === activeVariant.renkSlug ? 'active' : ''}
                  onClick={() => handleVariantSelect(variant)}
                  title={variant.renk}
                  aria-label={`${product.modelName} ${variant.renk}`}
                >
                  <i style={{ background: variant.colorHex }} />
                </button>
              ))}
            </div>
          </div>

          {/* Personalization Controls */}
          {product.personalization.isimYazdirma && (
            <div className="personalization-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={wantsEngraving}
                  onChange={(e) => setWantsEngraving(e.target.checked)}
                />
                <div>
                  <strong>Ücretsiz İsim / Baş Harf Baskısı Ekle</strong>
                  <small>Sıcak gofraj presiyle deriye işlenir (+0 TL)</small>
                </div>
              </label>

              {wantsEngraving && (
                <div className="personalization-inputs">
                  <div className="p-input-field">
                    <label htmlFor="p-text">
                      Yazılacak İsim veya Baş Harfler (Maks {maxNameChars})
                    </label>
                    <input
                      id="p-text"
                      type="text"
                      maxLength={maxNameChars}
                      value={engravingText}
                      onChange={(e) => setEngravingText(e.target.value)}
                      placeholder="Örn: OĞUZ OLGUN"
                    />
                  </div>
                </div>
              )}

              {(hasLogoOption || hasImageOption) && (
                <fieldset className="p-addon-fieldset">
                  <legend>Ek Baskı Seçeneği</legend>
                  <div className="p-addon-options">
                    <label className={`p-addon-opt ${personalizationAddon === 'none' ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="personalizationAddon"
                        checked={personalizationAddon === 'none'}
                        onChange={() => setPersonalizationAddon('none')}
                      />
                      <span>Yalnızca İsim Baskısı (+0 TL)</span>
                    </label>
                    {hasLogoOption && (
                      <label className={`p-addon-opt ${personalizationAddon === 'logo' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="personalizationAddon"
                          checked={personalizationAddon === 'logo'}
                          onChange={() => setPersonalizationAddon('logo')}
                        />
                        <span>Özel Logo Ekleme (+{logoExtraTry} TL)</span>
                      </label>
                    )}
                    {hasImageOption && (
                      <label className={`p-addon-opt ${personalizationAddon === 'image' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="personalizationAddon"
                          checked={personalizationAddon === 'image'}
                          onChange={() => setPersonalizationAddon('image')}
                        />
                        <span>Görsel Baskı (+{imageExtraTry} TL)</span>
                      </label>
                    )}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {/* Purchase Row */}
          {hasNumericPrice ? (
            <div className="buy-row">
              <div className="quantity">
                <button
                  type="button"
                  aria-label="Adet azalt"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Icon name="minus" />
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label="Adet artır"
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Icon name="plus" />
                </button>
              </div>
              <button type="button" className="add-cart" onClick={handleAdd}>
                <span>Sepete Ekle</span>
                <strong>{totalButtonPrice}</strong>
              </button>
            </div>
          ) : (
            <div className="buy-row-pending">
              <a
                href={`mailto:${siteConfig.email}?subject=${encodeURIComponent(`${product.modelName} Hakkında Bilgi Talebi`)}`}
                className="add-cart add-cart-inquiry"
              >
                <span>Atölyeden Bilgi &amp; Stok Sor</span>
                <Icon name="arrow" />
              </a>
            </div>
          )}

          {/* Optional Configured Central Site Notices (hidden when "TODO") */}
          {(isConfiguredValue(siteConfig.shippingSummary) ||
            isConfiguredValue(siteConfig.returnPolicy)) && (
            <div className="pdp-policy-notes">
              {isConfiguredValue(siteConfig.shippingSummary) && (
                <p>{siteConfig.shippingSummary}</p>
              )}
              {isConfiguredValue(siteConfig.returnPolicy) && <p>{siteConfig.returnPolicy}</p>}
            </div>
          )}

          <p className="stock-note">
            <i /> {activeVariant.inStock ? 'Sipariş üzerine hazırlanır' : 'Stok bilgisi güncelleniyor'} · {product.variants.length} Renk Seçeneği
          </p>
        </section>
      </div>

      {/* Below-Fold Deep SEO & Product Specs Architecture */}
      <section className="product-deep-sections">
        <div className="product-deep-grid">
          <article className="product-deep-card">
            <p className="overline">Model Hikâyesi</p>
            <h2>{product.modelName} Tasarım ve Kullanım Detayları</h2>
            {longParagraphs.map((paragraph, idx) => (
              <p key={idx} className="product-long-paragraph">
                {paragraph}
              </p>
            ))}
          </article>

          <article className="product-deep-card">
            <p className="overline">Özellikler &amp; Ölçüler</p>
            <h2>Öne Çıkan Özellikler</h2>
            <ul className="pdp-features-list">
              {product.features.map((feat) => (
                <li key={feat}>
                  <Icon name="check" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <h3 className="pdp-specs-subheading">Teknik Özellikler</h3>
            <dl className="pdp-specs-list">
              {specRows.map((row) => (
                <div key={row.label} className="pdp-spec-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>

        <article className="product-care-band">
          <div>
            <p className="overline">Uzun Ömürlü Kullanım</p>
            <h2>Deri Bakım Talimatları</h2>
          </div>
          <ul className="pdp-features-list" style={{ margin: 0 }}>
            {product.careInstructions.map((tip) => (
              <li key={tip}>
                <Icon name="check" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </article>

        {product.faq.length > 0 && (
          <section className="product-faq-section" aria-labelledby="pdp-faq-heading">
            <div className="category-faq-header">
              <p className="overline">Ürün Hakkında</p>
              <h2 id="pdp-faq-heading">Sık Sorulan Sorular</h2>
            </div>
            <div className="faq-accordion-list">
              {product.faq.map((item) => (
                <details key={item.question} className="faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </section>

      {related.length > 0 && (
        <section className="related">
          <header className="split-heading">
            <div>
              <p className="overline">Birlikte Tercih Edilenler</p>
              <h2>Tamamlayıcı Modeller</h2>
            </div>
            {primaryCat && (
              <Link to={`/${primaryCat.slug}/`}>
                {primaryCat.name} Kategorisi <Icon name="arrow" />
              </Link>
            )}
          </header>
          <div className="catalog-grid">
            {related.map((item, index) => (
              <ProductCard product={item} index={index} key={item.slug} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky CTA Bar (Only rendered cleanly when priced) */}
      {hasNumericPrice && totalButtonPrice && (
        <div className="mobile-sticky-cta" role="region" aria-label="Hızlı Sepet Ekleme">
          <div className="mobile-sticky-meta">
            <strong>{product.modelName}</strong>
            <span>
              {activeVariant.renk} · {totalButtonPrice}
            </span>
          </div>
          <button type="button" className="mobile-sticky-btn" onClick={handleAdd}>
            Sepete Ekle
          </button>
        </div>
      )}
    </main>
  )
}

/* =========================================================================
   BRAND STORY PAGE (/hikayemiz/)
   ========================================================================= */
export function BrandStoryPage() {
  const storySeo = useMemo(() => buildStorySeo(siteConfig), [])
  useDocumentSeo(storySeo)

  return (
    <main className="story-page">
      <section className="story-hero">
        <nav className="breadcrumb" aria-label="İçerik Haritası">
          <Link to="/">Ana Sayfa</Link> / <span aria-current="page">Hikâyemiz</span>
        </nav>
        <p className="overline">Elon Leather Atölyesi</p>
        <h1>
          Sadelik, doğal deri ve<br />
          <em>günlük yaşamın ritmi.</em>
        </h1>
        <p className="story-lead">
          Elon Leather, cebinizde ve çantanızda her gün taşıdığınız eşyaları zamansız hakiki deri formlarla yeniden
          yorumlamak için doğdu. Her model abartıdan uzak, işlevsel ve yıllar içinde patina kazanan bir karakter taşır.
        </p>
      </section>

      <section className="story-pillars">
        <article className="story-card">
          <span>01</span>
          <h2>Malzeme Odaklı Üretim</h2>
          <p>
            Koleksiyondaki cüzdan, kartlık, pasaportluk ve çantalar yalnızca hakiki deriden üretilir. Doğal damarlı
            yüzeylerin zamanla kullanıcı alışkanlıklarına göre şekillenmesini ve ton derinliği kazanmasını önceliklendiriyoruz.
          </p>
        </article>
        <article className="story-card">
          <span>02</span>
          <h2>Model Başına Tek Standart</h2>
          <p>
            Aynı modelin renk seçeneklerini dağınık sayfalar yerine tek bir merkezî ürün sayfasında topluyoruz. Taba,
            koyu taba, siyah, koyu mavi ve zeytin karası tonlarını doğrudan model sayfasından kıyaslayabilirsiniz.
          </p>
        </article>
        <article className="story-card">
          <span>03</span>
          <h2>Kişiye Özel Dokunuş</h2>
          <p>
            Sıcak gofraj baskı uygulamasıyla tüm ürünlere ücretsiz isim veya baş harf işleyebiliyoruz. Seçili Rio Boss
            serisinde ayrıca isteğe bağlı logo veya görsel baskı seçenekleri sunulur.
          </p>
        </article>
      </section>

      <section className="story-directory-cta">
        <div>
          <p className="overline">Koleksiyonları Keşfedin</p>
          <h2>Tüm Ana Kategoriler</h2>
        </div>
        <div className="story-links-row">
          {parentCategories.map((cat) => (
            <Link key={cat.slug} to={`/${cat.slug}/`} className="apple-btn-secondary">
              {cat.name} ({getProductsByCategory(cat.slug).length}) →
            </Link>
          ))}
          <Link to="/#kisisellestir" className="apple-btn-primary">
            İsim Baskısı Önizle
          </Link>
        </div>
      </section>
    </main>
  )
}

/* =========================================================================
   NOT FOUND (404.html)
   ========================================================================= */
export function NotFound() {
  const notFoundSeo = useMemo(() => buildNotFoundSeo(siteConfig), [])
  useDocumentSeo(notFoundSeo)

  return (
    <main className="not-found">
      <p className="overline">404</p>
      <h1>Bu parça atölyede bulunamadı.</h1>
      <p className="not-found-desc">
        Aradığınız sayfa taşınmış veya katalog kapsamından çıkarılmış olabilir. Ana koleksiyonlara aşağıdan ulaşabilirsiniz.
      </p>
      <div className="not-found-actions">
        <Link to="/" className="apple-btn-primary">
          Ana Sayfaya Dön <Icon name="arrow" />
        </Link>
        {parentCategories.map((cat) => (
          <Link key={cat.slug} to={`/${cat.slug}/`} className="apple-btn-secondary">
            {cat.name}
          </Link>
        ))}
      </div>
    </main>
  )
}

/* =========================================================================
   FOOTER
   ========================================================================= */
function Footer() {
  const [subscribed, setSubscribed] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubscribed(true)
  }

  return (
    <footer className="apple-footer">
      <div className="apple-footer-inner">
        <div className="footer-newsletter">
          <p className="overline">Elon Leather Bülten</p>
          <h2>
            Dünyaları<br />
            <em>birlikte taşıyalım.</em>
          </h2>
          <form onSubmit={submit}>
            <input
              type="email"
              required
              placeholder="E-posta adresinizi bırakın..."
              aria-label="E-posta adresiniz"
            />
            <button type="submit" aria-label="Kaydol">
              <Icon name="arrow" />
            </button>
          </form>
          {subscribed && (
            <p className="footer-newsletter-confirm">
              İlginiz için teşekkürler. Yeni atölye serileri duyuruldukça paylaşacağız.
            </p>
          )}
        </div>

        <div className="footer-directory">
          <div className="footer-dir-brand">
            <Logo light />
            <p>
              El yapımı hakiki deri cüzdanlar, ince kartlıklar, çantalar ve kişiselleştirilebilir günlük deri aksesuarlar.
            </p>
          </div>

          <div className="footer-dir-col">
            <h3>Kategoriler</h3>
            {parentCategories.map((cat) => (
              <Link to={`/${cat.slug}/`} key={cat.slug}>
                {cat.name}
              </Link>
            ))}
            <Link to="/miknatisli-deri-cuzdan/">Mıknatıslı Deri Cüzdan</Link>
            <Link to="/klasik-deri-cuzdan/">Klasik Deri Cüzdan</Link>
            <Link to="/ince-deri-kartlik/">İnce Deri Kartlık</Link>
            <Link to="/deri-pasaportluk/">Pasaportluk</Link>
          </div>

          <div className="footer-dir-col">
            <h3>Çanta &amp; Aksesuar</h3>
            <Link to="/deri-el-cantasi/">El Çantası</Link>
            <Link to="/omuz-gogus-cantasi/">Omuz &amp; Göğüs Çantası</Link>
            <Link to="/deri-anahtarlik/">Anahtarlık</Link>
            <Link to="/deri-ajanda-kilifi/">Ajanda Kılıfı</Link>
            <Link to="/deri-bileklik/">Deri Bileklik</Link>
          </div>

          <div className="footer-dir-col">
            <h3>Atölye &amp; Bilgi</h3>
            <Link to="/hikayemiz/">Hikâyemiz</Link>
            <Link to="/#kisisellestir">İsim Baskı Atölyesi</Link>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            {isConfiguredValue(siteConfig.shippingBadgeText) && (
              <span>{siteConfig.shippingBadgeText}</span>
            )}
          </div>
        </div>

        <div className="footer-legal">
          <p>© 2026 ELON LEATHER · El Yapımı Hakiki Deri Atölyesi</p>
          <p>Telif Hakkı Saklıdır.</p>
        </div>
      </div>
    </footer>
  )
}
