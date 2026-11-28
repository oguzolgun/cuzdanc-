import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { formatPrice, getProductBySlug, isConfiguredValue, siteConfig } from './data'
import type { ProductRecord, ProductVariantRecord } from './types'
import type { PersonalizationAddon } from './Store'

type EditorialProps = {
  product: ProductRecord
  activeVariant: ProductVariantRecord
  engravingText: string
  wantsEngraving: boolean
  personalizationAddon: PersonalizationAddon
  logoPreviewUrl: string
}

function shadeHexColor(hex: string, factor: number): string {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '8A4A26'
  const n = parseInt(clean, 16)
  const r = Math.max(8, Math.min(255, Math.round(((n >> 16) & 255) * factor)))
  const g = Math.max(8, Math.min(255, Math.round(((n >> 8) & 255) * factor)))
  const b = Math.max(8, Math.min(255, Math.round((n & 255) * factor)))
  return `rgb(${r}, ${g}, ${b})`
}

function getDebossStampColor(hex: string): string {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '8A4A26'
  const n = parseInt(clean, 16)
  const avg = (((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255)) / 3
  return avg < 65 ? 'rgba(246, 241, 231, 0.36)' : shadeHexColor(hex, 0.55)
}

function getManifestoContent(product: ProductRecord): {
  headline: string[]
  highlights: Array<{ title: string; text: string }>
} {
  if (product.slug.includes('seyir')) {
    return {
      headline: ['Defter biter.', 'Kılıf kalır.'],
      highlights: [
        { title: 'Defter değişir, kılıf kalır', text: 'Sayfalar dolduğunda yalnızca iç defter yenilenir.' },
        { title: 'Hakiki deri', text: 'Kullandıkça koyulaşır ve kişisel patina kazanır.' },
        { title: 'Sipariş üzerine', text: 'Her kılıf size özel, el işçiliğiyle hazırlanır.' },
      ],
    }
  }
  if (product.primaryCategory === 'erkek-deri-cuzdan/miknatisli') {
    return {
      headline: ['Çıtçıt yok.', 'Kemer yok.', 'Kapak yaklaşır ve kapanır.'],
      highlights: [
        { title: 'Gizli mıknatıs', text: 'Çıtçıt çıkıntısı olmadan cepte kendiliğinden sabitlenir.' },
        { title: 'Hakiki deri', text: 'Kullandıkça koyulaşır ve size özel patina geliştirir.' },
        { title: 'Sipariş üzerine', text: 'Her cüzdan özenli el dikişi ve sıcak baskıyla hazırlanır.' },
      ],
    }
  }
  if (product.slug.includes('garbi')) {
    return {
      headline: ['İnce kesim.', 'Net kavrayış.'],
      highlights: [
        { title: 'Para klipsli düzen', text: 'Kâğıt banknotları kalınlık yaratmadan sabit tutar.' },
        { title: 'Ön cep konforu', text: 'Günlük kartlarınızı gereksiz hacim olmadan taşır.' },
        { title: 'Hakiki deri', text: 'Kullandıkça esner ve elinizin formunu alır.' },
      ],
    }
  }
  if (product.primaryCategory === 'deri-kartlik') {
    return {
      headline: ['Yalnızca gerekenler.', 'Ağırlıksız düzen.'],
      highlights: [
        { title: 'Minimal profil', text: 'Gömlek ve pantolon ön cebinde iz bırakmaz.' },
        { title: 'Hakiki deri', text: 'Dikiş hatları ve damar dokusuyla uzun süre formunu korur.' },
        { title: 'Kişisel imza', text: 'Ücretsiz sıcak gofraj isim baskısıyla hazırlanabilir.' },
      ],
    }
  }
  if (product.primaryCategory.startsWith('erkek-deri-canta')) {
    return {
      headline: ['Ceplerinizi özgür bırakın.', 'Tüm düzen tek formda.'],
      highlights: [
        { title: 'Bütünsel taşıma', text: 'Telefon, cüzdan ve günlük eşyalar tek gövdede toplanır.' },
        { title: 'Hakiki deri', text: 'Doğal damar yapısı zamanla derinleşen bir patina geliştirir.' },
        { title: 'El işçiliği', text: 'Kenar dikişlerinden askı noktalarına kadar özenle üretilir.' },
      ],
    }
  }
  return {
    headline: ['Doğal malzeme.', 'Zamansız eşlikçi.'],
    highlights: [
      { title: 'El yapımı işçilik', text: 'Doğal hakiki deriden sipariş üzerine özenle hazırlanır.' },
      { title: 'Yaşayan doku', text: 'Zamanla el ısısı ve temasla kendine özgü patina kazanır.' },
      { title: 'Sade tasarım', text: 'Abartıdan uzak hatlarıyla her gün kolayca kullanılır.' },
    ],
  }
}

function getCloseLookPoints(product: ProductRecord): {
  intro: string
  points: Array<{ title: string; text: string; pinX: number; pinY: number }>
} {
  if (product.slug.includes('seyir')) {
    return {
      intro: `Etikete güvenmek zorunda değilsiniz. ${product.modelName} elinize ulaştığında bakacağınız üç nokta, malzemenin ne olduğunu kendiliğinden gösterir.`,
      points: [
        {
          title: 'Kenar kesiti',
          text: 'Kapağın kenarına yandan bakın. Suni malzemede kumaş astar görünür, gerçek deride lifli ve tek parça bir doku görünür.',
          pinX: 50,
          pinY: 74,
        },
        {
          title: 'Yüzeydeki ton farkı',
          text: 'Doğal deride açık ve koyu bölgeler yan yana durur. Suni yüzeyler baştan sona tek tondur.',
          pinX: 28,
          pinY: 56,
        },
        {
          title: 'Kemer ve dikiş hattı',
          text: 'Kapağı kapatan parça gövdeyle aynı deriden kesilir; dikiş çevresinde soyulma ya da kabarma olmaz.',
          pinX: 48,
          pinY: 48,
        },
      ],
    }
  }
  return {
    intro: `Etikete güvenmek zorunda değilsiniz. ${product.modelName} elinize ulaştığında bakacağınız üç nokta, hakiki deriyi kendiliğinden gösterir.`,
    points: [
      {
        title: 'Kenar kesiti',
        text: 'Kenara yandan bakın. Suni malzemede kumaş astar görünür, gerçek deride lifli ve tek parça bir doku görünür.',
        pinX: 62,
        pinY: 66,
      },
      {
        title: 'Yüzeydeki damar',
        text: 'Gözenek ve damar deseni her parçada farklıdır. Baskı desenli suni yüzeylerde aynı motif düzenli aralıklarla tekrar eder.',
        pinX: 36,
        pinY: 36,
      },
      {
        title: 'Dikiş hattı',
        text: 'İplik kenara paralel ve eşit aralıkla ilerler. Kıvrım noktalarında dikişin net dönmesi işçiliğin göstergesidir.',
        pinX: 30,
        pinY: 57,
      },
    ],
  }
}

function getWorkshopSteps(product: ProductRecord): Array<{ title: string; text: string }> {
  if (product.slug.includes('seyir')) {
    return [
      { title: 'Kesim', text: 'Deri, damar yönüne bakılarak elle kesilir.' },
      { title: 'İç cepler', text: 'Defter kapağının geçtiği cepler gövdeye dikilir.' },
      { title: 'Kemer ve kenar', text: 'Kapama kemeri takılır, kenarlar zımparalanıp düzeltilir.' },
      { title: 'İsim baskısı', text: 'Seçtiğiniz harfler sıcak gofraj baskıyla deriye işlenir.' },
    ]
  }
  if (product.primaryCategory === 'erkek-deri-cuzdan/miknatisli') {
    return [
      { title: 'Kesim', text: 'Deri, doğal damar yönüne bakılarak elle kesilir.' },
      { title: 'Mıknatıs', text: 'İki katman arasına dışarıdan görünmeyecek biçimde yerleştirilir.' },
      { title: 'Dikiş ve kenar', text: 'Katmanlar eşit aralıkla dikilir, kenarlar özenle işlenir.' },
      { title: 'İsim baskısı', text: 'Son adımda harfler ısı ve basınçla deriye gömülür.' },
    ]
  }
  return [
    { title: 'Kesim', text: 'Hakiki deri parçaları damar yönü korunarak kesilir.' },
    { title: 'Birleştirme', text: 'Bölmeler ve gövde el işçiliğiyle hizalanır.' },
    { title: 'Dikiş ve kenar', text: 'Kenar hatları boyunca mumlu iplikle sağlam dikiş geçilir.' },
    {
      title: product.personalization.isimYazdirma ? 'İsim baskısı' : 'Son kontrol',
      text: product.personalization.isimYazdirma
        ? 'İsteğe bağlı isim veya monogram sıcak baskıyla yüzeye işlenir.'
        : 'Kenar ve dikiş kontrollerinin ardından paketlemeye alınır.',
    },
  ]
}

const COMPARE_PAIR: Record<string, { targetSlug: string; badge: string }> = {
  'lodos-miknatisli-deri-cuzdan': { targetSlug: 'lodos-pro-miknatisli-deri-cuzdan', badge: 'ÜST MODEL' },
  'lodos-plus-miknatisli-deri-cuzdan': { targetSlug: 'lodos-pro-miknatisli-deri-cuzdan', badge: 'ÜST MODEL' },
  'poyraz-miknatisli-deri-cuzdan': { targetSlug: 'lodos-pro-miknatisli-deri-cuzdan', badge: 'GENİŞ KAPASİTE' },
  'lodos-pro-miknatisli-deri-cuzdan': { targetSlug: 'lodos-miknatisli-deri-cuzdan', badge: 'ALTERNATİF MODEL' },
  'etezyen-klasik-deri-cuzdan': { targetSlug: 'garbi-mandalli-deri-cuzdan', badge: 'İNCE & KLİPSLİ' },
  'garbi-mandalli-deri-cuzdan': { targetSlug: 'etezyen-klasik-deri-cuzdan', badge: 'KLASİK FORM' },
}

export function ProductEditorialSections({
  product,
  activeVariant,
  engravingText,
  wantsEngraving,
  personalizationAddon,
  logoPreviewUrl,
}: EditorialProps) {
  const isWalletOrCardholder =
    product.primaryCategory.startsWith('erkek-deri-cuzdan') ||
    product.primaryCategory === 'deri-kartlik'
  const isSeyir = product.slug.includes('seyir')

  const maxSimCards = product.id === 'rio-boss' ? 12 : product.id === 'wonder' ? 6 : 10
  const [simCards, setSimCards] = useState(4)
  const [patinaYears, setPatinaYears] = useState(0)

  const images = activeVariant.images
  const manifestoImg = images[2] || images[1] || images[0]
  const detailImg = images[3] || images[images.length - 1] || images[0]
  const openImg = images[1] || images[0]

  const manifesto = useMemo(() => getManifestoContent(product), [product])
  const closeLook = useMemo(() => getCloseLookPoints(product), [product])
  const workshopSteps = useMemo(() => getWorkshopSteps(product), [product])

  const longParagraphs = useMemo(
    () =>
      product.longDescription
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    [product.longDescription]
  )

  const compareMeta = COMPARE_PAIR[product.slug]
  const compareTarget = compareMeta ? getProductBySlug(compareMeta.targetSlug) : undefined

  // Interactive card simulator state
  const cardProgressPct = ((simCards - 1) / Math.max(1, maxSimCards - 1)) * 100
  const cardSlots = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const count = (simCards > i ? 1 : 0) + (simCards > i + 6 ? 1 : 0)
      return {
        filled: count > 0,
        double: count === 2,
      }
    })
  }, [simCards])

  let capTitle = 'Her kart kendi gözünde'
  let capText = `${simCards} kart iki kanada dengeli biçimde dağılır; boş kalan gözler kartvizit veya sık kullanılan kartlar için rahatça yer bırakır.`
  if (simCards === 6) {
    capTitle = 'Dengeli tam dolum'
    capText = 'Altı kart altı göze tek tek yerleşir ve derinin dış profili düz kalır.'
  } else if (simCards > 6) {
    capTitle = product.id === 'rio-boss' ? '20 karta kadar yüksek kapasite' : 'Yoğun kart taşıma düzeni'
    capText =
      product.id === 'rio-boss'
        ? `Lodos Pro'nun 8 x 10 cm gövdesi ve 20 karta kadar kapasitesi sayesinde ${simCards} kartı çift banknot bölmesiyle birlikte konforla taşır.`
        : `${simCards} kart için bazı gözlere iki kart yerleşir. Düzenli olarak daha fazla kart taşıyorsanız Lodos Pro serisini de değerlendirebilirsiniz.`
  }

  // Interactive patina state
  const yearLabel = patinaYears === 0 ? 'Yeni' : `${patinaYears} yıl sonra`
  const patinaProgressPct = (patinaYears / 10) * 100
  let patinaTitle = 'İlk gün'
  let patinaText = 'Yüzey mat, ton taze. Hakiki deri henüz elinizin ritmini tanımaya başlamadı.'
  if (patinaYears >= 1) {
    patinaTitle = 'İlk yıllar'
    patinaText = 'Elinizin en sık temas ettiği köşeler yumuşamaya ve tonu derinleşmeye başlar.'
  }
  if (patinaYears >= 4) {
    patinaTitle = 'Olgunluk'
    patinaText = 'Doğal balmumu ve cep sürtünmesiyle ton zenginleşir, yüzey kendiliğinden sıcak bir parlaklık kazanır.'
  }
  if (patinaYears >= 8) {
    patinaTitle = 'Yalnızca sizin'
    patinaText = 'Aynı modelden iki ürün artık birbirine benzemez; izler tamamen sizin kullanım öykünüzü yansıtır.'
  }

  const agedLeatherColor = shadeHexColor(activeVariant.colorHex, 1 - patinaYears * 0.032)
  const stampBaseHex = getDebossStampColor(activeVariant.colorHex)
  const patinaSheenOpacity = 0.05 + patinaYears * 0.03

  const previewText =
    personalizationAddon === 'logo'
      ? 'LOGONUZ'
      : personalizationAddon === 'image'
        ? 'GÖRSELİNİZ'
        : wantsEngraving && engravingText.trim()
          ? engravingText.trim()
          : product.personalization.isimYazdirma
            ? 'ADINIZ'
            : product.modelName

  const honestNotes = [
    {
      title: 'İz ve damar kusur değildir',
      text: 'Hayvanın yaşamından kalan küçük doğal izler hakiki derinin imzasıdır. Her parçada kendine özgü bir bölgede çıkar.',
    },
    {
      title: 'Ton ekrandan farklı görünebilir',
      text: 'Doğal deri boyayı parça parça farklı emer. Elinize ulaşan ton ekran ışığına göre bir derece açık ya da koyu olabilir.',
    },
    product.slug.includes('seyir')
      ? {
          title: 'Çizikler patinaya karışır',
          text: 'Kalem ve tırnak izleri ilk günlerde hafifçe belli olur; parmakla ovulduğunda ve zamanla doğal yüzeye karışır.',
        }
      : {
          title: 'İlk günler tok durur',
          text: 'El yapımı hakiki deri bölmeler başlangıçta sıkıdır; birkaç gün içinde kartlarınızın kalınlığına göre doğal kalıp alır.',
        },
  ]

  const leatherPanelStyle: CSSProperties = activeVariant.secondaryColorHex
    ? {
        background: `linear-gradient(135deg, ${activeVariant.colorHex} 0%, ${activeVariant.secondaryColorHex} 100%)`,
      }
    : { background: activeVariant.colorHex }

  return (
    <div className="pdp-editorial-stack">
      {/* BÖLÜM A: Manifesto / Değer Önerisi */}
      <section className="pdp-band pdp-band-white" aria-labelledby="pdp-manifesto-heading">
        <div className="pdp-band-inner pdp-split-grid">
          <div className="pdp-media-frame pdp-aspect-4-5">
            {manifestoImg && (
              <img
                src={manifestoImg.full}
                alt={manifestoImg.alt || `${product.name} yaşam tarzı görünümü`}
                width={manifestoImg.width}
                height={manifestoImg.height}
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
          <div className="pdp-manifesto-copy">
            <h2 id="pdp-manifesto-heading" className="pdp-manifesto-title">
              {manifesto.headline.map((line, idx) => (
                <span key={line}>
                  {line}
                  {idx < manifesto.headline.length - 1 && <br />}
                </span>
              ))}
            </h2>
            <div className="pdp-lined-list">
              {manifesto.highlights.map((item) => (
                <div key={item.title} className="pdp-lined-item">
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BÖLÜM B: Yakından Bakın — Hakiki Deri Nasıl Anlaşılır */}
      <section className="pdp-band pdp-band-cream" aria-labelledby="pdp-closelook-heading">
        <div className="pdp-band-inner pdp-split-grid pdp-split-reverse">
          <div className="pdp-closelook-copy">
            <p className="overline pdp-kicker">YAKINDAN BAKIN</p>
            <h2 id="pdp-closelook-heading" className="pdp-section-title">
              Hakiki deri nasıl anlaşılır
            </h2>
            <p className="pdp-section-lead">{closeLook.intro}</p>

            <div className="pdp-numbered-list">
              {closeLook.points.map((pt, idx) => (
                <div key={pt.title} className="pdp-numbered-item">
                  <span className="pdp-num-serif" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <div>
                    <h3>{pt.title}</h3>
                    <p>{pt.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pdp-annotated-photo">
            {detailImg && (
              <img
                src={detailImg.full}
                alt={detailImg.alt || `${product.name} hakiki deri detayı`}
                width={detailImg.width}
                height={detailImg.height}
                loading="lazy"
                decoding="async"
              />
            )}
            {closeLook.points.map((pt, idx) => (
              <span
                key={pt.title}
                aria-hidden="true"
                className="pdp-photo-pin"
                style={{ left: `${pt.pinX}%`, top: `${pt.pinY}%` }}
              >
                {idx + 1}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* BÖLÜM C: Kategoriye Özel İnteraktif / Uyum / Özellik Bölümü */}
      {isWalletOrCardholder ? (
        <section className="pdp-band pdp-band-white" aria-labelledby="pdp-capacity-heading">
          <div className="pdp-band-inner pdp-split-grid">
            <div className="pdp-media-frame pdp-aspect-4-5">
              {openImg && (
                <img
                  src={openImg.full}
                  alt={openImg.alt || `${product.name} açık iç görünüm`}
                  width={openImg.width}
                  height={openImg.height}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>

            <div className="pdp-interactive-copy">
              <p className="overline pdp-kicker">KENDİNİZ DENEYİN</p>
              <h2 id="pdp-capacity-heading" className="pdp-section-title">
                {product.modelName} kaç kart taşır
              </h2>
              <p className="pdp-section-lead">
                Gün içinde taşıdığınız kart sayısını seçin; bölmelere dağılımını aşağıda temsili olarak inceleyin.
              </p>

              <div className="pdp-slider-control">
                <label htmlFor="pdp-card-range" className="pdp-range-label">
                  Taşıdığınız kart: <strong>{simCards} adet</strong>
                </label>
                <input
                  id="pdp-card-range"
                  type="range"
                  min={1}
                  max={maxSimCards}
                  step={1}
                  value={simCards}
                  aria-valuetext={`${simCards} kart`}
                  onChange={(e) => setSimCards(Number(e.target.value))}
                  className="pdp-range-input"
                  style={{ '--slider-progress': `${cardProgressPct}%` } as CSSProperties}
                />
              </div>

              <div className="pdp-wallet-sim-panels" aria-hidden="true">
                {[cardSlots.slice(0, 3), cardSlots.slice(3, 6)].map((wing, wIdx) => (
                  <div key={wIdx} className="pdp-sim-wing" style={leatherPanelStyle}>
                    {wing.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        className={`pdp-sim-slot ${slot.filled ? 'is-filled' : ''}`}
                      >
                        {slot.double && <span>2 kart</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="pdp-sim-caption">
                <strong>{capTitle}</strong>
                <p>{capText}</p>
              </div>

              <p className="pdp-sim-footnote">
                {isConfiguredValue(product.specs.boyut) || isConfiguredValue(product.specs.kartKapasitesi) ? (
                  <>
                    Doğrulanmış ölçü: <strong>{product.specs.boyut}</strong> · Kapasite:{' '}
                    <strong>{product.specs.kartKapasitesi}</strong>
                    {isConfiguredValue(product.specs.banknotBolmesi) && (
                      <> · {product.specs.banknotBolmesi}</>
                    )}
                    .
                  </>
                ) : (
                  <>
                    Temsili kart yerleşim önizlemesidir. Daha yüksek kapasite için{' '}
                    <Link to="/urun/lodos-pro-miknatisli-deri-cuzdan/">
                      20 karta kadar kapasiteli Lodos Pro
                    </Link>{' '}
                    modelimizi inceleyebilirsiniz.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
      ) : isSeyir ? (
        <section className="pdp-band pdp-band-white" aria-labelledby="pdp-refill-heading">
          <div className="pdp-band-inner pdp-refill-stack">
            <div className="pdp-refill-head">
              <p className="overline pdp-kicker">DEFTER BİTİNCE</p>
              <h2 id="pdp-refill-heading" className="pdp-section-title">
                İç defter nasıl yenilenir
              </h2>
              <p className="pdp-section-lead">Üç adımda yeni yıla geçilir, deri kılıf aynı kalır.</p>
            </div>

            <div className="pdp-three-cards">
              <article className="pdp-step-card">
                <span className="pdp-step-num" aria-hidden="true">
                  1
                </span>
                <h3>Eski defteri çıkarın</h3>
                <p>Dolan defterin ön ve arka kapağını kılıfın iç ceplerinden nazikçe çekip çıkarın.</p>
              </article>
              <article className="pdp-step-card">
                <span className="pdp-step-num" aria-hidden="true">
                  2
                </span>
                <h3>Yenisini takın</h3>
                <p>Yeni yıl defterinin sert ya da esnek kapağını aynı iç ceplere geçirerek sabitleyin.</p>
              </article>
              <article className="pdp-step-card">
                <span className="pdp-step-num" aria-hidden="true">
                  3
                </span>
                <h3>Kemeri kapatın</h3>
                <p>Seyir deri kılıfınız, üzerindeki isim baskısı ve patinasıyla yeni yıla devam eder.</p>
              </article>
            </div>

            <div className="pdp-corporate-banner">
              <div>
                <h3>Kurumsal hediye siparişi</h3>
                <p>
                  Şirket logosu ürün başına +150 TL farkla işlenir. Ekip veya yılbaşı hediyeleriniz için doğrudan e-posta ile teklif isteyebilirsiniz.
                </p>
              </div>
              <a
                href={`mailto:${siteConfig.email}?subject=${encodeURIComponent('Kurumsal Seyir Ajanda Kılıfı Siparişi')}`}
                className="pdp-corporate-btn"
              >
                Toplu sipariş için yazın
              </a>
            </div>
          </div>
        </section>
      ) : (
        <section className="pdp-band pdp-band-white" aria-labelledby="pdp-features-heading">
          <div className="pdp-band-inner pdp-split-grid">
            <div className="pdp-media-frame pdp-aspect-4-5">
              {openImg && (
                <img
                  src={openImg.full}
                  alt={openImg.alt || `${product.name} detay görünümü`}
                  width={openImg.width}
                  height={openImg.height}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
            <div className="pdp-interactive-copy">
              <p className="overline pdp-kicker">DETAYLAR &amp; ÖNE ÇIKANLAR</p>
              <h2 id="pdp-features-heading" className="pdp-section-title">
                {product.modelName} neden tercih edilir
              </h2>
              <ul className="pdp-editorial-check-list">
                {product.features.map((feat) => (
                  <li key={feat}>
                    <span className="pdp-check-mark" aria-hidden="true">
                      ✓
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <p className="pdp-sim-footnote">
                Malzeme: <strong>{product.specs.malzeme}</strong> · Üretim:{' '}
                <strong>{product.specs.uretim}</strong>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* BÖLÜM D: Zaman Testi — İnteraktif Patina Simülatörü (#2B1B12 Koyu Zemin) */}
      <section className="pdp-band pdp-band-dark" aria-labelledby="pdp-patina-heading">
        <div className="pdp-band-inner pdp-split-grid">
          <div className="pdp-patina-copy">
            <p className="overline pdp-kicker-light">ZAMAN TESTİ</p>
            <h2 id="pdp-patina-heading" className="pdp-section-title-light">
              Deri yıllar içinde nasıl değişir
            </h2>
            <p className="pdp-section-lead-light">
              Suni yüzey eskir ve soyulur; gerçek hakiki deri yıllar içinde olgunlaşır. Kaydırıcıyı ileri alın ve{' '}
              {product.modelName} modelinin on yıllık yolculuğunu izleyin.
            </p>

            <div className="pdp-slider-control is-dark">
              <label htmlFor="pdp-year-range" className="pdp-range-label-light">
                {yearLabel}
              </label>
              <input
                id="pdp-year-range"
                type="range"
                min={0}
                max={10}
                step={1}
                value={patinaYears}
                aria-valuetext={yearLabel}
                onChange={(e) => setPatinaYears(Number(e.target.value))}
                className="pdp-range-input is-dark"
                style={{ '--slider-progress': `${patinaProgressPct}%` } as CSSProperties}
              />
            </div>

            <div className="pdp-patina-stage-note">
              <strong>{patinaTitle}</strong>
              <p>{patinaText}</p>
            </div>
          </div>

          <div className="pdp-patina-preview-wrap">
            <div
              role="img"
              aria-label={`${activeVariant.renk} rengi için ${yearLabel} temsili patina önizlemesi`}
              className="pdp-patina-card"
              style={{ backgroundColor: agedLeatherColor }}
            >
              <div
                aria-hidden="true"
                className="pdp-patina-sheen"
                style={{ opacity: patinaSheenOpacity }}
              />
              <div aria-hidden="true" className="pdp-patina-stitch" />
              {logoPreviewUrl && personalizationAddon !== 'none' ? (
                <img
                  src={logoPreviewUrl}
                  alt="Yüklenen logo önizlemesi"
                  className="pdp-patina-uploaded-logo"
                />
              ) : (
                <span className="pdp-patina-stamp" style={{ color: stampBaseHex }}>
                  {previewText}
                </span>
              )}
            </div>
            <p className="pdp-patina-caption">
              Temsili önizleme. Seçtiğiniz <strong>{activeVariant.renk}</strong> tonu ve baskı tercihinizle gösterilir.
            </p>
          </div>
        </div>
      </section>

      {/* BÖLÜM E: Atölye Yapım Adımları */}
      <section className="pdp-band pdp-band-cream" aria-labelledby="pdp-workshop-heading">
        <div className="pdp-band-inner pdp-split-grid">
          <div className="pdp-workshop-visual">
            {manifestoImg && (
              <img
                src={manifestoImg.full}
                alt={`${product.modelName} atölye el işçiliği görünümü`}
                width={manifestoImg.width}
                height={manifestoImg.height}
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="pdp-workshop-badge">
              <span>ATÖLYE ZANAATI</span>
              <strong>El Kesimi &amp; Saraciye İşçiliği</strong>
            </div>
          </div>

          <div className="pdp-workshop-copy">
            <p className="overline pdp-kicker">ATÖLYE</p>
            <h2 id="pdp-workshop-heading" className="pdp-section-title">
              {product.modelName} atölyede nasıl hazırlanır
            </h2>

            <div className="pdp-numbered-list">
              {workshopSteps.map((step, idx) => (
                <div key={step.title} className="pdp-numbered-item">
                  <span className="pdp-num-serif" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="pdp-workshop-signature">Elons Leather Atölyesi</p>
          </div>
        </div>
      </section>

      {/* BÖLÜM F: Açık Söz + Tam SEO Model Hikâyesi ve Bakım */}
      <section className="pdp-band pdp-band-white" aria-labelledby="pdp-honest-heading">
        <div className="pdp-band-inner pdp-honest-stack">
          <div className="pdp-honest-head">
            <p className="overline pdp-kicker">AÇIK SÖZ</p>
            <h2 id="pdp-honest-heading" className="pdp-section-title">
              Doğal deride nelerle karşılaşırsınız
            </h2>
          </div>

          <div className="pdp-three-cols-rule">
            {honestNotes.map((note) => (
              <article key={note.title} className="pdp-rule-card">
                <h3>{note.title}</h3>
                <p>{note.text}</p>
              </article>
            ))}
          </div>

          {/* Model Hikayesi & Bakım Kutusu (SEO uzun açıklamayı ve bakım maddelerini korur) */}
          <div className="pdp-story-paper-box">
            <div className="pdp-story-paper-copy">
              <p className="overline pdp-kicker">MODEL HİKÂYESİ</p>
              <h3>{product.modelName} Tasarım ve Kullanım Detayları</h3>
              {longParagraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
            <div className="pdp-story-paper-care">
              <p className="overline pdp-kicker">UZUN ÖMÜRLÜ KULLANIM</p>
              <h3>Deri Bakım Talimatları</h3>
              <ul>
                {product.careInstructions.map((tip) => (
                  <li key={tip}>
                    <span aria-hidden="true">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* BÖLÜM G: Model Seçimi Karşılaştırma Kartları (Aile Modelleri İçin) */}
      {compareTarget && compareMeta && (
        <section className="pdp-band pdp-band-cream" aria-labelledby="pdp-compare-heading">
          <div className="pdp-band-inner pdp-compare-stack">
            <div className="pdp-compare-head">
              <p className="overline pdp-kicker">MODEL SEÇİMİ</p>
              <h2 id="pdp-compare-heading" className="pdp-section-title">
                {product.modelName} mu, {compareTarget.modelName} mu
              </h2>
              <p className="pdp-section-lead">
                İki el yapımı model arasındaki temel tasarım ve kapasite farklarını yan yana kıyaslayın.
              </p>
            </div>

            <div className="pdp-compare-grid">
              <article className="pdp-compare-card is-current">
                <span className="pdp-compare-eyebrow">BU SAYFADAKİ MODEL</span>
                <h3>{product.modelName}</h3>
                <strong className="pdp-compare-price">
                  {formatPrice(activeVariant.price) || 'Fiyat güncelleniyor'} · {product.variants.length} renk
                </strong>
                <p>{product.shortDescription}</p>
                {isConfiguredValue(product.specs.kartKapasitesi) && (
                  <p className="pdp-compare-spec">
                    {product.specs.boyut} · {product.specs.kartKapasitesi}
                    {isConfiguredValue(product.specs.banknotBolmesi) ? ` · ${product.specs.banknotBolmesi}` : ''}
                  </p>
                )}
              </article>

              <article className="pdp-compare-card">
                <span className="pdp-compare-eyebrow">{compareMeta.badge}</span>
                <h3>{compareTarget.modelName}</h3>
                <strong className="pdp-compare-price">
                  {formatPrice(compareTarget.variants[0]?.price) || 'Fiyat güncelleniyor'} · {compareTarget.variants.length} renk
                </strong>
                <p>{compareTarget.shortDescription}</p>
                {isConfiguredValue(compareTarget.specs.kartKapasitesi) && (
                  <p className="pdp-compare-spec">
                    {compareTarget.specs.boyut} · {compareTarget.specs.kartKapasitesi}
                    {isConfiguredValue(compareTarget.specs.banknotBolmesi)
                      ? ` · ${compareTarget.specs.banknotBolmesi}`
                      : ''}
                  </p>
                )}
                <Link to={`/urun/${compareTarget.slug}/`} className="pdp-compare-link">
                  {compareTarget.modelName} sayfasına gidin →
                </Link>
              </article>
            </div>
          </div>
        </section>
      )}

      {/* BÖLÜM H: Sipariş Öncesi En Çok Sorulanlar (Accordion Guide Compliant) */}
      {product.faq.length > 0 && (
        <section
          className="pdp-band pdp-band-white pdp-faq-wrap"
          aria-labelledby="pdp-faq-heading"
        >
          <div className="pdp-band-inner pdp-faq-inner">
            <h2 id="pdp-faq-heading" className="pdp-faq-title">
              Sipariş öncesi en çok sorulanlar
            </h2>
            <div className="pdp-faq-list">
              {product.faq.map((item, idx) => (
                <details key={item.question} className="faq-item pdp-faq-item" open={idx === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
