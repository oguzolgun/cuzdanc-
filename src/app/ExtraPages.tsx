import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import {
  formatPrice,
  getProductBySlug,
  getProductStartingPrice,
  isConfiguredValue,
  products,
  siteConfig,
} from './data'
import { useDocumentSeo, type RouteSeoPayload } from './seo'
import { getCartUnitPrice, type StoreContext } from './Store'
import { BLOG_POSTS } from './blogData'

function buildSimpleSeo(
  title: string,
  description: string,
  pathname: string,
  robots = 'index, follow',
  ogType: 'website' | 'article' = 'website',
  ogImage = siteConfig.defaultOgImage,
  jsonLd: Record<string, unknown>[] = []
): RouteSeoPayload {
  const base = siteConfig.siteUrl.replace(/\/+$/, '')
  const canonical = `${base}${pathname}`
  const imgUrl = ogImage.startsWith('http') ? ogImage : `${base}${ogImage}`
  return {
    title,
    description,
    canonical,
    robots,
    ogType,
    ogTitle: title,
    ogDescription: description,
    ogImage: imgUrl,
    ogLocale: 'tr_TR',
    jsonLd,
  }
}

/**
 * Fallback for browsers without native `:user-invalid` support + live ARIA sync.
 */
function useAfterInteractionValidation(formRef: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const supportsUserInvalid = typeof CSS !== 'undefined' && CSS.supports?.('selector(:user-invalid)')

    const syncField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
        return
      }
      const isValid = el.validity.valid
      if (!supportsUserInvalid) {
        el.classList.toggle('user-invalid-fallback', !isValid)
        el.classList.toggle('user-valid-fallback', isValid)
      }
      const invalidNow = supportsUserInvalid ? el.matches(':user-invalid') : !isValid
      el.setAttribute('aria-invalid', invalidNow ? 'true' : 'false')
      const errorId = el.dataset.error
      if (errorId) {
        const ids = (el.getAttribute('aria-describedby') || '')
          .split(/\s+/)
          .filter((id) => id && id !== errorId)
        if (invalidNow) ids.push(errorId)
        if (ids.length) el.setAttribute('aria-describedby', ids.join(' '))
        else el.removeAttribute('aria-describedby')
      }
    }

    form.querySelectorAll('input, select, textarea').forEach((el) => {
      if (!el.hasAttribute('aria-invalid')) el.setAttribute('aria-invalid', 'false')
    })

    const onBlur = (e: Event) => syncField(e.target)
    const onInput = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target?.getAttribute('aria-invalid') === 'true') syncField(target)
    }
    const onInvalid = (e: Event) => {
      const el = e.target as HTMLInputElement
      if (!supportsUserInvalid) el.classList.add('user-invalid-fallback')
      el.setAttribute('aria-invalid', 'true')
    }

    form.addEventListener('blur', onBlur, true)
    form.addEventListener('input', onInput)
    form.addEventListener('invalid', onInvalid, true)
    return () => {
      form.removeEventListener('blur', onBlur, true)
      form.removeEventListener('input', onInput)
      form.removeEventListener('invalid', onInvalid, true)
    }
  }, [formRef])
}

/* =========================================================================
   1. GİRİŞ YAP (/giris/)
   ========================================================================= */
