import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

interface Chapter {
  id: 'flap' | 'cards' | 'profile'
  label: string
  sublabel: string
  time: number
  icon: string
}

const CHAPTERS: Chapter[] = [
  {
    id: 'flap',
    label: 'Manyetik Kilit',
    sublabel: 'Gizli Mıknatıs & Açılış',
    time: 1.5,
    icon: '🧲',
  },
  {
    id: 'cards',
    label: '3D Kart Mimarisi',
    sublabel: 'Katmanlı Süzülüş & 20 Kart',
    time: 5.5,
    icon: '💳',
  },
  {
    id: 'profile',
    label: 'İnce Profil & Gofraj',
    sublabel: 'Kalıcı Deri Damgası',
    time: 9.0,
    icon: '📐',
  },
]

export function Magnetic3DShowcase({ isPdp = false }: { isPdp?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(10.03)
  const [activeChapter, setActiveChapter] = useState<'flap' | 'cards' | 'profile'>('cards')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      const t = video.currentTime
      if (t < 3.8) {
        setActiveChapter('flap')
      } else if (t < 7.8) {
        setActiveChapter('cards')
      } else {
        setActiveChapter('profile')
      }
    }

    const handleLoadedMetadata = () => {
      if (video.duration && !Number.isNaN(video.duration)) {
        setDuration(video.duration)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const jumpToChapter = (chapter: Chapter) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = chapter.time
    setActiveChapter(chapter.id)
    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const targetTime = Number.parseFloat(e.target.value)
    video.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section className="magnetic-3d-section" id="3d-deneyim" aria-label="Rio Boss 3D İnovasyon Deneyimi">
      <div className="magnetic-3d-container">
        {/* Header */}
        <div className="magnetic-3d-header">
          <span className="magnetic-3d-eyebrow">RİO BOSS · 3D ANİMASYON DENEYİMİ</span>
          <h2 className="magnetic-3d-title">
            Zanaatın Üçüncü Boyutu:
            <br />
            <em>Manyetik Kilit &amp; 3D Kart Süzülüşü.</em>
          </h2>
          <p className="magnetic-3d-subtitle">
            Çift katlı mıknatıslı kapağın pürüzsüz açılışı ve basamaklı kart yuvalarından süzülen 20 kartlık mimari.
            Her detay, cebinizde yer kaplamayan bir akıcılık için tasarlandı.
          </p>
        </div>

        {/* 3D Video Showcase Theater */}
        <div className="magnetic-theater">
          <div className="magnetic-video-wrapper">
            <video
              ref={videoRef}
              className="magnetic-video-player"
              playsInline
              autoPlay
              muted
              loop
              poster="/assets/video/rio-boss-3d-poster.webp"
              preload="metadata"
            >
              <source src="/assets/video/rio-boss-3d-magnetic.webm" type="video/webm" />
              <source src="/assets/video/rio-boss-3d-magnetic.mp4" type="video/mp4" />
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>

            {/* Ambient Lighting Overlay */}
            <div className="magnetic-glow-overlay" aria-hidden="true" />

            {/* Play / Pause Floating Toggle */}
            <button
              type="button"
              className="magnetic-play-toggle"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Videoyu duraklat' : 'Videoyu oynat'}
              title={isPlaying ? 'Durdur' : 'Oynat'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>

          {/* Interactive Scrub Bar & Controls */}
          <div className="magnetic-controls-bar">
            <div className="magnetic-scrubber-track">
              <div
                className="magnetic-scrubber-fill"
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
              <input
                type="range"
                min="0"
                max={duration || 10}
                step="0.05"
                value={currentTime}
                onChange={handleScrub}
                className="magnetic-scrubber-input"
                aria-label="Animasyon zaman çubuğu"
              />
            </div>
            <div className="magnetic-time-display" aria-hidden="true">
              <span>0{Math.floor(currentTime)}:{(currentTime % 1).toFixed(2).slice(2)}</span>
              <span>/ 0{Math.floor(duration)}:{(duration % 1).toFixed(2).slice(2)}</span>
            </div>
          </div>

          {/* Chapter Selector Tabs */}
          <div className="magnetic-chapters-grid" role="tablist" aria-label="Animasyon bölümleri">
            {CHAPTERS.map((ch) => (
              <button
                type="button"
                key={ch.id}
                role="tab"
                aria-selected={activeChapter === ch.id}
                className={`magnetic-chapter-pill ${activeChapter === ch.id ? 'is-active' : ''}`}
                onClick={() => jumpToChapter(ch)}
              >
                <span className="chapter-icon">{ch.icon}</span>
                <span className="chapter-text">
                  <strong>{ch.label}</strong>
                  <small>{ch.sublabel}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="magnetic-features-grid">
          <div className="magnetic-feature-card">
            <div className="feature-card-icon">🧲</div>
            <h3>Hassas Manyetik Kilit</h3>
            <p>
              Deri altına gizlenen çift neodim mıknatıs, kapağı tek bir dokunuşla çıt diye kilitler.
              Cebinizde kendiliğinden açılmaz, kartlarınız daima güvendedir.
            </p>
          </div>

          <div className="magnetic-feature-card is-highlight">
            <div className="feature-card-icon">💳</div>
            <h3>3D Katmanlı Kart Mimarisi</h3>
            <p>
              Açıldığında kartların birbirine sürtünmeden basamaklı bir şekilde süzüldüğü geniş bölme.
              20 karta kadar kart ve çift banknot gözünü 8x10 cm incelikte taşır.
            </p>
          </div>

          <div className="magnetic-feature-card">
            <div className="feature-card-icon">✂️</div>
            <h3>Sıcak Gofraj &amp; Dikiş Detayı</h3>
            <p>
              Hakiki dana derisinin doğal patinasına sıcak demir kalıpla çökertilen Elon Leather imzası.
              Geleneksel mumlu iplik saraciye dikişiyle ömür boyu dayanıklılık.
            </p>
          </div>
        </div>

        {/* CTA Footer Band */}
        <div className="magnetic-cta-band">
          <div className="magnetic-cta-info">
            <span className="magnetic-cta-kicker">ATÖLYE AMİRAL GEMİSİ</span>
            <h4>Rio Boss Mıknatıslı Deri Cüzdan Serisi</h4>
            <p>Zeytin Karası Yeşil, Taba Kahverengi ve Gece Siyahı renk seçenekleriyle.</p>
          </div>
          <div className="magnetic-cta-actions">
            {isPdp ? (
              <a href="#buy-box" className="magnetic-btn-primary">
                Hemen Kişiselleştir &amp; Satın Al (1.600 TL) ↑
              </a>
            ) : (
              <Link to="/urun/rio-boss-miknatisli-deri-cuzdan/" className="magnetic-btn-primary">
                Rio Boss&apos;u İncele &amp; Sipariş Ver (1.600 TL) →
              </Link>
            )}
            <Link to="/miknatisli-deri-cuzdan/" className="magnetic-btn-secondary">
              Tüm Mıknatıslı Modeller
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
