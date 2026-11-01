import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router'
import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { categories, formatPrice, products, type Product } from './data'

import { CanvasScrollHero } from './CanvasScrollHero'

export type CartItem = {
  product: Product
  quantity: number
  color: string
  engraving?: string
  foilStyle?: 'blind' | 'gold' | 'silver'
}

type StoreContext = {
  addToCart: (
    product: Product,
    quantity?: number,
    color?: string,
    engraving?: string,
    foilStyle?: 'blind' | 'gold' | 'silver'
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
      <img src="/assets/cuoriva-mark.png" alt="CUORIVA" />
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
    color = product.colors[0].name,
    engraving = '',
    foilStyle: 'blind' | 'gold' | 'silver' = 'blind'
  ) => {
    setCart((current) => {
      const match = current.find(
        (item) =>
          item.product.slug === product.slug &&
          item.color === color &&
          item.engraving === engraving &&
          item.foilStyle === foilStyle
      )
      if (match) {
        return current.map((item) =>
          item === match ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...current, { product, quantity, color, engraving, foilStyle }]
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
        <header className="cuoriva-nav-header is-scrolled">
          <div className="nav-container">
            <div className="nav-left">
              <Link to="/" className="nav-brand" aria-label="Cuoriva Ana Sayfa">
                <span className="cr-monogram-wrap">
                  <img src="/assets/cuoriva-mark.png" alt="CR" className="cr-monogram" />
                </span>
                <div className="nav-brand-text">
                  <span className="brand-title">CUORIVA</span>
                  <span className="brand-subtitle">LEATHER GOODS</span>
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
              <a href="mailto:destek@cuoriva.com" className="nav-link">
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
          <p className="overline">CUORIVA LEATHER GOODS</p>
          <nav>
            <NavLink to="/kategori/tumu" onClick={() => setMenuOpen(false)}>
              <small>00</small>Tüm Koleksiyon<Icon name="arrow" />
            </NavLink>
            {categories.map((category) => (
              <NavLink key={category.slug} to={`/kategori/${category.slug}`} onClick={() => setMenuOpen(false)}>
                <small>{category.index}</small>
                {category.name}
                <Icon name="arrow" />
              </NavLink>
            ))}
          </nav>
          <div className="menu-secondary">
            <Link to="/#motto" onClick={() => setMenuOpen(false)}>Mottomuz & Hikâye</Link>
            <Link to="/#kisisellestir" onClick={() => setMenuOpen(false)}>İsim Baskı Atölyesi</Link>
            <Link to="/#mekanizma" onClick={() => setMenuOpen(false)}>Mekanizma Teknolojisi</Link>
            <a href="mailto:destek@cuoriva.com">İletişim</a>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`drawer-backdrop ${cartOpen ? 'is-open' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? 'is-open' : ''}`} aria-label="Sepet">
        <div className="cart-head">
          <div>
            <p className="overline">Cuoriva Atelier</p>
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
                <img src={item.product.images[0]} alt={item.product.name} />
                <div>
                  <h3>{item.product.name}</h3>
                  <p>
                    {item.color} · Adet {item.quantity}
                  </p>
                  {item.engraving && (
                    <span className="cart-engraving-badge">
                      ✦ Özel Baskı: <strong>{item.engraving}</strong> (
                      {item.foilStyle === 'gold'
                        ? 'Altın Varak'
                        : item.foilStyle === 'silver'
                        ? 'Gümüş Varak'
                        : 'Sıcak Gofraj'}
                      )
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
              <span>Ücretsiz Sigortalı Kargo & Özel Ahşap Hediye Kutusu Dahil</span>
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
  return (
    <article className="shop-card" style={{ '--delay': `${index * 60}ms` } as CSSProperties}>
      <Link to={`/urun/${product.slug}`} className="shop-card-image">
        {product.tag && <span className="product-tag">{product.tag}</span>}
        {product.rfidProtected && <span className="rfid-tag">RFID Korumalı</span>}
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        <div className="card-action">
          İncele & Kişiselleştir <Icon name="arrow" />
        </div>
      </Link>
      <div className="shop-card-info">
        <div>
          <p>{product.category}</p>
          <Link to={`/urun/${product.slug}`}>{product.name}</Link>
          {product.isPersonalizable && <span className="custom-perk-hint">✦ Ücretsiz İsim Baskısı</span>}
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
            Alttaki ergonomik tetiği tek bir parmak hareketiyle kaydırın; içerideki 6 kart, kademeli merdiven formuyla anında karşınıza çıksın.
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
                <strong>Patentli Kademe Mekanizması</strong>
                <span>Kartlar birbirine sürtünmeden basamak şeklinde yükselir, istediğiniz karta 1 saniyede erişin.</span>
              </div>
            </li>
            <li>
              <Icon name="check" />
              <div>
                <strong>Crazy Horse Hakiki Deri Kaplama</strong>
                <span>Alüminyum gövdenin dışı, kullandıkça kendine has vintage karakter kazanan birinci sınıf deri ile kaplanmıştır.</span>
              </div>
            </li>
          </ul>

          <Link to="/kategori/mekanizmali-cuzdan" className="primary-link">
            Mekanizmalı Modelleri İncele <Icon name="arrow" />
          </Link>
        </div>

        <div className="mechanism-interactive-box">
          <div className="interactive-cardholder-wrap">
            <div className={`cardholder-device ${ejected ? 'is-ejected' : ''}`}>
              {/* Emerging Cards */}
              <div className="ejected-cards-layer">
                <div className="sim-card card-1">
                  <span>CUORIVA BLACK</span>
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
                <div className="wallet-embossed-brand">CUORIVA</div>
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
  const [name, setName] = useState('OĞUZ OLGUN')
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
          Cuoriva atölyesinin zamansız zanaat ayrıntısı: Sipariş verdiğiniz her parçaya,
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

          {/* Cuoriva Brand Stamp (Top Left) */}
          <div className="swatch-brand-stamp">
            <img src="/assets/cuoriva-mark.png" alt="CUORIVA" className="swatch-cr-mark" />
            <div className="swatch-brand-info">
              <span className="swatch-brand-name">CUORIVA</span>
              <span className="swatch-brand-sub">LEATHER GOODS</span>
            </div>
          </div>

          {/* Refined Bottom-Right Personalized Deboss Name */}
          <div className="swatch-corner-emboss">
            <div className="embossed-name-output style-blind">
              {name.trim() ? name.toUpperCase() : 'İSMİNİZ'}
            </div>
          </div>
        </div>

        {/* Customization Controls */}
        <div className="studio-controls">
          <div className="control-group">
            <label htmlFor="custom-name-input">
              <span>Deriye İşlenecek İsim veya Baş Harfler</span>
              <small>Maks. 16 Karakter (Ücretsiz)</small>
            </label>
            <input
              id="custom-name-input"
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: OĞUZ OLGUN ya da O.O."
            />
          </div>

          <div className="control-group">
            <label>Deri Tonunu Önizleyin</label>
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
export function HomePage() {
  const { openMenu, openCart, cartCount } = useOutletContext<StoreContext>()

  return (
    <main>
      {/* 1. SCROLL-DRIVEN VIDEO HERO (Canvas + WebP image sequence scrubbed by scroll) */}
      <CanvasScrollHero
        onOpenMenu={openMenu}
        onOpenCart={openCart}
        cartCount={cartCount}
      />

      {/* 2. Interactive RFID Pop-up Mechanism Simulator */}
      <MechanismSimulator />

      {/* 3. Category Runway */}
      <section className="category-runway" id="koleksiyon">
        <header>
          <p className="overline">Koleksiyonlar</p>
          <h2>Her yolculuk için bir Cuoriva.</h2>
        </header>
        <div className="category-list">
          {categories.map((category) => (
            <Link to={`/kategori/${category.slug}`} className="category-row" key={category.slug}>
              <span>{category.index}</span>
              <div>
                <h3>{category.name}</h3>
                <p className="category-subtext">{category.description}</p>
              </div>
              <div className="category-thumb">
                <img src={category.image} alt={category.name} loading="lazy" />
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
            <h2>Mekanizmalı & İkonik Modeller</h2>
          </div>
          <Link to="/kategori/tumu">
            Tüm Koleksiyonu Gör <Icon name="arrow" />
          </Link>
        </header>
        <div className="editorial-grid">
          {products.slice(0, 6).map((product, index) => (
            <ProductCard product={product} index={index} key={product.slug} />
          ))}
        </div>
      </section>

      {/* 6. Bohemian Craftsmanship Editorial Band */}
      <section className="craft-band">
        <div className="craft-mark">
          <img src="/assets/cuoriva-mark.png" alt="Cuoriva Mark" />
        </div>
        <div className="craft-band-image">
          <img src="/assets/cuoriva-leather-emboss.jpg" alt="Cuoriva damgalı hakiki deri ve saraç dikişi" />
        </div>
        <div className="craft-band-copy">
          <p className="overline">Derinin Hafızası</p>
          <h2>
            Her çizik,<br />
            <em>size ait bir hikâye.</em>
          </h2>
          <p>
            Crazy horse ve bitkisel tabaklanmış deriler zamanı gizlemez. Dokunduğunuz anların sıcaklığını,
            cebinizdeki formunu ve yaptığınız yolculukları yüzeyindeki benzersiz patinada saklar.
            Kullandıkça eskiyen değil, kullandıkça güzelleşen bir yaşam ortağı.
          </p>
          <div className="craft-details-checklist">
            <span>✓ Mumlu iplikle elde çift saraç dikişi</span>
            <span>✓ Masif pirinç dayanıklı aksesuarlar</span>
            <span>✓ Eonaks & Getto Deri standartlarının ötesinde bohem lüks</span>
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
          <p>Dikiş, mekanizma ve deri bakımı için Cuoriva atölyesi her zaman yanınızda.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Özel Ahşap Hediye Kutusu</h3>
          <p>Her sipariş, mühürlü kart ve özel koruyucu kesesinde hediye edilmeye hazır gelir.</p>
        </div>
      </section>
    </main>
  )
}

/* =========================================================================
   CATEGORY PAGE
   ========================================================================= */
export function CategoryPage() {
  const { slug = 'tumu' } = useParams()
  const navigate = useNavigate()
  const [sort, setSort] = useState('onerilen')
  const category = categories.find((item) => item.slug === slug)
  const visible = slug === 'tumu' ? products : products.filter((product) => product.categorySlug === slug)
  const sorted = useMemo(
    () =>
      [...visible].sort((a, b) =>
        sort === 'artan' ? a.price - b.price : sort === 'azalan' ? b.price - a.price : 0
      ),
    [visible, sort]
  )

  return (
    <main className="category-page">
      <section className="category-intro">
        <p className="breadcrumb">
          <Link to="/">Ana Sayfa</Link> / Koleksiyon
        </p>
        <p className="overline">{String(visible.length).padStart(2, '0')} Parça Listeleniyor</p>
        <h1>{category?.name ?? 'Tüm Parçalar'}</h1>
        <p>{category?.description ?? 'Usta ellerde şekillenen, ömür boyu yanınızda taşıyacağınız hakiki deri parçalar.'}</p>
      </section>

      <div className="shop-toolbar">
        <div className="category-pills">
          <button className={slug === 'tumu' ? 'active' : ''} onClick={() => navigate('/kategori/tumu')}>
            Tümü
          </button>
          {categories.map((item) => (
            <button
              className={slug === item.slug ? 'active' : ''}
              onClick={() => navigate(`/kategori/${item.slug}`)}
              key={item.slug}
            >
              {item.name}
            </button>
          ))}
        </div>
        <label>
          Sırala
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="onerilen">Önerilen Sıralama</option>
            <option value="artan">Fiyat: Düşükten Yükseğe</option>
            <option value="azalan">Fiyat: Yüksekten Düşüğe</option>
          </select>
        </label>
      </div>

      <section className="catalog-grid">
        {sorted.map((product, index) => (
          <ProductCard product={product} index={index} key={product.slug} />
        ))}
      </section>
    </main>
  )
}

/* =========================================================================
   PRODUCT DETAIL PAGE
   ========================================================================= */
export function ProductPage() {
  const { slug } = useParams()
  const { addToCart } = useOutletContext<StoreContext>()
  const product = products.find((item) => item.slug === slug)
  const [color, setColor] = useState(product?.colors[0].name ?? '')
  const [quantity, setQuantity] = useState(1)
  const [activeDetail, setActiveDetail] = useState('detay')

  // Personalization State
  const [wantsEngraving, setWantsEngraving] = useState(false)
  const [engravingText, setEngravingText] = useState('')
  const [foilStyle, setFoilStyle] = useState<'blind' | 'gold' | 'silver'>('blind')

  if (!product) return <NotFound />
  const related = products
    .filter((item) => item.categorySlug === product.categorySlug && item.slug !== product.slug)
    .slice(0, 3)

  const handleAdd = () => {
    addToCart(product, quantity, color, wantsEngraving ? engravingText : '', foilStyle)
  }

  return (
    <main className="product-page">
      <div className="product-gallery">
        <div className="gallery-main">
          <img src={product.images[0]} alt={product.name} />
          {product.tag && <span className="product-tag">{product.tag}</span>}
          {product.rfidProtected && <span className="rfid-tag">RFID Korumalı</span>}
        </div>
        <div className="gallery-secondary">
          <img src={product.images[1]} alt={`${product.name} detay görünümü`} />
        </div>
      </div>

      <section className="product-purchase">
        <p className="breadcrumb">
          <Link to="/">Ana Sayfa</Link> / <Link to={`/kategori/${product.categorySlug}`}>{product.category}</Link>
        </p>
        <p className="overline">{product.category}</p>
        <h1>{product.name}</h1>
        <strong className="detail-price">{formatPrice(product.price)}</strong>
        <p className="product-description">{product.description}</p>

        {/* Color Picker */}
        <div className="option-block">
          <div className="option-label">
            <span>Deri Rengi</span>
            <strong>{color}</strong>
          </div>
          <div className="swatches">
            {product.colors.map((item) => (
              <button
                type="button"
                key={item.name}
                className={color === item.name ? 'active' : ''}
                onClick={() => setColor(item.name)}
                aria-label={item.name}
              >
                <i style={{ background: item.value }} />
              </button>
            ))}
          </div>
        </div>

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
                  <small>Geleneksel sıcak presle deriye kazınır (+0 TL)</small>
                </div>
              </label>
            </div>

            {wantsEngraving && (
              <div className="personalization-inputs">
                <div className="p-input-field">
                  <label htmlFor="p-text">Yazılacak İsim veya Baş Harfler (Maks 15)</label>
                  <input
                    id="p-text"
                    type="text"
                    maxLength={15}
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    placeholder="Örn: OĞUZ OLGUN"
                  />
                </div>

                <div className="p-style-selector">
                  <button
                    type="button"
                    className={foilStyle === 'blind' ? 'active' : ''}
                    onClick={() => setFoilStyle('blind')}
                  >
                    Sıcak Gofraj (Deboss)
                  </button>
                  <button
                    type="button"
                    className={foilStyle === 'gold' ? 'active' : ''}
                    onClick={() => setFoilStyle('gold')}
                  >
                    Altın Varak
                  </button>
                  <button
                    type="button"
                    className={foilStyle === 'silver' ? 'active' : ''}
                    onClick={() => setFoilStyle('silver')}
                  >
                    Gümüş Varak
                  </button>
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
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
          {activeDetail === 'kargo' && (
            <p>
              Tüm siparişleriniz özel ahşap Cuoriva koruma kutusu ve bez kese içerisinde, sigortalı kargo ile gönderilir.
              Saat 14:00'e kadar verilen siparişlerde aynı gün kargoya teslim edilir.
            </p>
          )}
          {activeDetail === 'bakim' && (
            <p>
              Crazy horse ve bitkisel tabaklanmış deriler kimyasal madde sevmez. Kuru ve yumuşak pamuklu bir bezle hafifçe silin.
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
          Hiçbir Cuoriva parçası dünyada bir başkasıyla tamamen aynı değildir.
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
        <p className="overline">Cuoriva Gazette</p>
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
          <a href="mailto:destek@cuoriva.com">destek@cuoriva.com</a>
          <p>© 2025 Cuoriva Leather Goods · El Yapımı Hakiki Deri</p>
        </div>
      </div>
    </footer>
  )
}
