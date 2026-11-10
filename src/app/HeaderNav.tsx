import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { categories, formatPrice, productImgUrl, products } from './data'

type HeaderNavProps = {
  cartCount: number
  onOpenCart: () => void
  onOpenMobileMenu: () => void
}

const NAV_SHORT_LABELS: Record<string, string> = {
  'miknatisli-deri-cuzdan': 'Mıknatıslı',
  'klasik-deri-cuzdan': 'Klasik Cüzdan',
  'mekanizmali-magsafe-kartlik': 'Mekanizmalı',
  'ince-deri-kartlik': 'İnce Kartlık',
  'deri-canta': 'Çanta & Pasaport',
  'deri-telefon-kilifi': 'Telefon Kılıfı',
  aksesuar: 'Aksesuar',
}

export function HeaderNav({ cartCount, onOpenCart, onOpenMobileMenu }: HeaderNavProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeCatSlug, setActiveCatSlug] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const closeTimerRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
      if (window.scrollY > 40) {
        setActiveCatSlug(null)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close overlays whenever route changes
  useEffect(() => {
    setActiveCatSlug(null)
    setSearchOpen(false)
  }, [pathname, search])

  // Escape closes mega-menu or spotlight search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCatSlug(null)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchInputRef.current?.focus(), 60)
    }
  }, [searchOpen])

  const openCategoryMenu = (slug: string) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSearchOpen(false)
    setActiveCatSlug(slug)
  }

  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setActiveCatSlug(null)
    }, 150)
  }

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === activeCatSlug) ?? null,
    [activeCatSlug]
  )

  const activeSubCategories = useMemo(() => {
    if (!activeCategory) return []
    const items = products.filter((p) => p.categorySlug === activeCategory.slug)
    return Array.from(new Set(items.map((p) => p.subCategory)))
  }, [activeCategory])

  // Pick up to 4 distinct models inside the hovered category
  const activeFeaturedModels = useMemo(() => {
    if (!activeCategory) return []
    const items = products.filter((p) => p.categorySlug === activeCategory.slug)
    const seen = new Set<string>()
    const result = []
    for (const item of items) {
      if (!seen.has(item.model)) {
        seen.add(item.model)
        result.push(item)
        if (result.length >= 4) break
      }
    }
    return result
  }, [activeCategory])

  const spotlightResults = useMemo(() => {
    const q = searchInput.trim().toLocaleLowerCase('tr-TR')
    if (!q) {
      return products.filter((p) => p.isBestseller).slice(0, 6)
    }
    return products
      .filter(
        (p) =>
          p.name.toLocaleLowerCase('tr-TR').includes(q) ||
          p.model.toLocaleLowerCase('tr-TR').includes(q) ||
          p.colorName.toLocaleLowerCase('tr-TR').includes(q) ||
          p.category.toLocaleLowerCase('tr-TR').includes(q) ||
          p.subCategory.toLocaleLowerCase('tr-TR').includes(q)
      )
      .slice(0, 6)
  }, [searchInput])

  const submitSpotlight = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchInput.trim()
    setSearchOpen(false)
    navigate(q ? `/kategori/tumu?ara=${encodeURIComponent(q)}` : '/kategori/tumu')
  }

  return (
    <div className="apple-header-shell">
      <header
        className={`apple-global-nav ${scrolled || activeCatSlug || searchOpen ? 'is-elevated' : ''}`}
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
      >
        <div className="apple-nav-inner">
          {/* Left: Brand Identity */}
          <Link to="/" className="apple-nav-brand" aria-label="ELON LEATHER Ana Sayfa">
            <img src="/assets/elon-mark.png" alt="EL" className="apple-nav-mark" />
            <span className="apple-nav-wordmark">ELON LEATHER</span>
          </Link>

          {/* Center: Clean Category Links (Desktop) */}
          <nav className="apple-nav-links" aria-label="Kategori Menüsü">
            {categories.map((cat) => {
              const isCurrent =
                activeCatSlug === cat.slug || pathname === `/kategori/${cat.slug}`
              return (
                <Link
                  key={cat.slug}
                  to={`/kategori/${cat.slug}`}
                  className={`apple-nav-item ${isCurrent ? 'is-active' : ''}`}
                  onMouseEnter={() => openCategoryMenu(cat.slug)}
                  onFocus={() => openCategoryMenu(cat.slug)}
                >
                  {NAV_SHORT_LABELS[cat.slug] ?? cat.name}
                </Link>
              )
            })}
            <Link
              to="/kategori/tumu"
              className={`apple-nav-item ${pathname === '/kategori/tumu' ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveCatSlug(null)}
            >
              Tümü
            </Link>
          </nav>

          {/* Right: Spotlight Search, Cart Bag, Mobile Drawer Trigger */}
          <div className="apple-nav-actions">
            <button
              type="button"
              className={`apple-icon-btn ${searchOpen ? 'is-active' : ''}`}
              onClick={() => {
                setActiveCatSlug(null)
                setSearchOpen((prev) => !prev)
              }}
              aria-label="Katalogda Ara"
              aria-expanded={searchOpen}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            <button
              type="button"
              className="apple-bag-btn"
              onClick={() => {
                setActiveCatSlug(null)
                setSearchOpen(false)
                onOpenCart()
              }}
              aria-label="Sepeti Aç"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
                <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
              </svg>
              {cartCount > 0 && <span className="apple-bag-count">{cartCount}</span>}
            </button>

            <button
              type="button"
              className="apple-mobile-trigger"
              onClick={() => {
                setActiveCatSlug(null)
                setSearchOpen(false)
                onOpenMobileMenu()
              }}
              aria-label="Menüyü Aç"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7.5h16M4 16.5h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Apple-Style Mega Menu Flyout Panel */}
        {activeCategory && (
          <div className="apple-flyout-panel" role="region" aria-label={activeCategory.name}>
            <div className="apple-flyout-inner">
              <div className="apple-flyout-col">
                <p className="apple-flyout-eyebrow">{activeCategory.name} · {activeCategory.count} Parça</p>
                <ul className="apple-flyout-sublist">
                  <li>
                    <Link to={`/kategori/${activeCategory.slug}`} className="is-strong">
                      Tüm {activeCategory.name}
                    </Link>
                  </li>
                  {activeSubCategories.map((sub) => (
                    <li key={sub}>
                      <Link to={`/kategori/${activeCategory.slug}?alt=${encodeURIComponent(sub)}`}>
                        {sub}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/kategori/yeni-gelenler">Yeni Gelenler</Link>
                  </li>
                  <li>
                    <Link to="/kategori/cok-satanlar">Çok Satan Modeller</Link>
                  </li>
                </ul>
              </div>

              <div className="apple-flyout-showcase">
                <p className="apple-flyout-eyebrow">Öne Çıkan Modeller</p>
                <div className="apple-flyout-grid">
                  {activeFeaturedModels.map((item) => (
                    <Link key={item.slug} to={`/urun/${item.slug}`} className="apple-flyout-card">
                      <div className="apple-flyout-thumb">
                        <img src={productImgUrl(item.images[0], 360)} alt={item.name} />
                      </div>
                      <strong>{item.model}</strong>
                      <span>{item.colorName}</span>
                      <b>{formatPrice(item.price)}</b>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apple-Style Spotlight Instant Search Panel */}
        {searchOpen && (
          <div className="apple-flyout-panel spotlight-panel" role="dialog" aria-label="Hızlı Ürün Arama">
            <div className="apple-spotlight-inner">
              <form onSubmit={submitSpotlight} className="apple-spotlight-form">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="elonleather.com kataloğunda ara: Apex, Peru, MagSafe, Antik Taba..."
                  aria-label="Katalog arama"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="spotlight-clear-btn"
                    onClick={() => setSearchInput('')}
                  >
                    Temizle
                  </button>
                )}
              </form>

              <div className="spotlight-quick-tags">
                <span>Popüler Aramalar:</span>
                {['Apex', 'MagSafe', 'Oslo', 'Pasaportluk', 'Antik Taba', 'Telefon Kılıfı'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setSearchInput(term)}
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className="spotlight-results-grid">
                {spotlightResults.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/urun/${item.slug}`}
                    className="spotlight-result-item"
                  >
                    <img src={productImgUrl(item.images[0], 240)} alt={item.name} />
                    <div>
                      <small>{item.category}</small>
                      <strong>{item.name}</strong>
                      <span>{formatPrice(item.price)}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {searchInput.trim() && (
                <div className="spotlight-footer-action">
                  <button
                    type="button"
                    onClick={() => {
                      const q = searchInput.trim()
                      setSearchOpen(false)
                      navigate(`/kategori/tumu?ara=${encodeURIComponent(q)}`)
                    }}
                  >
                    &ldquo;{searchInput.trim()}&rdquo; için tüm katalog sonuçlarını gör →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Subtle frosted backdrop behind dropdown */}
      {(activeCatSlug || searchOpen) && (
        <div
          className="apple-nav-backdrop"
          onMouseEnter={() => {
            if (activeCatSlug) scheduleClose()
          }}
          onClick={() => {
            setActiveCatSlug(null)
            setSearchOpen(false)
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
