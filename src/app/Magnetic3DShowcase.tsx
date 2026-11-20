import { useState } from 'react'
import { Link } from 'react-router'

interface ShowcaseFeature {
  id: string
  step: string
  title: string
  body: string
  image: string
  thumb: string
  alt: string
  ctaLabel: string
  ctaUrl: string
}

const FEATURES: ShowcaseFeature[] = [
  {
    id: 'emboss',
    step: '01 · DOKU & DİKİŞ',
    title: 'Doğal Damarlı Deri & Saraciye Dikişi',
    body: 'Her Lodos Pro ve Keşişleme modeli, doğal damarlı hakiki dana derisinden el işçiliğiyle kesilir ve mumlu iplikle özenle dikilir.',
    image: '/assets/products/elon-leather-lodos-pro-taba-miknatisli-deri-cuzdan-4-detay.webp',
    thumb: '/assets/products/elon-leather-lodos-pro-taba-miknatisli-deri-cuzdan-4-detay-600.webp',
    alt: 'Lodos Pro Taba hakiki deri cüzdan dikiş ve deri dokusu detayı',
    ctaLabel: "Lodos Pro'yu İncele (1.600 TL) →",
    ctaUrl: '/urun/lodos-pro-miknatisli-deri-cuzdan/',
  },
  {
    id: 'interior',
    step: '02 · İÇ MİMARİ',
    title: 'Kompakt Ölçüde Geniş Kart & Banknot Düzeni',
    body: '8 x 10 cm kompakt formda 20 karta kadar kapasite ve çift banknot bölmesiyle cebinizde şişkinlik yaratmadan tüm düzeni korur.',
    image: '/assets/products/elon-leather-lodos-pro-taba-miknatisli-deri-cuzdan-2-acik-gorunum.webp',
    thumb: '/assets/products/elon-leather-lodos-pro-taba-miknatisli-deri-cuzdan-2-acik-gorunum-600.webp',
    alt: 'Lodos Pro Taba hakiki deri cüzdan açık iç görünüm ve kart bölmeleri',
    ctaLabel: 'Mıknatıslı Cüzdanları Gör →',
    ctaUrl: '/miknatisli-deri-cuzdan/',
  },
  {
    id: 'craft',
    step: '03 · ZANAAT',
    title: 'Zamansız Klasik & İnce Formlar',
    body: 'Geleneksel katlanır cüzdan alışkanlığını modern dikiş çizgileriyle buluşturan Keşişleme ve Garbi serileri, kullanıldıkça size özel patina kazanır.',
    image: '/assets/products/elon-leather-kesisleme-taba-klasik-deri-cuzdan-4-detay.webp',
    thumb: '/assets/products/elon-leather-kesisleme-taba-klasik-deri-cuzdan-4-detay-600.webp',
    alt: 'Keşişleme Taba klasik hakiki deri cüzdan dikiş ve yüzey detayı',
    ctaLabel: "Keşişleme'yi İncele (1.499 TL) →",
    ctaUrl: '/urun/kesisleme-klasik-deri-cuzdan/',
  },
]

export function Magnetic3DShowcase({ isPdp: _isPdp = false }: { isPdp?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const active = FEATURES[activeIdx] ?? FEATURES[0]

  return (
    <section className="atelier-real-showcase" id="3d-deneyim" aria-label="Elon Leather Atölye Detayları">
      <div className="atelier-showcase-container">
        <div className="atelier-showcase-copy">
          <span className="magnetic-3d-eyebrow">ELON LEATHER · ATÖLYE DETAYI</span>
          <h2 className="magnetic-3d-title">
            Gerçek Deri,
            <br />
            <em>Kusursuz İşçilik.</em>
          </h2>
          <p className="atelier-showcase-lead">
            Dünyaları cüzdana sığdırıyoruz. Tüm modellerimiz kendi atölyemizde gerçek hakiki deriden üretilir ve ücretsiz sıcak gofraj isim baskısıyla kişiselleştirilir.
          </p>

          <div className="atelier-feature-tabs" role="tablist" aria-label="Atölye Özellikleri">
            {FEATURES.map((feat, idx) => (
              <button
                key={feat.id}
                type="button"
                role="tab"
                aria-selected={activeIdx === idx}
                className={`atelier-feature-tab ${activeIdx === idx ? 'is-active' : ''}`}
                onClick={() => setActiveIdx(idx)}
              >
                <span className="atelier-tab-kicker">{feat.step}</span>
                <strong>{feat.title}</strong>
                {activeIdx === idx && <p>{feat.body}</p>}
              </button>
            ))}
          </div>

          <div className="atelier-showcase-ctas">
            <Link to={active.ctaUrl} className="magnetic-btn-primary">
              {active.ctaLabel}
            </Link>
            <Link to="/cuzdan-kartlik/" className="magnetic-btn-secondary">
              Tüm Cüzdanlar
            </Link>
            <a href="#kisisellestir" className="magnetic-btn-secondary">
              İsim Baskısı Dene
            </a>
          </div>
        </div>

        <div className="atelier-showcase-media">
          <picture key={active.image}>
            <source media="(max-width: 768px)" srcSet={active.thumb} />
            <img
              src={active.image}
              alt={active.alt}
              width={1200}
              height={1800}
              loading="lazy"
              decoding="async"
              className="atelier-showcase-img"
            />
          </picture>
        </div>
      </div>
    </section>
  )
}
