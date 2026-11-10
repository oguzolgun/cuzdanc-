import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router'
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  categories,
  craftStandards,
  formatPrice,
  productImgUrl,
  products,
  type Product,
} from './data'
import { CanvasScrollHero } from './CanvasScrollHero'

export type CartItem = {
  product: Product
  quantity: number
  color: string
  engraving?: string
  foilStyle?: 'blind'
  phoneModel?: string
}

type StoreContext = {
  addToCart: (
    product: Product,
    quantity?: number,
    color?: string,
    engraving?: string,
    foilStyle?: 'blind',
    phoneModel?: string
  ) => void
  openMenu: () => void
  openCart: () => void
  cartCount: number
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
    | 'shield'
    | 'sparkle'
    | 'play'
    | 'check'
    | 'down'
    | 'refresh'
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
    down: <path d="M12 5v14M7 14l5 5 5-5" />,
    minus: <path d="M6 12h12" />,
    plus: <path d="M6 12h12M12 6v12" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    sparkle: <path d="m12 3 2.5 5.5L20 11l-4.5 4 1.5 6-5-3.5-5 3.5 1.5-6L4 11l5.5-2.5L12 3z" />,
    play: <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />,
    check: <polyline points="20 6 9 17 4 12" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
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
      <img src="/assets/elon-logo.png" alt="ELON LEATHER" />
    </span>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export function StoreLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (
    product: Product,
    quantity = 1,
    color = product.colorName,
    engraving = '',
    foilStyle: 'blind' = 'blind',
    phoneModel = ''
  ) => {
    setCart((current) => {
      const match = current.find(
        (item) =>
          item.product.slug === product.slug &&
          item.color === color &&
          item.engraving === engraving &&
          item.phoneModel === phoneModel
      )
      if (match) {
        return current.map((item) =>
          item === match ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...current, { product, quantity, color, engraving, foilStyle, phoneModel }]
    })
    setCartOpen(true)
  }

  const count = cart.reduce((total, item) => total + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const { pathname } = useLocation()
  const openMenu = () => setMenuOpen(true)
  const openCart = () => setCartOpen(true)

  return (
    <div className="store-shell">
      <ScrollToTop />

      {/* Global Top Header Bar for Inner Pages (Homepage uses dynamic header inside CanvasScrollHero) */}
      {pathname !== '/' && (
        <header className="elon-nav-header is-scrolled">
          <div className="nav-container">
            <div className="nav-left">
              <Link to="/" className="nav-brand" aria-label="ELON LEATHER Ana Sayfa">
                <span className="el-monogram-wrap">
                  <img src="/assets/elon-mark.png" alt="EL" className="el-monogram" />
                </span>
                <div className="nav-brand-text">
                  <span className="brand-title">ELON LEATHER</span>
                  <span className="brand-subtitle">EL DİKİMİ ATELIER</span>
                </div>
              </Link>
            </div>

            <nav className="nav-center" aria-label="Ana Menü">
              <Link to="/kategori/tumu" className="nav-link">
                Koleksiyon
              </Link>
              <Link to="/#motto" className="nav-link">
                Hikâyemiz
              </Link>
              <Link to="/#mekanizma" className="nav-link">
                Mekanizma
              </Link>
              <a href="mailto:destek@elonleather.com" className="nav-link">
                İletişim
              </a>
            </nav>

            <div className="nav-right">
              <button
                type="button"
                className="nav-action-btn menu-trigger"
                onClick={openMenu}
                aria-label="Koleksiyon Menüsünü Aç"
              >
                <Icon name="menu" />
                <span className="btn-label">Menü</span>
              </button>

              <button
                type="button"
                className="nav-action-btn cart-trigger"
                onClick={openCart}
                aria-label="Sepeti Görüntüle"
              >
                <Icon name="bag" />
                <span className="cart-badge">{count}</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Fullscreen Editorial Menu */}
      <div className={`menu-canvas ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="menu-photo" />
        <div className="menu-content">
          <button type="button" className="canvas-close" onClick={() => setMenuOpen(false)}>
            <Icon name="close" />
            <span>Kapat</span>
          </button>
          <p className="overline">ELON LEATHER</p>
          <nav>
            <NavLink to="/kategori/tumu" onClick={() => setMenuOpen(false)}>
              <small>00</small>
              <span>
                Tüm Koleksiyon <em>({products.length})</em>
              </span>
              <Icon name="arrow" />
            </NavLink>
            {categories.map((category) => (
              <NavLink key={category.slug} to={`/kategori/${category.slug}`} onClick={() => setMenuOpen(false)}>
                <small>{category.index}</small>
                <span>
                  {category.name} <em>({category.count})</em>
                </span>
                <Icon name="arrow" />
              </NavLink>
            ))}
          </nav>
          <div className="menu-secondary">
            <Link to="/kategori/yeni-gelenler" onClick={() => setMenuOpen(false)}>
              Yeni Gelenler
            </Link>
            <Link to="/kategori/cok-satanlar" onClick={() => setMenuOpen(false)}>
              Çok Satanlar
            </Link>
            <Link to="/#motto" onClick={() => setMenuOpen(false)}>
              Mottomuz & Hikâye
            </Link>
            <Link to="/#kisisellestir" onClick={() => setMenuOpen(false)}>
              İsim Baskı Atölyesi
            </Link>
            <a href="mailto:destek@elonleather.com">İletişim</a>
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
              <p>Ömürlük bir parça seçmek için koleksiyona göz atın.</p>
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
            cart.map((item, idx) => (
              <article className="cart-item" key={`${item.product.slug}-${item.color}-${idx}`}>
                <img src={productImgUrl(item.product.images[0], 300)} alt={item.product.name} />
                <div>
                  <h3>
                    <Link to={`/urun/${item.product.slug}`} onClick={() => setCartOpen(false)}>
                      {item.product.name}
                    </Link>
                  </h3>
                  <p>
                    {item.color} · Adet {item.quantity}
                  </p>
                  {item.phoneModel && (
                    <span className="cart-engraving-badge">
                      Telefon Modeli: <strong>{item.phoneModel}</strong>
                    </span>
                  )}
                  {item.engraving && (
                    <span className="cart-engraving-badge">
                      ✦ Özel Sıcak Baskı: <strong>{item.engraving}</strong>
                    </span>
                  )}
                  <strong>{formatPrice(item.product.price * item.quantity)}</strong>
                </div>
                <button
                  type="button"
                  aria-label="Ürünü kaldır"
                  onClick={() => setCart((current) => current.filter((_, i) => i !== idx))}
                >
                  <Icon name="close" />
                </button>
              </article>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-summary">
            <p>
              <span>Ara Toplam</span>
              <strong>{formatPrice(total)}</strong>
            </p>
            <p className="cart-perk">
              <Icon name="check" />
              <span>Ücretsiz Sigortalı Kargo & Özel Hediye Kutusu Dahil</span>
            </p>
            <button type="button" className="checkout-btn">
              Güvenli Ödemeye Geç <Icon name="arrow" />
            </button>
          </div>
        )}
      </aside>

      <div className="page-content">
        <Outlet context={{ addToCart, openMenu, openCart, cartCount: count } satisfies StoreContext} />
        <Footer />
      </div>
    </div>
  )
}

function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const mainImg = productImgUrl(product.images[0], 700)
  const hoverImg = product.images[1] ? productImgUrl(product.images[1], 700) : null

  return (
    <article className="shop-card" style={{ '--delay': `${(index % 9) * 45}ms` } as CSSProperties}>
      <Link to={`/urun/${product.slug}`} className="shop-card-image">
        {product.tag && <span className="product-tag">{product.tag}</span>}
        {product.rfidProtected && <span className="rfid-tag">RFID Korumalı</span>}
        <img src={mainImg} alt={product.name} className="primary-card-img" loading="lazy" />
        {hoverImg && <img src={hoverImg} alt="" className="secondary-card-img" loading="lazy" aria-hidden="true" />}
        <div className="card-action">
          İncele & Seçenekleri Gör <Icon name="arrow" />
        </div>
      </Link>
      <div className="shop-card-info">
        <div>
          <p>{product.category}</p>
          <Link to={`/urun/${product.slug}`}>{product.name}</Link>
          <div className="card-meta-row">
            <span className="card-color-chip">
              <i style={{ background: product.colorHex }} />
              {product.colorName}
            </span>
            {product.isPersonalizable && <span className="custom-perk-hint">✦ Ücretsiz Baskı</span>}
          </div>
        </div>
        <strong>{formatPrice(product.price)}</strong>
      </div>
    </article>
  )
}

/* =========================================================================
   INTERACTIVE POP-UP MECHANISM SIMULATOR
   ========================================================================= */
function MechanismSimulator() {
  const [ejected, setEjected] = useState(false)

  return (
    <section className="mechanism-section" id="mekanizma">
      <div className="mechanism-grid">
        <div className="mechanism-info">
          <p className="overline">Patentli Kızak Teknolojisi</p>
          <h2>
            Tek dokunuşla,<br />
            <em>düzen parmaklarınızda.</em>
          </h2>
          <p>
            Alttaki ergonomik tetiği tek bir parmak hareketiyle kaydırın; içerideki kartlarınız kademeli merdiven formuyla anında karşınıza çıksın.
            Kalabalık kart yığınları içinde aramak yok, kartlarınızın bükülmesi veya kırılması yok.
          </p>

          <ul className="mechanism-features">
            <li>
              <Icon name="shield" />
              <div>
                <strong>%100 RFID & NFC Kalkanı</strong>
                <span>Alüminyum iç kafes, temassız POS hırsızlıklarına ve sinyal kopyalamaya karşı tam koruma sağlar.</span>
              </div>
            </li>
            <li>
              <Icon name="sparkle" />
              <div>
                <strong>Kademeli Akıllı Mekanizma</strong>
                <span>Kartlar birbirine sürtünmeden basamak şeklinde yükselir, istediğiniz karta 1 saniyede erişin.</span>
              </div>
            </li>
            <li>
              <Icon name="check" />
              <div>
                <strong>El İşçiliği Hakiki Deri</strong>
                <span>Gövde dışı, kullandıkça kendine has doğal patina kazanan birinci sınıf dana derisi ile kaplanmıştır.</span>
              </div>
            </li>
          </ul>

          <Link to="/kategori/mekanizmali-magsafe-kartlik" className="primary-link">
            Mekanizmalı Modelleri İncele <Icon name="arrow" />
          </Link>
        </div>

        <div className="mechanism-interactive-box">
          <div className="interactive-cardholder-wrap">
            <div className={`cardholder-device ${ejected ? 'is-ejected' : ''}`}>
              {/* Emerging Cards */}
              <div className="ejected-cards-layer">
                <div className="sim-card card-1">
                  <span>ELON BLACK</span>
                  <small>•••• 4892</small>
                </div>
                <div className="sim-card card-2">
                  <span>ATELIER CLUB</span>
                  <small>VIP GOLD</small>
                </div>
                <div className="sim-card card-3">
                  <span>TRAVEL PASS</span>
                  <small>•••• 1024</small>
                </div>
                <div className="sim-card card-4">
                  <span>IDENTITY</span>
                  <small>•••• 8820</small>
                </div>
                <div className="sim-card card-5">
                  <span>METRO PASS</span>
                  <small>•••• 7311</small>
                </div>
              </div>

              {/* Leather Wallet Body */}
              <div className="wallet-leather-body">
                <div className="leather-texture-overlay" />
                <img src="/assets/elon-mark.png" alt="EL" className="wallet-embossed-mark" />
                <div className="wallet-embossed-brand">ELON LEATHER</div>
                <div className="wallet-stitch-left" />
                <div className="wallet-stitch-right" />
                <div className="wallet-stitch-bottom" />

                {/* Interactive Lever Button */}
                <button
                  type="button"
                  className={`wallet-lever ${ejected ? 'pushed' : ''}`}
                  onClick={() => setEjected(!ejected)}
                  title="Kartları çıkar / içeri al"
                >
                  <span className="lever-knob" />
                </button>
              </div>
            </div>

            <div className="interactive-helper-prompt">
              <button
                type="button"
                className="trigger-demo-btn"
                onClick={() => setEjected(!ejected)}
              >
                {ejected ? 'Kartları İçeri Al ↺' : 'Tıkla & Mekanizmayı Çalıştır ➔'}
              </button>
              <small>Alttaki tetiğe tıklayarak mekanizmayı test edebilirsiniz.</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
   LIVE LEATHER EMBOSSING STUDIO (KİŞİSELLEŞTİRME ATÖLYESİ)
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
        <p className="overline">Ücretsiz Kişiselleştirme Atölyesi</p>
        <h2>
          Cüzdanınıza ruh katın:<br />
          <em>Adınız deriye kazınsın.</em>
        </h2>
        <p>
          Elon Leather atölyesinin zamansız zanaat ayrıntısı: Sipariş verdiğiniz her parçaya,
          geleneksel pirinç harfler ve sıcak gofraj presiyle isminizi veya baş harflerinizi ücretsiz olarak işliyoruz.
        </p>
      </div>

      <div className="studio-workbench">
        {/* Real-time Leather Preview Canvas */}
        <div
          className={`leather-swatch-display ${selected.isDark ? 'is-dark' : ''}`}
          style={{ background: selected.bg }}
        >
          <div className="leather-grain-overlay" />
          <div className="leather-hand-stitching" style={{ borderColor: selected.stitch }} />

          {/* Elon Leather Brand Stamp (Top Left) */}
          <div className="swatch-brand-stamp">
            <img src="/assets/elon-mark.png" alt="ELON LEATHER" className="swatch-el-mark" />
            <div className="swatch-brand-info">
              <span className="swatch-brand-name">ELON LEATHER</span>
              <span className="swatch-brand-sub">EL DİKİMİ ATELIER</span>
            </div>
          </div>

          {/* Refined Bottom-Right Personalized Deboss Name */}
          <div className="swatch-corner-emboss">
            <div className="embossed-name-output style-blind">
              {name.trim() ? name.toUpperCase() : 'BURAYA İSİM GİRİNİZ'}
            </div>
          </div>
        </div>

        {/* Customization Controls */}
        <div className="studio-controls">
          {/* Enhanced UX Input Area */}
          <div className="emboss-input-group">
            <div className="emboss-input-header">
              <label htmlFor="custom-name-input">Deriye İşlenecek İsim veya Baş Harfler</label>
              <span className="emboss-input-badge">✦ Ücretsiz Sıcak Baskı</span>
            </div>

            <div className="emboss-input-box">
              <svg viewBox="0 0 24 24" className="emboss-input-icon" fill="none" stroke="currentColor">
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
                maxLength={22}
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
                <span className="emboss-char-count">{name.length}/22</span>
              </div>
            </div>

            <p className="emboss-input-hint">
              <strong>✦ Canlı Önizleme:</strong> Buraya yazdığınız isim soldaki hakiki deriye anında sıcak gofrajla işlenir.
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
            <Link to="/kategori/tumu" className="primary-link">
              Bu Baskıyla Bir Ürün Seçin <Icon name="arrow" />
            </Link>
            <p className="studio-note">
              * Seçtiğiniz ürünün sayfasında isminizi tekrar belirtebilir, hediyelik özel not ekleyebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
   HOMEPAGE
   ========================================================================= */
const FEATURED_SLUGS = [
  'apex-el-yapimi-hakiki-deri-miknatisli-cift-katli-cuzdan-ve-kartlik-antik-taba',
  'peru-magsafe-ozellikli-standli-mekanizmali-premium-hakiki-deri-kartlik-koyu-taba',
  'oslo-hakiki-deri-unisex-cuzdan-12x9-cm-sik-ve-dayanikli-tasarim-taba-siyah',
  'dubai-gold-ince-tasarim-hakiki-deri-mandal-tutuculu-cuzdan-ve-kartlik-taba-kahverengi',
  'elegant-hakiki-deri-el-cantasi-taba-kahverengi',
  'rusya-hakiki-deri-kapakli-kartlikli-ve-para-bolmeli-telefon-kilifi-taba-kahverengi',
]

export function HomePage() {
  const { openMenu, openCart, cartCount } = useOutletContext<StoreContext>()

  const featuredProducts = useMemo(() => {
    const picked = FEATURED_SLUGS.map((slug) => products.find((p) => p.slug === slug)).filter(
      (p): p is Product => Boolean(p)
    )
    return picked.length >= 6 ? picked : products.slice(0, 6)
  }, [])

  const craftImage = useMemo(() => {
    const apex = products.find((p) => p.slug === FEATURED_SLUGS[0] && p.images[1])
    return productImgUrl(apex?.images[1] || products[0].images[0], 1400)
  }, [])

  return (
    <main>
      {/* 1. SCROLL-DRIVEN VIDEO HERO (Canvas + WebP image sequence scrubbed by scroll) */}
      <CanvasScrollHero onOpenMenu={openMenu} onOpenCart={openCart} cartCount={cartCount} />

      {/* 2. Interactive RFID Pop-up Mechanism Simulator */}
      <MechanismSimulator />

      {/* 3. Category Runway */}
      <section className="category-runway" id="koleksiyon">
        <header>
          <p className="overline">Koleksiyonlar · {products.length} Parça</p>
          <h2>Her yolculuk için bir Elon Leather.</h2>
        </header>
        <div className="category-list">
          {categories.map((category) => (
            <Link to={`/kategori/${category.slug}`} className="category-row" key={category.slug}>
              <span>{category.index}</span>
              <div>
                <h3>
                  {category.name} <small className="category-count-pill">{category.count}</small>
                </h3>
                <p className="category-subtext">{category.description}</p>
              </div>
              <div className="category-thumb">
                <img src={productImgUrl(category.image, 600)} alt={category.name} loading="lazy" />
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Live Embossing Studio */}
      <EmbossingStudio />

      {/* 5. Featured Products Grid */}
      <section className="new-arrivals">
        <header className="split-heading">
          <div>
            <p className="overline">Öne Çıkan Parçalar</p>
            <h2>İkonik & Çok Satan Modeller</h2>
          </div>
          <Link to="/kategori/tumu">
            Tüm Koleksiyonu Gör ({products.length}) <Icon name="arrow" />
          </Link>
        </header>
        <div className="editorial-grid">
          {featuredProducts.map((product, index) => (
            <ProductCard product={product} index={index} key={product.slug} />
          ))}
        </div>
      </section>

      {/* 6. Bohemian Craftsmanship Editorial Band */}
      <section className="craft-band">
        <div className="craft-mark">
          <img src="/assets/elon-mark.png" alt="ELON LEATHER" />
        </div>
        <div className="craft-band-image">
          <img src={craftImage} alt="Elon Leather el dikimi hakiki dana derisi işçiliği" />
        </div>
        <div className="craft-band-copy">
          <p className="overline">Derinin Hafızası</p>
          <h2>
            Her çizik,<br />
            <em>size ait bir hikâye.</em>
          </h2>
          <p>
            Bitkisel tabaklanmış ve doğal dokulu hakiki deriler zamanı gizlemez. Dokunduğunuz anların sıcaklığını,
            cebinizdeki formunu ve yaptığınız yolculukları yüzeyindeki benzersiz patinada saklar.
            Kullandıkça eskiyen değil, kullandıkça güzelleşen bir yaşam ortağı.
          </p>
          <div className="craft-details-checklist">
            <span>✓ %100 birinci sınıf hakiki dana derisi ve el işçiliği</span>
            <span>✓ Neodyum mıknatıs, alüminyum mekanizma & MagSafe çözümleri</span>
            <span>✓ Ücretsiz sıcak gofraj baskısı ve ömür boyu bakım güvencesi</span>
          </div>
          <Link to="/kategori/tumu">
            Atölye Koleksiyonunu Keşfet <Icon name="arrow" />
          </Link>
        </div>
      </section>

      {/* 7. Guarantees & Service Strip */}
      <section className="service-strip">
        <div>
          <span>01</span>
          <h3>Ücretsiz Kişiselleştirme</h3>
          <p>Tüm cüzdan ve kartlıklara adınız veya baş harfleriniz ücretsiz işlenir.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Ömür Boyu Atölye Bakımı</h3>
          <p>Dikiş, mekanizma ve deri bakımı için Elon Leather atölyesi her zaman yanınızda.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Özel Hediye Kutusu</h3>
          <p>Her sipariş, mühürlü kart ve özel koruyucu kutusunda hediye edilmeye hazır gelir.</p>
        </div>
      </section>
    </main>
  )
}

/* =========================================================================
   CATEGORY PAGE (Supports all 129 products, subcategories & live search)
   ========================================================================= */
const LEGACY_SLUG_ALIAS: Record<string, string> = {
  'mekanizmali-cuzdan': 'mekanizmali-magsafe-kartlik',
  'klasik-cuzdan': 'klasik-deri-cuzdan',
  'magsafe-kartlik': 'mekanizmali-magsafe-kartlik',
  'seyahat-pasaport': 'deri-canta',
}

export function CategoryPage() {
  const { slug: rawSlug = 'tumu' } = useParams()
  const slug = LEGACY_SLUG_ALIAS[rawSlug] ?? rawSlug
  const navigate = useNavigate()

  const [sort, setSort] = useState('onerilen')
  const [searchQuery, setSearchQuery] = useState('')
  const [subFilter, setSubFilter] = useState('tumu')

  useEffect(() => {
    setSubFilter('tumu')
    setSearchQuery('')
  }, [slug])

  const category = categories.find((item) => item.slug === slug)

  const pageMeta = useMemo(() => {
    if (category) {
      return { title: category.name, description: category.description }
    }
    if (slug === 'cuzdan-kartlik') {
      return {
        title: 'Cüzdan & Kartlık',
        description: 'Mıknatıslı cüzdanlar, klasik el dikimi modeller, mekanizmalı & MagSafe kartlıkların tamamı.',
      }
    }
    if (slug === 'yeni-gelenler') {
      return {
        title: 'Yeni Gelenler',
        description: 'Atölyeden yeni çıkan en güncel Elon Leather tasarımları ve sezon renkleri.',
      }
    }
    if (slug === 'cok-satanlar') {
      return {
        title: 'Çok Satan Modeller',
        description: 'Kullanıcılarımızın en çok tercih ettiği imza Elon Leather parçaları.',
      }
    }
    return {
      title: 'Tüm Koleksiyon',
      description: 'Usta ellerde şekillenen, ömür boyu yanınızda taşıyacağınız 129 özgün hakiki deri parça.',
    }
  }, [category, slug])

  const baseVisible = useMemo(() => {
    if (slug === 'tumu') return products
    if (slug === 'cuzdan-kartlik') return products.filter((p) => p.mainCategory === 'Cüzdan & Kartlık')
    if (slug === 'yeni-gelenler') return products.filter((p) => p.isNew)
    if (slug === 'cok-satanlar') return products.filter((p) => p.isBestseller)
    return products.filter((p) => p.categorySlug === slug)
  }, [slug])

  const subCategories = useMemo(() => {
    const unique = Array.from(new Set(baseVisible.map((p) => p.subCategory)))
    return unique.length > 1 ? unique : []
  }, [baseVisible])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR')
    return baseVisible.filter((p) => {
      if (subFilter !== 'tumu' && p.subCategory !== subFilter) return false
      if (!q) return true
      return (
        p.name.toLocaleLowerCase('tr-TR').includes(q) ||
        p.model.toLocaleLowerCase('tr-TR').includes(q) ||
        p.colorName.toLocaleLowerCase('tr-TR').includes(q) ||
        p.category.toLocaleLowerCase('tr-TR').includes(q)
      )
    })
  }, [baseVisible, subFilter, searchQuery])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'artan') return list.sort((a, b) => a.price - b.price)
    if (sort === 'azalan') return list.sort((a, b) => b.price - a.price)
    if (sort === 'alfabetik') return list.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'))
    return list
  }, [filtered, sort])

  return (
    <main className="category-page">
      <section className="category-intro">
        <p className="breadcrumb">
          <Link to="/">Ana Sayfa</Link> / Koleksiyon
        </p>
        <p className="overline">{String(sorted.length).padStart(2, '0')} Parça Listeleniyor</p>
        <h1>{pageMeta.title}</h1>
        <p>{pageMeta.description}</p>
      </section>

      <div className="shop-toolbar">
        <div className="category-pills">
          <button className={slug === 'tumu' ? 'active' : ''} onClick={() => navigate('/kategori/tumu')}>
            Tümü ({products.length})
          </button>
          <button
            className={slug === 'cok-satanlar' ? 'active' : ''}
            onClick={() => navigate('/kategori/cok-satanlar')}
          >
            Çok Satanlar ({products.filter((p) => p.isBestseller).length})
          </button>
          <button
            className={slug === 'yeni-gelenler' ? 'active' : ''}
            onClick={() => navigate('/kategori/yeni-gelenler')}
          >
            Yeni Gelenler ({products.filter((p) => p.isNew).length})
          </button>
          {categories.map((item) => (
            <button
              className={slug === item.slug ? 'active' : ''}
              onClick={() => navigate(`/kategori/${item.slug}`)}
              key={item.slug}
            >
              {item.name} ({item.count})
            </button>
          ))}
        </div>

        <div className="toolbar-controls">
          <div className="catalog-search-box">
            <Icon name="search" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Model, ürün veya renk ara..."
              aria-label="Katalogda ara"
            />
          </div>

          <label className="sort-label">
            Sırala
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="onerilen">Önerilen Sıralama</option>
              <option value="artan">Fiyat: Düşükten Yükseğe</option>
              <option value="azalan">Fiyat: Yüksekten Düşüğe</option>
              <option value="alfabetik">İsme Göre (A-Z)</option>
            </select>
          </label>
        </div>
      </div>

      {subCategories.length > 0 && (
        <div className="subcategory-pills" role="group" aria-label="Alt kategori filtreleri">
          <button
            type="button"
            className={subFilter === 'tumu' ? 'active' : ''}
            onClick={() => setSubFilter('tumu')}
          >
            Tüm Alt Türler
          </button>
          {subCategories.map((sub) => (
            <button
              type="button"
              key={sub}
              className={subFilter === sub ? 'active' : ''}
              onClick={() => setSubFilter(sub)}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-catalog-state">
          <p className="overline">Sonuç Bulunamadı</p>
          <h2>Aradığınız kriterde parça bulunamadı.</h2>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSubFilter('tumu')
            }}
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <section className="catalog-grid">
          {sorted.map((product, index) => (
            <ProductCard product={product} index={index} key={product.slug} />
          ))}
        </section>
      )}
    </main>
  )
}

/* =========================================================================
   PRODUCT DETAIL PAGE (Multi-image gallery & sibling color variant navigation)
   ========================================================================= */
export function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useOutletContext<StoreContext>()
  const product = products.find((item) => item.slug === slug)

  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [activeDetail, setActiveDetail] = useState('detay')
  const [wantsEngraving, setWantsEngraving] = useState(false)
  const [engravingText, setEngravingText] = useState('')
  const [phoneModel, setPhoneModel] = useState('')

  useEffect(() => {
    setActiveImgIdx(0)
    setQuantity(1)
    setActiveDetail('detay')
  }, [slug])

  // Real sibling color products belonging to the exact same model
  const siblingVariants = useMemo(() => {
    if (!product) return []
    return products.filter(
      (item) => item.model === product.model && item.categorySlug === product.categorySlug
    )
  }, [product])

  const related = useMemo(() => {
    if (!product) return []
    const sameCategoryOtherModels = products.filter(
      (item) => item.categorySlug === product.categorySlug && item.model !== product.model
    )
    const fallback = products.filter(
      (item) => item.categorySlug !== product.categorySlug && item.isBestseller
    )
    return (sameCategoryOtherModels.length >= 3 ? sameCategoryOtherModels : [...sameCategoryOtherModels, ...fallback]).slice(0, 3)
  }, [product])

  if (!product) return <NotFound />

  const images = product.images.length > 0 ? product.images : ['/assets/elon-logo.png']
  const safeImgIdx = activeImgIdx < images.length ? activeImgIdx : 0

  const isPhoneCase = product.categorySlug === 'deri-telefon-kilifi'

  const mergedDetails = useMemo(() => {
    const seen = new Set(product.details.map((d) => d.toLocaleLowerCase('tr-TR')))
    const extra = craftStandards.filter((s) => {
      if (!product.isPersonalizable && s.includes('İsim')) return false
      return !seen.has(s.toLocaleLowerCase('tr-TR'))
    })
    return [...product.details, ...extra]
  }, [product])

  const handleAdd = () => {
    addToCart(
      product,
      quantity,
      product.colorName,
      wantsEngraving ? engravingText : '',
      'blind',
      isPhoneCase ? phoneModel.trim() : ''
    )
  }

  return (
    <main className="product-page">
      <div className="product-gallery">
        <div className="gallery-stage">
          <img
            src={productImgUrl(images[safeImgIdx], 1400)}
            alt={`${product.name} - Görsel ${safeImgIdx + 1}`}
          />
          {product.tag && <span className="product-tag">{product.tag}</span>}
          {product.rfidProtected && <span className="rfid-tag">RFID Korumalı</span>}

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
            {images.map((imgUrl, idx) => (
              <button
                type="button"
                key={`${imgUrl}-${idx}`}
                className={safeImgIdx === idx ? 'active' : ''}
                onClick={() => setActiveImgIdx(idx)}
                aria-label={`${product.name} görsel ${idx + 1}`}
              >
                <img src={productImgUrl(imgUrl, 240)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="product-purchase">
        <p className="breadcrumb">
          <Link to="/">Ana Sayfa</Link> / <Link to={`/kategori/${product.categorySlug}`}>{product.category}</Link>
        </p>
        <p className="overline">
          {product.model} · {product.subCategory}
        </p>
        <h1>{product.name}</h1>
        <strong className="detail-price">{formatPrice(product.price)}</strong>
        <p className="product-description">{product.description}</p>

        {/* Real Sibling Color Switcher */}
        <div className="option-block">
          <div className="option-label">
            <span>Deri Rengi {siblingVariants.length > 1 ? `(${siblingVariants.length} Seçenek)` : ''}</span>
            <strong>{product.colorName}</strong>
          </div>
          <div className="swatches">
            {siblingVariants.map((sib) => (
              <button
                type="button"
                key={sib.slug}
                className={sib.slug === product.slug ? 'active' : ''}
                onClick={() => {
                  if (sib.slug !== product.slug) navigate(`/urun/${sib.slug}`)
                }}
                title={sib.colorName}
                aria-label={sib.colorName}
              >
                <i style={{ background: sib.colorHex }} />
              </button>
            ))}
          </div>
        </div>

        {/* Phone model input for Phone Case category */}
        {isPhoneCase && (
          <div className="personalization-box">
            <div className="p-input-field">
              <label htmlFor="phone-model-input">Telefon Modeliniz (Birebir Kalıp Üretim İçin)</label>
              <input
                id="phone-model-input"
                type="text"
                maxLength={40}
                value={phoneModel}
                onChange={(e) => setPhoneModel(e.target.value)}
                placeholder="Örn: iPhone 16 Pro Max"
              />
            </div>
          </div>
        )}

        {/* Personalization Section (Free Name Embossing) */}
        {product.isPersonalizable && (
          <div className="personalization-box">
            <div className="personalization-toggle-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={wantsEngraving}
                  onChange={(e) => setWantsEngraving(e.target.checked)}
                />
                <span className="checkbox-custom" />
                <div>
                  <strong>Üzerine Ücretsiz İsim / Baş Harf Yazılsın</strong>
                  <small>Geleneksel sıcak gofraj presiyle deriye kazınır (+0 TL)</small>
                </div>
              </label>
            </div>

            {wantsEngraving && (
              <div className="personalization-inputs">
                <div className="p-input-field">
                  <label htmlFor="p-text">Yazılacak İsim veya Baş Harfler (Maks 22)</label>
                  <input
                    id="p-text"
                    type="text"
                    maxLength={22}
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    placeholder="Örn: OĞUZ OLGUN"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quantity & Buy Row */}
        <div className="buy-row">
          <div className="quantity">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
              <Icon name="minus" />
            </button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((value) => value + 1)}>
              <Icon name="plus" />
            </button>
          </div>
          <button type="button" className="add-cart" onClick={handleAdd}>
            Sepete Ekle <span>{formatPrice(product.price * quantity)}</span>
          </button>
        </div>

        <p className="stock-note">
          <i /> Stokta · Bugün kargoya hazır · Ücretsiz & Sigortalı Teslimat
        </p>

        {/* Tabs */}
        <div className="detail-tabs">
          <div>
            {['detay', 'kargo', 'bakim'].map((tab) => (
              <button
                type="button"
                className={activeDetail === tab ? 'active' : ''}
                onClick={() => setActiveDetail(tab)}
                key={tab}
              >
                {tab === 'detay' ? 'Ürün Detayı' : tab === 'kargo' ? 'Teslimat & Kutu' : 'Deri Bakımı'}
              </button>
            ))}
          </div>
          {activeDetail === 'detay' && (
            <ul>
              {mergedDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
          {activeDetail === 'kargo' && (
            <p>
              Tüm siparişleriniz özel Elon Leather koruma kutusu ve bez kese içerisinde, sigortalı kargo ile gönderilir.
              Saat 14:00'e kadar verilen siparişlerde aynı gün kargoya teslim edilir.
            </p>
          )}
          {activeDetail === 'bakim' && (
            <p>
              Bitkisel tabaklanmış ve doğal dokulu hakiki deriler kimyasal madde sevmez. Kuru ve yumuşak pamuklu bir bezle hafifçe silin.
              Yıllar geçtikçe derinleşen rengi ve kazandığı patina derinizin eşsiz imzasıdır.
            </p>
          )}
        </div>
      </section>

      <section className="product-story">
        <p className="overline">Zanaatkâr Notu</p>
        <h2>
          Seri üretim değil.<br />
          <em>Sizin için özel üretim.</em>
        </h2>
        <p>
          Deri üzerindeki doğal ton geçişleri ve hafif izler kusur değil; doğanın ve derinin karakteridir.
          Hiçbir Elon Leather parçası dünyada bir başkasıyla tamamen aynı değildir.
        </p>
      </section>

      {related.length > 0 && (
        <section className="related">
          <header className="split-heading">
            <div>
              <p className="overline">Birlikte İyi Gider</p>
              <h2>Tamamlayıcı Parçalar</h2>
            </div>
          </header>
          <div className="catalog-grid">
            {related.map((item, index) => (
              <ProductCard product={item} index={index} key={item.slug} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export function NotFound() {
  return (
    <main className="not-found">
      <p className="overline">404</p>
      <h1>Bu parça atölyede bulunamadı.</h1>
      <Link to="/">
        Ana Sayfaya Dön <Icon name="arrow" />
      </Link>
    </main>
  )
}

function Footer() {
  const submit = (event: FormEvent) => event.preventDefault()
  return (
    <footer>
      <div className="footer-newsletter">
        <p className="overline">Elon Leather Gazette</p>
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
      </div>

      <div className="footer-base">
        <Logo light />
        <nav>
          {categories.map((category) => (
            <Link to={`/kategori/${category.slug}`} key={category.slug}>
              {category.name}
            </Link>
          ))}
        </nav>
        <div>
          <a href="mailto:destek@elonleather.com">destek@elonleather.com</a>
          <p>© 2025 Elon Leather · El Yapımı Hakiki Deri</p>
        </div>
      </div>
    </footer>
  )
}
