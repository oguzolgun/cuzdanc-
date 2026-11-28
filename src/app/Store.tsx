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
import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
  buildAllCategoriesSeo,
  buildCategorySeo,
  buildHomeSeo,
  buildNotFoundSeo,
  buildProductSeo,
  buildStorySeo,
  useDocumentSeo,
} from './seo'
import { HeaderNav } from './HeaderNav'
import { AppleHero } from './AppleHero'
import { Magnetic3DShowcase } from './Magnetic3DShowcase'
import { ProductEditorialSections } from './ProductEditorialSections'

export type PersonalizationAddon = 'none' | 'logo' | 'image'

export type LogoAsset = {
  fileName: string
  previewUrl?: string
}

export type CartItem = {
  product: ProductRecord
  variant: ProductVariantRecord
  quantity: number
  engraving?: string
  personalizationAddon?: PersonalizationAddon
  logoFileName?: string
  logoPreviewUrl?: string
}

export type StoreContext = {
  addToCart: (
    product: ProductRecord,
    variant?: ProductVariantRecord,
    quantity?: number,
    engraving?: string,
    personalizationAddon?: PersonalizationAddon,
    logoAsset?: LogoAsset
  ) => void
  openMenu: () => void
  openCart: () => void
  cartCount: number
  cart: CartItem[]
  subtotal: number
  updateCartQuantity: (index: number, delta: number) => void
  removeCartItem: (index: number) => void
  clearCart: () => void
  buildOrderSummaryMailto: () => string
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

export function getCartUnitPrice(item: CartItem): number | null {
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
      <img src="/assets/elon-logo.png" alt="ELONS LEATHER" width={148} height={92} loading="lazy" />
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
    personalizationAddon: PersonalizationAddon = 'none',
    logoAsset?: LogoAsset
  ) => {
    if (typeof variant.price !== 'number') return
    const normalizedEngraving = engraving.trim().toUpperCase()
    const normalizedFileName = logoAsset?.fileName?.trim() || ''
    setCheckoutSubmitted(false)
    setCart((current) => {
      const match = current.find(
        (item) =>
          item.product.slug === product.slug &&
          item.variant.renkSlug === variant.renkSlug &&
          (item.engraving || '') === normalizedEngraving &&
          (item.personalizationAddon || 'none') === personalizationAddon &&
          (item.logoFileName || '') === normalizedFileName
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
          logoFileName: normalizedFileName || undefined,
          logoPreviewUrl: logoAsset?.previewUrl || undefined,
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

  const updateCartQuantity = (index: number, delta: number) => {
    setCart((current) =>
      current
        .map((item, idx) => (idx === index ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  const removeCartItem = (index: number) => {
    setCart((current) => current.filter((_, idx) => idx !== index))
  }

  const clearCart = () => {
    setCart([])
  }

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
          ? `Özel Logo Baskısı (+150 TL)${item.logoFileName ? ` [${item.logoFileName}]` : ''}`
          : item.personalizationAddon === 'image'
            ? `Özel Görsel Baskı (+300 TL)${item.logoFileName ? ` [${item.logoFileName}]` : ''}`
            : '',
      ].filter(Boolean)
      return `- ${parts.join(' | ')}`
    })
    const subject = encodeURIComponent('Elons Leather Sipariş Talebi')
    const body = encodeURIComponent(
      `Merhaba Elons Leather Atölyesi,\n\nAşağıdaki ürünler hakkında sipariş oluşturmak istiyorum:\n\n${lines.join('\n')}\n\nAra Toplam: ${formatPrice(subtotal) || '-'}\n`
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
          <p className="overline">ELONS LEATHER · KOLEKSİYON DİZİNİ</p>
          <nav aria-label="Mobil Kategori Menüsü">
            {categories.map((category, idx) => {
              const modelCount = getProductsByCategory(category.slug).length
              return (
                <NavLink
                  key={category.slug}
                  to={`/${category.slug}/`}
                  className={category.parentSlug ? 'is-sub-link' : 'is-parent-link'}
                  onClick={() => setMenuOpen(false)}
                >
                  <small>{String(idx + 1).padStart(2, '0')}</small>
                  <span>
                    {category.parentSlug ? `↳ ${category.name}` : category.name} <em>({modelCount})</em>
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
            <Link to="/kategoriler/" onClick={() => setMenuOpen(false)}>
              Tüm Kategoriler
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
            <p className="overline">Elons Leather Atelier</p>
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
                    {item.logoFileName && (
                      <span className="cart-logo-preview-row">
                        {item.logoPreviewUrl && (
                          <img src={item.logoPreviewUrl} alt={item.logoFileName} />
                        )}
                        <span>{item.logoFileName}</span>
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
                <Link
                  to="/sepet/"
                  className="cart-page-link"
                  onClick={() => setCartOpen(false)}
                >
                  Sepet Sayfasını Aç →
                </Link>
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
              cart,
              subtotal,
              updateCartQuantity,
              removeCartItem,
              clearCart,
              buildOrderSummaryMailto,
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
                    <i
                      style={{
                        background: variant.secondaryColorHex
                          ? `linear-gradient(135deg, ${variant.colorHex} 50%, ${variant.secondaryColorHex} 50%)`
                          : variant.colorHex,
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <span className="card-color-chip">
                <i
                  style={{
                    background: activeVariant?.secondaryColorHex
                      ? `linear-gradient(135deg, ${activeVariant.colorHex} 50%, ${activeVariant.secondaryColorHex} 50%)`
                      : activeVariant?.colorHex || '#8C4319',
                  }}
                />
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
   HOMEPAGE (/)
   ========================================================================= */
const FEATURED_MODEL_SLUGS = [
  'lodos-pro-miknatisli-deri-cuzdan',
  'poyraz-miknatisli-deri-cuzdan',
  'lodos-miknatisli-deri-cuzdan',
  'palamar-orgu-kemer',
  'etezyen-klasik-deri-cuzdan',
  'efes-deri-el-cantasi',
]

const FEATURED_CATEGORY_SLUGS = [
  'erkek-deri-cuzdan/miknatisli',
  'deri-kartlik',
  'erkek-deri-canta/el-cantasi',
  'deri-aksesuar/ajanda-defter-kilifi',
  'deri-aksesuar/deri-kemer',
  'erkege-hediye',
]

export function HomePage() {
  const { addToCart } = useOutletContext<StoreContext>()

  const homeSeo = useMemo(() => {
    const heroProduct = getProductBySlug('lodos-pro-miknatisli-deri-cuzdan') || products[0]
    return buildHomeSeo(siteConfig, heroProduct?.variants[0]?.images[0])
  }, [])
  useDocumentSeo(homeSeo)

  const featuredProducts = useMemo(() => {
    return FEATURED_MODEL_SLUGS.map((slug) => getProductBySlug(slug)).filter(
      (p): p is ProductRecord => Boolean(p)
    )
  }, [])

  const showcaseCategories = useMemo(() => {
    return FEATURED_CATEGORY_SLUGS.map((s) => getCategoryBySlug(s)).filter(
      (c): c is NonNullable<typeof c> => Boolean(c)
    )
  }, [])

  return (
    <main>
      <AppleHero onAddToCart={(product, variant) => addToCart(product, variant, 1)} />

      {/* Category Grid covering 6 featured categories */}
      <section className="category-runway" id="koleksiyon">
        <header className="category-runway-head">
          <div>
            <p className="overline">Koleksiyonlar · {products.length} Özgün Seri</p>
            <h2>Her yolculuk için bir Elons Leather.</h2>
          </div>
          <Link to="/kategoriler/" className="category-runway-all">
            Tümünü Gör <Icon name="arrow" />
          </Link>
        </header>
        <div className="category-cards-grid">
          {showcaseCategories.map((category) => {
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
        <div className="category-runway-actions">
          <Link to="/kategoriler/" className="category-runway-more-btn">
            Tüm Kategorileri Gör ({categories.length} Kategori) →
          </Link>
        </div>
      </section>

      <Magnetic3DShowcase />

      {/* Featured Products */}
      <section className="new-arrivals">
        <header className="split-heading">
          <div>
            <p className="overline">Atölye Seçkisi</p>
            <h2>Öne Çıkan Deri Tasarımlar</h2>
          </div>
          <Link to="/erkek-deri-cuzdan/">
            Tüm Erkek Deri Cüzdanlar <Icon name="arrow" />
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
          <img src="/assets/elon-mark.png" alt="ELONS LEATHER" width={105} height={105} loading="lazy" />
        </div>
        <div className="craft-band-image">
          <img
            src="/assets/products/elon-leather-lodos-pro-taba-miknatisli-deri-cuzdan-3-yasam-tarzi.webp"
            alt="Lodos Pro hakiki deri cüzdan günlük yaşam tarzı kullanımı"
            width={1200}
            height={1800}
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
            <span>✓ Cüzdan, kartlık, pasaportluk, kemer, çanta ve küçük deri aksesuar seçkisi</span>
            <span>✓ Ürün detayından seçilebilen ücretsiz sıcak gofraj isim ve ek logo baskısı</span>
          </div>
          <div className="craft-cta-group">
            <Link to="/kategoriler/" className="craft-cta-primary">
              Koleksiyonu Keşfet <Icon name="arrow" />
            </Link>
            <Link to="/urun/lodos-pro-miknatisli-deri-cuzdan/" className="craft-cta-secondary">
              Lodos Pro&apos;yu İncele
            </Link>
            <Link to="/hikayemiz/" className="craft-cta-link">
              Hikâyemiz <Icon name="arrow" />
            </Link>
          </div>
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
   CATEGORY PAGE (/:slug/ and /:parentSlug/:childSlug/) — Nested SEO Tree
   ========================================================================= */
export function CategoryPage() {
  const { slug = '', parentSlug = '', childSlug = '' } = useParams()
  const resolvedSlug = parentSlug && childSlug ? `${parentSlug}/${childSlug}` : slug
  const category = getCategoryBySlug(resolvedSlug)
  const parentCategory = category ? getParentCategory(category) : undefined

  const [sort, setSort] = useState<'onerilen' | 'artan' | 'azalan' | 'alfabetik'>('onerilen')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setSearchQuery('')
    setSort('onerilen')
  }, [resolvedSlug])

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
            Elons Leather Hikâyesi →
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
  const [showPersonalizationHelp, setShowPersonalizationHelp] = useState(false)
  const [logoFileName, setLogoFileName] = useState('')
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [logoError, setLogoError] = useState('')
  const [isDraggingLogo, setIsDraggingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setActiveImgIdx(0)
  }, [slug, activeVariant?.renkSlug])

  useEffect(() => {
    setQuantity(1)
    setWantsEngraving(false)
    setEngravingText('')
    setPersonalizationAddon('none')
    setLogoFileName('')
    setLogoPreviewUrl('')
    setLogoError('')
    setIsDraggingLogo(false)
  }, [slug])

  const clearLogoUpload = () => {
    setLogoFileName('')
    setLogoPreviewUrl('')
    setLogoError('')
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  const handleLogoFile = (file?: File | null) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setLogoError('Dosya boyutu 10 MB sınırını aşmamalıdır.')
      return
    }
    setLogoError('')
    setLogoFileName(file.name)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoPreviewUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)
    } else {
      setLogoPreviewUrl('')
    }
  }

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

  const hasCustomOptions = product.personalization.isimYazdirma || hasLogoOption || hasImageOption
  const isPlainSelected = personalizationAddon === 'none' && !wantsEngraving
  const isNameSelected = personalizationAddon === 'none' && wantsEngraving
  const stickyCustomSummary =
    personalizationAddon === 'logo'
      ? `Logo baskılı (+${logoExtraTry} TL)`
      : personalizationAddon === 'image'
        ? `Görsel baskılı (+${imageExtraTry} TL)`
        : wantsEngraving
          ? engravingText.trim()
            ? `İsim baskısı: ${engravingText.trim()}`
            : 'İsim baskısı ücretsiz'
          : 'İsimsiz'

  const previewLeatherBg = activeVariant.secondaryColorHex
    ? `linear-gradient(135deg, ${activeVariant.colorHex} 0%, ${activeVariant.secondaryColorHex} 100%)`
    : activeVariant.colorHex
  const previewStampShown =
    personalizationAddon === 'logo'
      ? 'LOGONUZ'
      : personalizationAddon === 'image'
        ? 'GÖRSELİNİZ'
        : engravingText.trim()
          ? engravingText.trim()
          : 'ADINIZ'

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
      personalizationAddon,
      personalizationAddon !== 'none' && logoFileName
        ? { fileName: logoFileName, previewUrl: logoPreviewUrl || undefined }
        : undefined
    )
  }

  return (
    <main className="product-main">
      {/* Top Breadcrumb Bar */}
      <div className="pdp-top-breadcrumb-wrap">
        <nav className="breadcrumb pdp-top-breadcrumb" aria-label="İçerik Haritası">
          <Link to="/">Ana Sayfa</Link>
          {parentCat && (
            <>
              {' › '}
              <Link to={`/${parentCat.slug}/`}>{parentCat.name}</Link>
            </>
          )}
          {primaryCat && (
            <>
              {' › '}
              <Link to={`/${primaryCat.slug}/`}>{primaryCat.name}</Link>
            </>
          )}
          {' › '}
          <span aria-current="page">{product.modelName}</span>
        </nav>
      </div>

      <div className="product-page">
        {/* Gallery Column (Vertical Thumbnails on Left + 4:5 Main Stage) */}
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
          <div className="pdp-gallery-split">
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, idx) => (
                  <button
                    type="button"
                    key={img.full}
                    className={safeImgIdx === idx ? 'active' : ''}
                    aria-pressed={safeImgIdx === idx}
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

            <div className="gallery-stage">
              {product.personalization.isimYazdirma && (
                <span className="pdp-gallery-perk-pill">ÜCRETSİZ İSİM BASKISI</span>
              )}
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
          </div>
        </div>

        {/* Purchase Column */}
        <section className="product-purchase" id="buy-box">
          <p className="overline">
            {(primaryCat?.name || product.productType).toLocaleUpperCase('tr-TR')} · SKU {activeVariant.sku}
          </p>
          <h1>
            {product.modelName} {product.productType} - {activeVariant.renk}
          </h1>

          <p className="product-description">{product.shortDescription}</p>

          {unitPrice !== null ? (
            <div className="pdp-price-line">
              <strong className="detail-price">{formatPrice(unitPrice)}</strong>
              <span className="pdp-vat-note">KDV dahil · {product.specs.malzeme}</span>
            </div>
          ) : (
            <p className="price-pending-banner">
              Fiyat ve teknik ölçü bilgileri atölyemiz tarafından güncellenmektedir.
            </p>
          )}

          {/* Variant Color Switcher */}
          <div className="option-block">
            <div className="option-label">
              <span>
                DERİ RENGİ {product.variants.length > 1 ? `(${product.variants.length} Seçenek)` : ''}
              </span>
              <strong>{activeVariant.renk}</strong>
            </div>
            <div className="swatches">
              {product.variants.map((variant) => (
                <button
                  type="button"
                  key={variant.sku}
                  className={variant.renkSlug === activeVariant.renkSlug ? 'active' : ''}
                  aria-pressed={variant.renkSlug === activeVariant.renkSlug}
                  onClick={() => handleVariantSelect(variant)}
                  title={variant.renk}
                  aria-label={`${product.modelName} ${variant.renk}`}
                >
                  <i
                    style={{
                      background: variant.secondaryColorHex
                        ? `linear-gradient(135deg, ${variant.colorHex} 50%, ${variant.secondaryColorHex} 50%)`
                        : variant.colorHex,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Personalization Controls + Live Preview */}
          {hasCustomOptions && (
            <div className="personalization-area">
              <div className="p-area-head">
                <h2>Kişiselleştirme Alanı</h2>
                <button
                  type="button"
                  className="p-help-btn"
                  aria-label="Kişiselleştirme hakkında bilgi"
                  aria-expanded={showPersonalizationHelp}
                  onClick={() => setShowPersonalizationHelp((v) => !v)}
                >
                  ?
                </button>
              </div>

              {showPersonalizationHelp && (
                <p className="p-help-note">
                  İsim yazdırma sıcak gofraj baskıyla ücretsiz işlenir. Özel logo veya görsel ekleme seçildiğinde görselinizi hemen aşağıdan yükleyebilir ya da sipariş sonrasında e-posta ile paylaşabilirsiniz.
                </p>
              )}

              {/* Tactile Option Cards */}
              <div className="pdp-custom-cards" role="group" aria-label="Kişiselleştirme seçenekleri">
                <button
                  type="button"
                  aria-pressed={isPlainSelected}
                  className={`pdp-custom-card ${isPlainSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    setPersonalizationAddon('none')
                    setWantsEngraving(false)
                  }}
                >
                  <strong>İsimsiz</strong>
                  <span>Sade yüzey</span>
                </button>

                {product.personalization.isimYazdirma && (
                  <button
                    type="button"
                    aria-pressed={isNameSelected}
                    className={`pdp-custom-card ${isNameSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setPersonalizationAddon('none')
                      setWantsEngraving(true)
                    }}
                  >
                    <strong>İsim baskılı</strong>
                    <span>Ücretsiz</span>
                  </button>
                )}

                {hasLogoOption && (
                  <button
                    type="button"
                    aria-pressed={personalizationAddon === 'logo'}
                    className={`pdp-custom-card ${personalizationAddon === 'logo' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setPersonalizationAddon('logo')
                    }}
                  >
                    <strong>Logo baskılı</strong>
                    <span>+{logoExtraTry} TL</span>
                  </button>
                )}

                {hasImageOption && (
                  <button
                    type="button"
                    aria-pressed={personalizationAddon === 'image'}
                    className={`pdp-custom-card ${personalizationAddon === 'image' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setPersonalizationAddon('image')
                    }}
                  >
                    <strong>Görsel baskı</strong>
                    <span>+{imageExtraTry} TL</span>
                  </button>
                )}
              </div>

              {/* Quick Toggle Checkboxes for Combined İsim + Logo */}
              {personalizationAddon !== 'none' && product.personalization.isimYazdirma && (
                <div className="p-check-list" style={{ marginTop: '12px' }}>
                  <label className="p-check-row">
                    <input
                      type="checkbox"
                      checked={wantsEngraving}
                      onChange={(e) => setWantsEngraving(e.target.checked)}
                    />
                    <span>İSİM YAZDIRMA EKLE</span>
                    <em className="p-free-tag">(Ücretsiz)</em>
                  </label>
                </div>
              )}

              {product.personalization.isimYazdirma && (wantsEngraving || personalizationAddon === 'none') && (
                <div className="p-name-field">
                  <label htmlFor="p-text">
                    Yazdırılacak isim ya da baş harfler (en fazla {maxNameChars} karakter)
                  </label>
                  <input
                    id="p-text"
                    type="text"
                    maxLength={maxNameChars}
                    value={engravingText}
                    onChange={(e) => {
                      const val = e.target.value
                      setEngravingText(val)
                      setWantsEngraving(val.trim().length > 0)
                    }}
                    placeholder="Örnek: B. BAŞER"
                  />
                </div>
              )}

              {personalizationAddon !== 'none' && (
                <div className="p-logo-upload-wrap">
                  <p className="p-logo-upload-label">
                    {personalizationAddon === 'image' ? 'Görsel Yükleme Alanı' : 'Logo Yükleme Alanı'}
                  </p>
                  <div
                    className={`p-logo-dropzone ${isDraggingLogo ? 'is-dragging' : ''} ${logoFileName ? 'has-file' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDraggingLogo(true)
                    }}
                    onDragLeave={() => setIsDraggingLogo(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDraggingLogo(false)
                      handleLogoFile(e.dataTransfer.files?.[0])
                    }}
                  >
                    <input
                      ref={logoInputRef}
                      type="file"
                      className="sr-only"
                      accept="image/*,.svg,.pdf,.ai,.eps"
                      aria-label={
                        personalizationAddon === 'image' ? 'Görsel yükle' : 'Logo görseli yükle'
                      }
                      onChange={(e) => handleLogoFile(e.target.files?.[0])}
                    />
                    {logoFileName ? (
                      <div className="p-logo-preview">
                        {logoPreviewUrl && (
                          <img src={logoPreviewUrl} alt={logoFileName} className="p-logo-thumb" />
                        )}
                        <div className="p-logo-meta">
                          <strong>{logoFileName}</strong>
                          <div className="p-logo-preview-actions">
                            <button
                              type="button"
                              className="p-logo-upload-btn"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              Değiştir
                            </button>
                            <button
                              type="button"
                              className="p-logo-remove-btn"
                              onClick={clearLogoUpload}
                            >
                              Kaldır
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="p-logo-upload-btn"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        Görseli Ekle
                      </button>
                    )}
                  </div>
                  {logoError && <p className="p-logo-error">{logoError}</p>}
                  <div className="p-charge-banner" role="status">
                    Seçimleriniz toplam tutara <strong>{addonExtra},00 TL</strong> ek ücret ekleyecektir.
                  </div>
                </div>
              )}

              {/* Live Embossing / Logo Preview Swatch */}
              {(wantsEngraving || personalizationAddon !== 'none') && (
                <div
                  role="img"
                  aria-label="Sıcak baskı canlı deri önizlemesi"
                  className="pdp-live-stamp-tile"
                  style={{ background: previewLeatherBg }}
                >
                  <div aria-hidden="true" className="pdp-live-stamp-stitch" />
                  {logoPreviewUrl && personalizationAddon !== 'none' ? (
                    <img
                      src={logoPreviewUrl}
                      alt={logoFileName || 'Logo önizleme'}
                      className="pdp-live-stamp-logo"
                    />
                  ) : (
                    <span>{previewStampShown}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Purchase Row */}
          {hasNumericPrice ? (
            <div className="pdp-buy-actions">
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
              <button type="button" className="pdp-buy-now" onClick={handleAdd}>
                Hemen Satın Alın
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

          {/* 3-Column Trust Row */}
          <div className="pdp-trust-strip">
            <span>%100 Hakiki Deri</span>
            <span>
              {product.personalization.isimYazdirma ? 'Ücretsiz İsim Baskısı' : 'El Yapımı Üretim'}
            </span>
            <span>Doğal Patina Dokusu</span>
          </div>

          <p className="stock-note">
            <i /> {activeVariant.inStock ? 'Sipariş üzerine elde hazırlanır' : 'Stok bilgisi güncelleniyor'} · {product.variants.length} Renk Seçeneği
          </p>

          {/* Buybox Native Accordions */}
          <div className="pdp-buybox-accordions">
            <details>
              <summary>Teknik özellikler</summary>
              <dl className="pdp-specs-list">
                {specRows.map((row) => (
                  <div key={row.label} className="pdp-spec-row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </details>

            <details>
              <summary>Kişiselleştirme ve baskı</summary>
              <div className="pdp-acc-body">
                {product.personalization.isimYazdirma ? (
                  <p>
                    İsim ve baş harfler ısı ve basınçla deriye ücretsiz olarak gömülür.
                    {hasLogoOption &&
                      ` Kurumsal veya kişisel logo baskısı +${logoExtraTry} TL farkla uygulanır; logo dosyanızı yukarıdaki alandan hemen yükleyebilirsiniz.`}
                  </p>
                ) : (
                  <p>Bu model yüzey yapısı gereği sade formda el işçiliğiyle üretilmektedir.</p>
                )}
              </div>
            </details>

            <details>
              <summary>Bakım</summary>
              <ul className="pdp-acc-list">
                {product.careInstructions.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      </div>

      {/* Editorial Storytelling, Patina Simulator, Authenticity Checklist & Comparison */}
      <ProductEditorialSections
        product={product}
        activeVariant={activeVariant}
        engravingText={engravingText}
        wantsEngraving={wantsEngraving}
        personalizationAddon={personalizationAddon}
        logoPreviewUrl={logoPreviewUrl}
      />

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

      {/* Desktop & Mobile Sticky Bottom Purchase Bar */}
      {hasNumericPrice && totalButtonPrice && (
        <div className="pdp-sticky-bar" role="region" aria-label="Hızlı Sepet Ekleme">
          <div className="pdp-sticky-inner">
            <div className="pdp-sticky-meta">
              <strong>
                {product.modelName} {product.productType}
              </strong>
              <span>
                {activeVariant.renk} · {stickyCustomSummary}
              </span>
            </div>
            <div className="pdp-sticky-cta-group">
              <strong className="pdp-sticky-price">{totalButtonPrice}</strong>
              <button type="button" className="pdp-sticky-btn" onClick={handleAdd}>
                Sepete Ekle
              </button>
            </div>
          </div>
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
        <p className="overline">Elons Leather Atölyesi</p>
        <h1>
          Sadelik, doğal deri ve<br />
          <em>günlük yaşamın ritmi.</em>
        </h1>
        <p className="story-lead">
          Elons Leather, cebinizde ve çantanızda her gün taşıdığınız eşyaları zamansız hakiki deri formlarla yeniden
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
            Sıcak gofraj baskı uygulamasıyla tüm ürünlere ücretsiz isim veya baş harf işleyebiliyoruz. Seçili Lodos Pro
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
          <Link to="/kategoriler/" className="apple-btn-primary">
            Tüm Koleksiyonları Gör
          </Link>
        </div>
      </section>
    </main>
  )
}

/* =========================================================================
   ALL CATEGORIES PAGE (/kategoriler/) — Full Directory of 17 SEO Categories
   ========================================================================= */
export function AllCategoriesPage() {
  const [activeTab, setActiveTab] = useState<string>('all')

  const seoPayload = useMemo(() => buildAllCategoriesSeo(siteConfig), [])
  useDocumentSeo(seoPayload)

  const displayedCategories = useMemo(() => {
    if (activeTab === 'all') return categories
    const children = getChildCategories(activeTab)
    if (children.length > 0) return children
    const selfCat = getCategoryBySlug(activeTab)
    return selfCat ? [selfCat] : []
  }, [activeTab])

  return (
    <main className="all-cats-page">
      <section className="all-cats-hero">
        <nav className="breadcrumb" aria-label="İçerik Haritası">
          <Link to="/">Ana Sayfa</Link> / <span aria-current="page">Kategoriler</span>
        </nav>
        <p className="overline">Elons Leather · Koleksiyon Dizini</p>
        <h1>
          Tüm Kategoriler &amp;<br />
          <em>Atölye Seçkisi.</em>
        </h1>
        <p className="all-cats-lead">
          Zanaatkâr eliyle şekillenen {products.length} özgün model, {parentCategories.length} ana koleksiyon ve{' '}
          {subCategories.length} alt kategori. Cebinizde, elinizde ve omzunuzda ömür boyu taşınacak doğal dokulu hakiki deri tasarımlarımızı keşfedin.
        </p>

        {/* Category Family Tabs */}
        <div className="all-cats-tabs" role="tablist" aria-label="Kategori Grupları">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`all-cats-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tüm Kategoriler ({categories.length})
          </button>
          {parentCategories.map((parent) => {
            const count = getChildCategories(parent.slug).length
            return (
              <button
                type="button"
                key={parent.slug}
                role="tab"
                aria-selected={activeTab === parent.slug}
                className={`all-cats-tab-btn ${activeTab === parent.slug ? 'is-active' : ''}`}
                onClick={() => setActiveTab(parent.slug)}
              >
                {parent.name} {count > 0 ? `(${count})` : `(${getProductsByCategory(parent.slug).length})`}
              </button>
            )
          })}
        </div>
      </section>

      {/* Grid of Categories */}
      <section className="all-cats-grid-section">
        <div className="category-cards-grid">
          {displayedCategories.map((category) => {
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

      {/* Parent Collections Overview Banners */}
      <section className="all-cats-parents-overview">
        <header className="split-heading">
          <div>
            <p className="overline">Ana Koleksiyonlar</p>
            <h2>{parentCategories.length} Temel Deri Dünyası</h2>
          </div>
        </header>
        <div className="all-cats-parents-grid">
          {parentCategories.map((parent) => {
            const children = getChildCategories(parent.slug)
            const parentProds = getProductsByCategory(parent.slug)
            return (
              <div key={parent.slug} className="all-cats-parent-card">
                <span className="parent-card-tag">{children.length} Alt Kategori</span>
                <h3>{parent.name}</h3>
                <p className="parent-card-desc">{parent.shortIntro}</p>
                <div className="parent-card-footer">
                  <span className="parent-card-models">{parentProds.length} Model Tasarımı</span>
                  <Link to={`/${parent.slug}/`} className="apple-btn-primary">
                    Koleksiyonu Aç →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
          <p className="overline">Elons Leather Bülten</p>
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
            <h3>Cüzdan &amp; Hediye</h3>
            <Link to="/erkek-deri-cuzdan/">Erkek Deri Cüzdan</Link>
            <Link to="/erkek-deri-cuzdan/miknatisli/">Mıknatıslı Deri Cüzdan</Link>
            <Link to="/erkek-deri-cuzdan/para-klipsli/">Para Klipsli Deri Cüzdan</Link>
            <Link to="/erkek-deri-cuzdan/ince/">İnce Deri Cüzdan</Link>
            <Link to="/erkek-deri-cuzdan/isimli/">İsimli Deri Cüzdan</Link>
            <Link to="/deri-kartlik/">Deri Kartlık</Link>
            <Link to="/erkege-hediye/">Erkeğe Hediye</Link>
            <Link to="/erkege-hediye/hediye-seti/">Erkek Hediye Seti</Link>
          </div>

          <div className="footer-dir-col">
            <h3>Çanta &amp; Aksesuar</h3>
            <Link to="/erkek-deri-canta/">Erkek Deri Çanta</Link>
            <Link to="/erkek-deri-canta/el-cantasi/">Erkek Deri El Çantası</Link>
            <Link to="/erkek-deri-canta/omuz-cantasi/">Erkek Deri Omuz Çantası</Link>
            <Link to="/deri-aksesuar/pasaport-kilifi/">Deri Pasaport Kılıfı</Link>
            <Link to="/deri-aksesuar/anahtarlik/">Deri Anahtarlık</Link>
            <Link to="/deri-aksesuar/ajanda-defter-kilifi/">Deri Ajanda ve Defter Kılıfı</Link>
            <Link to="/deri-aksesuar/erkek-bileklik/">Erkek Deri Bileklik</Link>
            <Link to="/deri-aksesuar/deri-kemer/">Deri Kemer</Link>
          </div>

          <div className="footer-dir-col">
            <h3>Atölye &amp; Bilgi</h3>
            <Link to="/kategoriler/">Tüm Kategoriler</Link>
            <Link to="/blog/">Blog &amp; Deri Rehberi</Link>
            <Link to="/hikayemiz/">Hikâyemiz</Link>
            <Link to="/sepet/">Sepetim</Link>
            <Link to="/giris/">Giriş Yap</Link>
            <Link to="/uye-ol/">Üye Ol</Link>
            <Link to="/kvkk/">KVKK Aydınlatma Metni</Link>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            {isConfiguredValue(siteConfig.shippingBadgeText) && (
              <span>{siteConfig.shippingBadgeText}</span>
            )}
          </div>
        </div>

        <div className="footer-legal">
          <p>© 2026 ELONS LEATHER · El Yapımı Hakiki Deri Atölyesi</p>
          <p>
            <Link to="/kvkk/">KVKK &amp; Gizlilik</Link> · Telif Hakkı Saklıdır.
          </p>
        </div>
      </div>
    </footer>
  )
}