export function LoginPage() {
  useDocumentSeo(
    buildSimpleSeo(
      'Giriş Yap | Elons Leather',
      'Elons Leather hesabınıza giriş yapın; siparişlerinizi ve favori hakiki deri ürünlerinizi yönetin.',
      '/giris/',
      'noindex, follow'
    )
  )

  const formRef = useRef<HTMLFormElement | null>(null)
  useAfterInteractionValidation(formRef)

  const uid = useId()
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [signedUser, setSignedUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('elon_user')
      if (raw) setSignedUser(JSON.parse(raw))
    } catch {
      // ignore storage errors
    }
  }, [])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const data = new FormData(form)
    const email = String(data.get('email') || '').trim()
    const nameGuess = email.split('@')[0] || 'Üye'
    const user = { name: nameGuess, email }
    try {
      window.localStorage.setItem('elon_user', JSON.stringify(user))
    } catch {
      // ignore
    }
    setSignedUser(user)
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-intro">
          <p className="overline">ELONS LEATHER · ÜYE HESABI</p>
          <h1>Atölye Hesabınıza Giriş Yapın</h1>
          <p className="auth-sub">
            Sipariş taleplerinizi takip edin, kişiselleştirme notlarınızı saklayın ve koleksiyonlara hızlı erişin.
          </p>
        </div>

        <div className="auth-card">
          {signedUser ? (
            <div className="auth-success-box" role="status" aria-live="polite">
              <span className="auth-badge">Oturum Açık</span>
              <h2>Hoş geldiniz, {signedUser.name}</h2>
              <p>{signedUser.email} adresiyle giriş yapıldı.</p>
              <div className="auth-success-actions">
                <Link to="/sepet/" className="auth-submit-btn">
                  Sepetime Git →
                </Link>
                <Link to="/kategoriler/" className="auth-quiet-btn">
                  Koleksiyonları İncele
                </Link>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    window.localStorage.removeItem('elon_user')
                    setSignedUser(null)
                  }}
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          ) : (
            <form ref={formRef} className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor={`${uid}-email`}>E-posta Adresi</label>
                <span id={`${uid}-email-hint`} className="field-hint">
                  Örnek: adiniz@ornek.com
                </span>
                <input
                  id={`${uid}-email`}
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  aria-describedby={`${uid}-email-hint`}
                  data-error={`${uid}-email-err`}
                />
                <div id={`${uid}-email-err`} className="error-msg">
                  <span role="img" aria-label="Hata">✕</span> Geçerli bir e-posta adresi girin (ornek@alan.com).
                </div>
              </div>

              <div className="form-field">
                <div className="field-label-row">
                  <label htmlFor={`${uid}-password`}>Şifre</label>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setForgotOpen((v) => !v)
                      setResetSent(false)
                    }}
                  >
                    Şifremi unuttum
                  </button>
                </div>
                <div className="password-input-wrap">
                  <input
                    id={`${uid}-password`}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    minLength={6}
                    required
                    data-error={`${uid}-pass-err`}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Gizle' : 'Göster'}
                  </button>
                </div>
                <div id={`${uid}-pass-err`} className="error-msg">
                  <span role="img" aria-label="Hata">✕</span> Şifreniz en az 6 karakter olmalıdır.
                </div>
              </div>

              {forgotOpen && (
                <div className="auth-forgot-box">
                  {resetSent ? (
                    <p>Şifre sıfırlama bağlantısı talebiniz kaydedildi. Destek için {siteConfig.email} adresine de yazabilirsiniz.</p>
                  ) : (
                    <>
                      <p>E-posta adresinizi yukarıya girip sıfırlama talebi oluşturabilirsiniz.</p>
                      <button
                        type="button"
                        className="auth-quiet-btn"
                        onClick={() => setResetSent(true)}
                      >
                        Sıfırlama Bağlantısı İste
                      </button>
                    </>
                  )}
                </div>
              )}

              <button type="submit" className="auth-submit-btn">
                Giriş Yap
              </button>

              <p className="auth-switch">
                Henüz hesabınız yok mu? <Link to="/uye-ol/">Üye Olun →</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

/* =========================================================================
   2. ÜYE OL (/uye-ol/)
   ========================================================================= */
