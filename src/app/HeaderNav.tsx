import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  formatPrice,
  getCategoryBySlug,
  getChildCategories,
  getProductsByCategory,
  parentCategories,
  products,
} from './data'

type HeaderNavProps = {
  cartCount: number
  onOpenCart: () => void
  onOpenMobileMenu: () => void
}

export function HeaderNav({ cartCount, onOpenCart, onOpenMobileMenu }: HeaderNavProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeParentSlug, setActiveParentSlug] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const closeTimerRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
      if (window.scrollY > 40) {
        setActiveParentSlug(null)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setActiveParentSlug(null)
    setSearchOpen(false)
  }, [pathname, search])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveParentSlug(null)
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

  const openParentMenu = (slug: string) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSearchOpen(false)
    setActiveParentSlug(slug)
  }

  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setActiveParentSlug(null)
    }, 150)
  }

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const activeParent = useMemo(
    () => parentCategories.find((c) => c.slug === activeParentSlug) ?? null,
    [activeParentSlug]
  )

  const activeChildren = useMemo(
    () => (activeParent ? getChildCategories(activeParent.slug) : []),
    [activeParent]
  )

  const activeFeaturedModels = useMemo(() => {
    if (!activeParent) return []
    return getProductsByCategory(activeParent.slug).slice(0, 4)
  }, [activeParent])

  const spotlightResults = useMemo(() => {
    const q = searchInput.trim().toLocaleLowerCase('tr-TR')
    if (!q) {
      return products.slice(0, 6).map((prod) => ({
        prod,
        variant: prod.variants[0],
        catName: getCategoryBySlug(prod.primaryCategory)?.name || prod.productType,
      }))
    }

    const matches: Array<{
      prod: (typeof products)[number]
      variant: (typeof products)[number]['variants'][number]
      catName: string
    }> = []

    for (const prod of products) {
      const catName = getCategoryBySlug(prod.primaryCategory)?.name || prod.productType
      const modelMatch =
        prod.name.toLocaleLowerCase('tr-TR').includes(q) ||
        prod.modelName.toLocaleLowerCase('tr-TR').includes(q) ||
        prod.productType.toLocaleLowerCase('tr-TR').includes(q) ||
        catName.toLocaleLowerCase('tr-TR').includes(q)

      const matchedVariant = prod.variants.find((v) =>
        v.renk.toLocaleLowerCase('tr-TR').includes(q)
      )

      if (modelMatch || matchedVariant) {
        matches.push({
          prod,
          variant: matchedVariant || prod.variants[0],
          catName,
        })
      }
      if (matches.length >= 6) break
    }
    return matches
  }, [searchInput])

  const submitSpotlight = (e: React.FormEvent) => {
    e.preventDefault()
    const first = spotlightResults[0]
    setSearchOpen(false)
    if (first) {
      const hasColorMatch =
        searchInput.trim() &&
        first.variant.renk.toLocaleLowerCase('tr-TR').includes(searchInput.trim().toLocaleLowerCase('tr-TR'))
      navigate(
        hasColorMatch
          ? `/urun/${first.prod.slug}/?renk=${encodeURIComponent(first.variant.renkSlug)}`
          : `/urun/${first.prod.slug}/`
      )
    }
  }

  return (
    <div className="apple-header-shell">
      <header
        className={`apple-global-nav ${scrolled || activeParentSlug || searchOpen ? 'is-elevated' : ''}`}
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
      >
        <div className="apple-nav-inner">
          <Link to="/" className="apple-nav-brand" aria-label="ELON LEATHER Ana Sayfa">
            <img
              src="/assets/elon-mark.png"
              alt="ELON LEATHER amblemi"
              width={28}
              height={28}
              className="apple-nav-mark"
            />
            <span className="apple-nav-wordmark">ELON LEATHER</span>
          </Link>

          <nav className="apple-nav-links" aria-label="Kategori Menüsü">
            {parentCategories.map((cat) => {
              const childSlugs = new Set(getChildCategories(cat.slug).map((c) => `/${c.slug}`))
              const cleanPath = pathname.replace(/\/+$/, '') || '/'
              const isCurrent =
                activeParentSlug === cat.slug ||
                cleanPath === `/${cat.slug}` ||
                childSlugs.has(cleanPath)
              return (
                <Link
                  key={cat.slug}
                  to={`/${cat.slug}/`}
                  className={`apple-nav-item ${isCurrent ? 'is-active' : ''}`}
                  onMouseEnter={() => openParentMenu(cat.slug)}
                  onFocus={() => openParentMenu(cat.slug)}
                >
                  {cat.name}
                </Link>
              )
            })}
            <Link
              to="/hikayemiz/"
              className={`apple-nav-item ${pathname.startsWith('/hikayemiz') ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveParentSlug(null)}
            >
              Hikâyemiz
            </Link>
          </nav>

          <div className="apple-nav-actions">
            <button
              type="button"
              className={`apple-icon-btn ${searchOpen ? 'is-active' : ''}`}
              onClick={() => {
                setActiveParentSlug(null)
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
                setActiveParentSlug(null)
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
                setActiveParentSlug(null)
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

        {/* Mega Menu Flyout Panel */}
        {activeParent && (
          <div className="apple-flyout-panel" role="region" aria-label={activeParent.name}>
            <div className="apple-flyout-inner">
              <div className="apple-flyout-col">
                <p className="apple-flyout-eyebrow">
                  {activeParent.name} · {getProductsByCategory(activeParent.slug).length} Model
                </p>
                <ul className="apple-flyout-sublist">
                  <li>
                    <Link to={`/${activeParent.slug}/`} className="is-strong">
                      Tüm {activeParent.name}
                    </Link>
                  </li>
                  {activeChildren.map((sub) => (
                    <li key={sub.slug}>
                      <Link to={`/${sub.slug}/`}>
                        {sub.name} ({getProductsByCategory(sub.slug).length})
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/#kisisellestir">İsim Baskı Atölyesi</Link>
                  </li>
                </ul>
              </div>

              <div className="apple-flyout-showcase">
                <p className="apple-flyout-eyebrow">Öne Çıkan Modeller</p>
                <div className="apple-flyout-grid">
                  {activeFeaturedModels.map((item) => {
                    const firstVariant = item.variants[0]
                    const thumb = firstVariant?.images[0]
                    const formattedPrice = formatPrice(firstVariant?.price)
                    return (
                      <Link key={item.slug} to={`/urun/${item.slug}/`} className="apple-flyout-card">
                        <div className="apple-flyout-thumb">
                          {thumb && (
                            <img
                              src={thumb.thumb}
                              alt={thumb.alt}
                              width={thumb.width}
                              height={thumb.height}
                              loading="lazy"
                            />
                          )}
                        </div>
                        <strong>{item.modelName}</strong>
                        <span>
                          {item.variants.length} Renk · {firstVariant?.renk}
                        </span>
                        <b>{formattedPrice || 'Fiyat Güncelleniyor'}</b>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spotlight Instant Search Panel */}
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
                  placeholder="Model veya renk ara: Rio Boss, Duo, Wonder, Atlas, Zeytin Yeşili..."
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
                <span>Hızlı Erişim:</span>
                {['Rio Boss', 'Rio', 'Duo', 'Dubai', 'Wonder', 'Elegant', 'Atlas', 'Hong Kong'].map((term) => (
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
                {spotlightResults.map(({ prod, variant, catName }) => {
                  const thumb = variant.images[0]
                  const priceStr = formatPrice(variant.price)
                  return (
                    <Link
                      key={prod.slug}
                      to={`/urun/${prod.slug}/`}
                      className="spotlight-result-item"
                    >
                      {thumb && (
                        <img
                          src={thumb.thumb}
                          alt={thumb.alt}
                          width={thumb.width}
                          height={thumb.height}
                          loading="lazy"
                        />
                      )}
                      <div>
                        <small>{catName}</small>
                        <strong>
                          {prod.modelName} · {variant.renk}
                        </strong>
                        <span>{priceStr || 'Fiyat Güncelleniyor'}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {spotlightResults.length === 0 && (
                <p className="spotlight-empty-note">
                  &ldquo;{searchInput}&rdquo; için eşleşen ürün bulunamadı. Tüm koleksiyon için kategori menüsünü kullanabilirsiniz.
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      {(activeParentSlug || searchOpen) && (
        <div
          className="apple-nav-backdrop"
          onMouseEnter={() => {
            if (activeParentSlug) scheduleClose()
          }}
          onClick={() => {
            setActiveParentSlug(null)
            setSearchOpen(false)
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