export function RegisterPage() {
  useDocumentSeo(
    buildSimpleSeo(
      'Üye Ol | Elons Leather',
      'Elons Leather hesabı oluşturun; el yapımı hakiki deri siparişlerinizi ve kişiselleştirme tercihlerinizi kolayca yönetin.',
      '/uye-ol/',
      'noindex, follow'
    )
  )

  const formRef = useRef<HTMLFormElement | null>(null)
  useAfterInteractionValidation(formRef)

  const uid = useId()
  const [showPassword, setShowPassword] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string } | null>(null)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const data = new FormData(form)
    const name = String(data.get('full-name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const user = { name, email }
    try {
      window.localStorage.setItem('elon_user', JSON.stringify(user))
    } catch {
      // ignore
    }
    setCreatedUser(user)
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-intro">
          <p className="overline">ELONS LEATHER · YENİ ÜYELİK</p>
          <h1>Üye Olun</h1>
          <p className="auth-sub">
            Ücretsiz hesap oluşturarak sipariş özetlerinizi saklayın ve yeni sezon Ege denizciliği serilerinden haberdar olun.
          </p>
        </div>

        <div className="auth-card">
          {createdUser ? (
            <div className="auth-success-box" role="status" aria-live="polite">
              <span className="auth-badge">Hesap Oluşturuldu</span>
              <h2>Aramıza hoş geldiniz, {createdUser.name}</h2>
              <p>{createdUser.email} adresiyle üyeliğiniz oluşturuldu.</p>
              <div className="auth-success-actions">
                <Link to="/kategoriler/" className="auth-submit-btn">
                  Koleksiyonları Keşfet →
                </Link>
                <Link to="/sepet/" className="auth-quiet-btn">
                  Sepetime Git
                </Link>
              </div>
            </div>
          ) : (
            <form ref={formRef} className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor={`${uid}-fullname`}>Ad Soyad</label>
                <input
                  id={`${uid}-fullname`}
                  name="full-name"
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  minLength={2}
                  required
                  data-error={`${uid}-name-err`}
                />
                <div id={`${uid}-name-err`} className="error-msg">
                  <span role="img" aria-label="Hata">✕</span> Lütfen adınızı ve soyadınızı girin.
                </div>
              </div>

              <div className="form-field">
                <label htmlFor={`${uid}-email`}>E-posta Adresi</label>
                <span id={`${uid}-email-hint`} className="field-hint">
                  Sipariş bilgilendirmeleri bu adrese iletilir.
                </span>
                <input
                  id={`${uid}-email`}
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  aria-describedby={`${uid}-email-hint`}
                  data-error={`${uid}-email-err`}
                />
                <div id={`${uid}-email-err`} className="error-msg">
                  <span role="img" aria-label="Hata">✕</span> Geçerli bir e-posta adresi girin (ornek@alan.com).
                </div>
              </div>

              <div className="form-field">
                <label htmlFor={`${uid}-tel`}>Telefon (İsteğe Bağlı)</label>
                <input
                  id={`${uid}-tel`}
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  enterKeyHint="next"
                />
              </div>

              <div className="form-field">
                <label htmlFor={`${uid}-new-password`}>Şifre Belirleyin</label>
                <ul id={`${uid}-pass-rules`} className="rules-list">
                  <li>En az 8 karakter</li>
                  <li>En az bir büyük harf, bir küçük harf ve bir rakam</li>
                </ul>
                <div className="password-input-wrap">
                  <input
                    id={`${uid}-new-password`}
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    enterKeyHint="done"
                    minLength={8}
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                    required
                    aria-describedby={`${uid}-pass-rules`}
                    data-error={`${uid}-pass-err`}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Gizle' : 'Göster'}
                  </button>
                </div>
                <div id={`${uid}-pass-err`} className="error-msg">
                  <span role="img" aria-label="Hata">✕</span> Şifre en az 8 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.
                </div>
              </div>

              <label className="auth-consent">
                <input type="checkbox" name="kvkk" required />
                <span>
                  <Link to="/kvkk/">KVKK Aydınlatma Metni</Link>’ni okudum ve kişisel verilerimin işlenmesini onaylıyorum.
                </span>
              </label>

              <button type="submit" className="auth-submit-btn">
                Hesap Oluştur
              </button>

              <p className="auth-switch">
                Zaten hesabınız var mı? <Link to="/giris/">Giriş Yapın →</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

/* =========================================================================
   3. SEPET SAYFASI (/sepet/)
   ========================================================================= */
export function CartPage() {
  useDocumentSeo(
    buildSimpleSeo(
      'Sepetim | Elons Leather',
      'Elons Leather alışveriş sepetiniz: el yapımı hakiki deri cüzdan, kartlık ve aksesuar sipariş özetiniz.',
      '/sepet/',
      'noindex, follow'
    )
  )

  const {
    cart,
    cartCount,
    subtotal,
    updateCartQuantity,
    removeCartItem,
    clearCart,
    buildOrderSummaryMailto,
  } = useOutletContext<StoreContext>()

  const whatsappEnabled = isConfiguredValue(siteConfig.whatsappNumber)
  const [mailSentNotice, setMailSentNotice] = useState(false)

  const recommended = useMemo(() => products.slice(0, 4), [])

  return (
    <main className="cart-page">
      <div className="cart-page-head">
        <div>
          <p className="overline">ELONS LEATHER · SİPARİŞ ÖZETİ</p>
          <h1>Alışveriş Sepetim {cartCount > 0 ? `(${cartCount} Ürün)` : ''}</h1>
        </div>
        {cart.length > 0 && (
          <button type="button" className="auth-link-btn" onClick={clearCart}>
            Sepeti Temizle
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <section className="cart-empty-panel">
          <h2>Sepetiniz şu an boş</h2>
          <p>El yapımı Crazy Horse hakiki deri cüzdan, çanta veya kartlık modellerimizi inceleyerek sepetinizi oluşturabilirsiniz.</p>
          <div className="cart-empty-actions">
            <Link to="/kategoriler/" className="auth-submit-btn">
              Tüm Kategorileri Keşfet →
            </Link>
            <Link to="/" className="auth-quiet-btn">
              Ana Sayfaya Dön
            </Link>
          </div>

          <div className="cart-rec-section">
            <h3>Öne Çıkan Modeller</h3>
            <div className="cart-rec-grid">
              {recommended.map((prod) => {
                const firstVar = prod.variants[0]
                const thumb = firstVar?.images[0]?.thumb || firstVar?.images[0]?.full || ''
                const startPrice = getProductStartingPrice(prod)
                return (
                  <Link key={prod.slug} to={`/urun/${prod.slug}/`} className="cart-rec-card">
                    {thumb && <img src={thumb} alt={prod.name} width={300} height={450} loading="lazy" />}
                    <div>
                      <strong>{prod.modelName}</strong>
                      <span>{formatPrice(startPrice)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : (
        <div className="cart-page-grid">
          <div className="cart-page-list">
            {cart.map((item, idx) => {
              const firstImg = item.variant.images[0]
              const unit = getCartUnitPrice(item)
              const lineTotal = unit !== null ? formatPrice(unit * item.quantity) : '—'
              return (
                <article
                  key={`${item.product.slug}-${item.variant.renkSlug}-${item.engraving || ''}-${item.personalizationAddon || 'none'}-${idx}`}
                  className="cart-page-item"
                >
                  {firstImg && (
                    <img
                      src={firstImg.thumb}
                      alt={firstImg.alt}
                      width={firstImg.width}
                      height={firstImg.height}
                    />
                  )}
                  <div className="cart-page-item-info">
                    <span className="cart-page-type">{item.product.productType}</span>
                    <h2>
                      <Link to={`/urun/${item.product.slug}/?renk=${encodeURIComponent(item.variant.renkSlug)}`}>
                        {item.product.modelName}
                      </Link>
                    </h2>
                    <p>Renk: {item.variant.renk}</p>
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

                    <div className="cart-page-controls">
                      <div className="cart-qty-box">
                        <button
                          type="button"
                          aria-label="Adedi azalt"
                          onClick={() => updateCartQuantity(idx, -1)}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Adedi artır"
                          onClick={() => updateCartQuantity(idx, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => removeCartItem(idx)}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                  <div className="cart-page-item-price">
                    <strong>{lineTotal}</strong>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className="cart-summary-card">
            <h2>Sipariş Özeti</h2>
            <div className="cart-summary-row">
              <span>Ürün Ara Toplamı</span>
              <strong>{formatPrice(subtotal) || '—'}</strong>
            </div>
            <div className="cart-summary-row">
              <span>Kargo</span>
              <span>Ücretsiz</span>
            </div>
            <div className="cart-summary-total">
              <span>Genel Toplam</span>
              <strong>{formatPrice(subtotal) || '—'}</strong>
            </div>

            {whatsappEnabled ? (
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="auth-submit-btn"
              >
                WhatsApp ile Siparişi Tamamla →
              </a>
            ) : (
              <a
                href={buildOrderSummaryMailto()}
                className="auth-submit-btn"
                onClick={() => setMailSentNotice(true)}
              >
                Sipariş Talebini E-posta ile İlet →
              </a>
            )}
            {mailSentNotice && (
              <p className="cart-checkout-note">
                E-posta uygulamanız açılmadıysa sepet detayınızı <strong>{siteConfig.email}</strong> adresine iletebilirsiniz.
              </p>
            )}
            <Link to="/kategoriler/" className="auth-quiet-btn">
              Alışverişe Devam Et
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}

/* =========================================================================
   4. KVKK AYDINLATMA METNİ & GİZLİLİK (/kvkk/)
   ========================================================================= */
export function KvkkPage() {
  useDocumentSeo(
    buildSimpleSeo(
      'KVKK Aydınlatma Metni & Gizlilik Politikası | Elons Leather',
      '6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında Elons Leather KVKK aydınlatma metni, çerez ve gizlilik politikası.',
      '/kvkk/'
    )
  )

  return (
    <main className="kvkk-page">
      <article className="kvkk-article">
        <p className="overline">YASAL BİLGİLENDİRME · 6698 SAYILI KANUN</p>
        <h1>KVKK Aydınlatma Metni ve Gizlilik Politikası</h1>
        <p className="kvkk-updated">Son Güncelleme: Kasım 2026 · Veri Sorumlusu: Elons Leather Atölyesi</p>

        <section>
          <h2>1. Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, kişisel verileriniz veri sorumlusu
            sıfatıyla <strong>Elons Leather</strong> (“Şirket” veya “Atölye”) tarafından aşağıda açıklanan kapsamda
            işlenebilecektir. İletişim: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          </p>
        </section>

        <section>
          <h2>2. İşlenen Kişisel Veriler</h2>
          <ul>
            <li><strong>Kimlik ve İletişim Bilgileri:</strong> Ad, soyad, e-posta adresi, telefon numarası, teslimat ve fatura adresi.</li>
            <li><strong>Sipariş ve Kişiselleştirme Bilgileri:</strong> Seçilen ürün modeli, renk tercihi, cüzdan üzerine işlenecek isim/monogram baskı metni.</li>
            <li><strong>İşlem Güvenliği Verileri:</strong> Oturum bilgileri, temel teknik loglar ve tercih çerezleri.</li>
          </ul>
        </section>

        <section>
          <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
          <p>
            Toplanan kişisel verileriniz; sipariş taleplerinin oluşturulması, kişiye özel isim/logo baskı süreçlerinin
            yürütülmesi, ürün teslimatının gerçekleştirilmesi, müşteri destek taleplerinin yanıtlanması ve mevzuattan
            kaynaklanan yasal yükümlülüklerin yerine getirilmesi amaçlarıyla KVKK’nın 5. ve 6. maddelerinde belirtilen
            şartlar dâhilinde işlenmektedir.
          </p>
        </section>

        <section>
          <h2>4. Verilerin Aktarılması ve Saklama Süresi</h2>
          <p>
            Kişisel verileriniz yalnızca siparişin teslimi için anlaşmalı kargo şirketleri, ödeme/fatura süreçleri için
            ilgili finansal kuruluşlar ve kanunen yetkili kamu kurumları ile sınırlı olmak üzere paylaşılır; üçüncü
            kişilere pazarlama amacıyla satılmaz. Veriler, ilgili mevzuatta öngörülen zamanaşımı süreleri boyunca
            güvenli şekilde muhafaza edilir.
          </p>
        </section>

        <section>
          <h2>5. KVKK Madde 11 Kapsamındaki Haklarınız</h2>
          <p>KVKK’nın 11. maddesi uyarınca veri sorumlusuna başvurarak:</p>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme ve bilgi talep etme,</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini, şartları oluştuğunda silinmesini veya yok edilmesini isteme,</li>
            <li>Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
          <p>
            haklarına sahipsiniz. Taleplerinizi <strong>{siteConfig.email}</strong> adresine e-posta göndererek iletebilirsiniz.
          </p>
        </section>
      </article>
    </main>
  )
}

/* =========================================================================
   5. BLOG LİSTESİ (/blog/) & BLOG YAZISI (/blog/:slug/)
   ========================================================================= */
export function BlogListPage() {
  useDocumentSeo(
    buildSimpleSeo(
      'Blog & Deri Rehberi | Elons Leather',
      'Crazy Horse deri bakımı, cüzdan seçimi, patina oluşumu ve isme özel deri hediye rehberleri — Elons Leather Atölye Blogu.',
      '/blog/'
    )
  )

  const [selectedCat, setSelectedCat] = useState<string>('Tümü')
  const categories = ['Tümü', 'Deri Rehberi', 'Bakım', 'Hediye & Stil']

  const filteredPosts = useMemo(
    () => (selectedCat === 'Tümü' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.category === selectedCat)),
    [selectedCat]
  )

  return (
    <main className="blog-page">
      <header className="blog-hero">
        <p className="overline">ELONS LEATHER · ATÖLYE NOTLARI</p>
        <h1>Deri Zanaatı &amp; Bakım Rehberi</h1>
        <p className="blog-hero-sub">
          Hakiki dana derisinin doğası, patina süreci, cüzdan seçimi ve uzun ömürlü kullanım ipuçları.
        </p>

        <div className="blog-filter-bar" role="group" aria-label="Blog kategorisi filtrele">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`blog-filter-pill ${selectedCat === cat ? 'is-active' : ''}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <section className="blog-grid">
        {filteredPosts.map((post) => (
          <article key={post.slug} className="blog-card">
            <Link to={`/blog/${post.slug}/`} className="blog-card-media">
              <img
                src={post.coverImage}
                alt={post.coverAlt}
                width={600}
                height={900}
                loading="lazy"
              />
            </Link>
            <div className="blog-card-body">
              <div className="blog-card-meta">
                <span>{post.category}</span>
                <span>·</span>
                <span>{post.readTime}</span>
              </div>
              <h2>
                <Link to={`/blog/${post.slug}/`}>{post.title}</Link>
              </h2>
              <p>{post.excerpt}</p>
              <Link to={`/blog/${post.slug}/`} className="blog-card-link">
                Yazıyı Oku →
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = BLOG_POSTS.find((p) => p.slug === slug) || BLOG_POSTS[0]
  const relatedProduct = getProductBySlug(post.relatedProductSlug)

  useDocumentSeo(
    buildSimpleSeo(
      `${post.title} | Elons Leather Blog`,
      post.excerpt,
      `/blog/${post.slug}/`,
      'index, follow',
      'article',
      post.coverImage
    )
  )

  return (
    <main className="blog-article-page">
      <nav className="breadcrumb" aria-label="İçerik yolu">
        <Link to="/">Ana Sayfa</Link>
        <span>/</span>
        <Link to="/blog/">Blog</Link>
        <span>/</span>
        <span>{post.title}</span>
      </nav>

      <article className="blog-article">
        <header className="blog-article-header">
          <p className="overline">
            {post.category} · {post.date} · {post.readTime}
          </p>
          <h1>{post.title}</h1>
          <p className="blog-article-lead">{post.excerpt}</p>
        </header>

        <div className="blog-article-cover">
          <img src={post.coverImage} alt={post.coverAlt} width={1200} height={1800} />
        </div>

        <div className="blog-article-body">
          {post.sections.map((sec) => (
            <section key={sec.heading}>
              <h2>{sec.heading}</h2>
              {sec.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </div>

        {relatedProduct && (
          <aside className="blog-related-box">
            <div>
              <p className="overline">BU YAZIYLA İLGİLİ MODEL</p>
              <h3>{relatedProduct.name}</h3>
              <p>{relatedProduct.shortDescription}</p>
            </div>
            <Link to={`/urun/${relatedProduct.slug}/`} className="auth-submit-btn">
              {relatedProduct.modelName} Modelini İncele →
            </Link>
          </aside>
        )}
      </article>
    </main>
  )
}
