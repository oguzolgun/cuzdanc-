export type Product = {
  slug: string
  name: string
  category: string
  categorySlug: string
  price: number
  tag?: string
  description: string
  images: [string, string]
  colors: { name: string; value: string }[]
  details: string[]
  capacity?: string
  isMechanism?: boolean
  isPersonalizable?: boolean
  rfidProtected?: boolean
}

export const categories = [
  { 
    slug: 'mekanizmali-cuzdan', 
    name: 'Mekanizmalı Cüzdan', 
    index: '01', 
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1400&q=90',
    description: 'Tek bir dokunuşla kademeli açılan, RFID korumalı patentli kızak teknolojisi.'
  },
  { 
    slug: 'klasik-cuzdan', 
    name: 'Klasik Deri Cüzdan', 
    index: '02', 
    image: 'https://images.unsplash.com/photo-1614330315526-166f2d71e544?auto=format&fit=crop&w=1400&q=90',
    description: 'Geleneksel saraç dikişi, çift banknot bölmesi ve zamanla patina kazanan hakiki dana derisi.'
  },
  { 
    slug: 'magsafe-kartlik', 
    name: 'MagSafe & Kartlık', 
    index: '03', 
    image: 'https://images.unsplash.com/photo-1614330316567-11d8e572db16?auto=format&fit=crop&w=1400&q=90',
    description: 'Telefonunuzla bütünleşen neodyum mıknatıslı minimalist deri kartlıklar.'
  },
  { 
    slug: 'seyahat-pasaport', 
    name: 'Seyahat & Pasaportluk', 
    index: '04', 
    image: 'https://images.unsplash.com/photo-1620109176813-e91290f6c795?auto=format&fit=crop&w=1400&q=90',
    description: 'Biniş kartları, pasaport ve dünya anılarınızı tek bir güvenli zarfta taşıyın.'
  },
  { 
    slug: 'deri-canta', 
    name: 'Deri Çanta & Postacı', 
    index: '05', 
    image: 'https://images.unsplash.com/photo-1630484179057-75e24310e2ff?auto=format&fit=crop&w=1400&q=90',
    description: 'Şehir ve yolculuklar için elde şekillendirilen zamansız omuz ve postacı çantaları.'
  },
  { 
    slug: 'aksesuar', 
    name: 'Aksesuar & Hediyelik', 
    index: '06', 
    image: 'https://images.unsplash.com/photo-1647502210988-19681f03a7a0?auto=format&fit=crop&w=1400&q=90',
    description: 'AirTag kılıfları, katı pirinç anahtarlıklar ve özel ahşap hediye kutulu setler.'
  },
]

const craftStandards = [
  '%100 Birinci Sınıf Hakiki Dana Derisi (Crazy Horse & Bitkisel Tabaklama)',
  'Mumlanmış iplikle elde çift saraç dikişi (Saddle Stitch)',
  'Ücretsiz İsim & Baş Harf Sıcak Gofraj Baskısı',
  'Ömür Boyu Cuoriva Atölye Bakım & Dikiş Garantisi',
]

export const products: Product[] = [
  {
    slug: 'volta-mekanizmali-cuzdan',
    name: 'Volta Pop-Up Mekanizmalı Cüzdan',
    category: 'Mekanizmalı Cüzdan',
    categorySlug: 'mekanizmali-cuzdan',
    price: 1950,
    tag: 'En Çok Satan',
    description: 'Tek bir mandal hareketiyle 6 kartınızı kademeli olarak sergileyen alüminyum korumalı hazne. Crazy Horse derinin eşsiz patinası ve iç kısımdaki para klipsiyle ceplerinizdeki kalabalığa son verir.',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1500&q=90',
      '/assets/cuoriva-leather-emboss.jpg',
    ],
    colors: [
      { name: 'Konyak Taba', value: '#9b4e26' },
      { name: 'Antik Kestane', value: '#5c3022' },
      { name: 'Orman Yeşili', value: '#434d3d' },
      { name: 'Gece Siyahı', value: '#1d1a18' },
    ],
    details: [
      ...craftStandards,
      'Alüminyum gövde ile %100 RFID/NFC temassız hırsızlık koruması',
      'Kapasite: 6 kart mekanizmada + 4 ek iç kart yuvası + çelik para maşası',
      'Ölçüler: 10.2 × 6.8 × 1.8 cm (Ultra kompakt form)',
    ],
    capacity: '10 Kart + Banknotlar',
    isMechanism: true,
    isPersonalizable: true,
    rfidProtected: true,
  },
  {
    slug: 'toscana-grand-bifold',
    name: 'Toscana Grand Bifold Deri Cüzdan',
    category: 'Klasik Deri Cüzdan',
    categorySlug: 'klasik-cuzdan',
    price: 2450,
    tag: 'Zanaat İmzası',
    description: 'Zamanla kendi hikayenizi yazacağınız rustik yüzey dokusu. Çift banknot gözü, 8 kart yuvası ve gizli cepleriyle klasik bifold tasarımının en sofistike İtalyan yorumu.',
    images: [
      '/assets/cuoriva-leather-emboss.jpg',
      'https://images.unsplash.com/photo-1614330315526-166f2d71e544?auto=format&fit=crop&w=1500&q=90',
    ],
    colors: [
      { name: 'Tütün Taba', value: '#84451f' },
      { name: 'Konyak', value: '#9b4e26' },
      { name: 'Kestane', value: '#573024' },
      { name: 'Siyah', value: '#1c1b19' },
    ],
    details: [
      ...craftStandards,
      '8 adet bağımsız kart bölmesi + 2 gizli evrak cebi',
      'Geniş çift kağıt para bölmesi (tüm uluslararası para birimleriyle uyumlu)',
      'Ölçüler: 11.5 × 9.2 × 1.2 cm',
    ],
    capacity: '10+ Kart + Çift Banknot Gözü',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: false,
  },
  {
    slug: 'magsafe-aero-kartlik',
    name: 'Aero MagSafe Manyetik Deri Kartlık',
    category: 'MagSafe & Kartlık',
    categorySlug: 'magsafe-kartlik',
    price: 1350,
    tag: 'Yeni Nesil',
    description: 'iPhone ve MagSafe kılıflarla kusursuz eşleşen N52 sınıfı güçlü neodyum mıknatıslar. Telefonunuzun arkasında şık bir deri duruşu ve hızlı erişilebilir 3 kart yuvası.',
    images: [
      'https://images.unsplash.com/photo-1614330316567-11d8e572db16?auto=format&fit=crop&w=1500&q=90',
      'https://images.unsplash.com/photo-1624538000860-24716b9050f2?auto=format&fit=crop&w=1500&q=90',
    ],
    colors: [
      { name: 'Konyak', value: '#a3562a' },
      { name: 'Zeytin Yeşili', value: '#555743' },
      { name: 'Gece Siyahı', value: '#1d1b1a' },
    ],
    details: [
      ...craftStandards,
      'MagSafe uyumlu ekstra güçlü N52 neodimyum manyetik çekim',
      '3 adet kart veya 2 kart + katlanmış acil banknot yuvası',
      'Manyetik kart koruyucu arka kalkan (kartların demanyetize olmasını engeller)',
    ],
    capacity: '3 Kart',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: true,
  },
  {
    slug: 'vento-cift-mekanizma',
    name: 'Vento Çift Mekanizmalı Cüzdan & Para Gözü',
    category: 'Mekanizmalı Cüzdan',
    categorySlug: 'mekanizmali-cuzdan',
    price: 2850,
    tag: 'Maksimum Kapasite',
    description: 'Tüm kart dünyasını cebinde taşımak isteyenler için: Çift alüminyum mekanizma ile 12 kartı tek dokunuşla sergileyen, fermuarlı bozuk para ve nakit bölmeli lüks amiral gemisi.',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1500&q=90',
      '/assets/cuoriva-hero-burst.jpg',
    ],
    colors: [
      { name: 'Antik Konyak', value: '#96481e' },
      { name: 'Kestane', value: '#5b2f21' },
      { name: 'Siyah', value: '#1d1a18' },
    ],
    details: [
      ...craftStandards,
      'Çift bağımsız alüminyum mekanizma (12 kart RFID korumalı)',
      'Ek 4 kart cebi + şık metal para klipsi + çıtçıtlı kilit',
      'Ölçüler: 10.5 × 7.5 × 2.6 cm',
    ],
    capacity: '16 Kart + Kağıt Para',
    isMechanism: true,
    isPersonalizable: true,
    rfidProtected: true,
  },
  {
    slug: 'nomad-pasaportluk',
    name: 'Nomad Gezgin Pasaportluk & Seyahat Cüzdanı',
    category: 'Seyahat & Pasaportluk',
    categorySlug: 'seyahat-pasaport',
    price: 2950,
    tag: 'Gezgin Seçimi',
    description: 'Havalimanında ve dünyanın her köşesinde tüm yolculuk belgeleriniz bir arada. Pasaport, uçak biniş kartları, uluslararası kredi kartları ve SIM kart pini için özel düşünülmüş bölmeler.',
    images: [
      'https://images.unsplash.com/photo-1620109176813-e91290f6c795?auto=format&fit=crop&w=1500&q=90',
      'https://images.unsplash.com/photo-1637486069202-b1163268c240?auto=format&fit=crop&w=1500&q=90',
    ],
    colors: [
      { name: 'Tütün', value: '#88451f' },
      { name: 'Konyak', value: '#a05128' },
      { name: 'Vişne Bordo', value: '#542323' },
    ],
    details: [
      ...craftStandards,
      'Pasaport yuvası + 2 biniş kartı cebi + 4 kart yuvası',
      'Gizli SIM kart ve SIM açma iğnesi yuvası',
      'Katlanmış acil döviz banknot gözü',
      'Ölçüler: 14.5 × 10.5 cm',
    ],
    capacity: 'Pasaport + 2 Bilet + 4 Kart',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: false,
  },
  {
    slug: 'atlas-postaci-cantasi',
    name: 'Atlas Deri Postacı & Laptop Çantası',
    category: 'Deri Çanta & Postacı',
    categorySlug: 'deri-canta',
    price: 10900,
    tag: 'Usta Parçası',
    description: '15.6 inç laptopunuz, defterleriniz ve günlük araçlarınız için el işçiliğiyle hazırlanan ağır hizmet tipi hakiki deri postacı çantası. Masif antik pirinç tokalar ve güçlendirilmiş omuz askısı.',
    images: [
      'https://images.unsplash.com/photo-1630484179057-75e24310e2ff?auto=format&fit=crop&w=1500&q=90',
      'https://images.unsplash.com/photo-1603219527847-24c87f552a77?auto=format&fit=crop&w=1500&q=90',
    ],
    colors: [
      { name: 'Kestane', value: '#63341f' },
      { name: 'Konyak', value: '#94471e' },
      { name: 'Gece Siyahı', value: '#252422' },
    ],
    details: [
      ...craftStandards,
      'Darbe emici keçe astarlı 15.6 inç korumalı laptop bölmesi',
      'Geniş ana gövde, cüzdan/pasaport iç cepleri ve arkada hızlı erişim fermuarlı göz',
      'Katı döküm antik pirinç donanım ve ayarlanabilir kalın deri omuz askısı',
      'Ölçüler: 39 × 29 × 10 cm',
    ],
    capacity: '15.6" Laptop + Aksesuarlar',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: false,
  },
  {
    slug: 'luna-omuz-cantasi',
    name: 'Luna Bohem Deri Omuz Çantası',
    category: 'Deri Çanta & Postacı',
    categorySlug: 'deri-canta',
    price: 8950,
    tag: 'Bohem İkon',
    description: 'Akdeniz sokaklarının sıcaklığı ve bohem şıklığın organik formu. Yumuşak tuşeli bitkisel tabaklanmış deri, gün boyu omzunuzda ağırlık yapmayan ergonomik kesim.',
    images: [
      'https://images.unsplash.com/photo-1691480150204-66dd1eb77391?auto=format&fit=crop&w=1500&q=90',
      'https://images.unsplash.com/photo-1597633125184-9fd7e54f0ff7?auto=format&fit=crop&w=1500&q=90',
    ],
    colors: [
      { name: 'Konyak Taba', value: '#9b4e26' },
      { name: 'Kestane', value: '#5c3022' },
      { name: 'Siyah', value: '#1d1a18' },
    ],
    details: [
      ...craftStandards,
      'Ayarlanabilir kalın örgü omuz askısı',
      'Gizli manyetik güvenlik kilidi ve iç fermuarlı telefon cebi',
      'Ölçüler: 32 × 24 × 11 cm',
    ],
    capacity: 'Günlük Eşyalar + Tablet',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: false,
  },
  {
    slug: 'atelier-airtag-anahtarlik',
    name: 'Atelier Deri AirTag Kılıf & Anahtarlık',
    category: 'Aksesuar & Hediyelik',
    categorySlug: 'aksesuar',
    price: 750,
    tag: 'İdeal Hediye',
    description: 'Apple AirTag ile milimetrik uyumlu, masif pirinç halkalı ve çıtçıt kilitli hakiki deri kılıf. Anahtarlarınızı ve çantalarınızı güvenle takip ederken sofistike bir dokunuş kazandırır.',
    images: [
      'https://images.unsplash.com/photo-1647502210988-19681f03a7a0?auto=format&fit=crop&w=1500&q=90',
      'https://images.unsplash.com/photo-1644258676710-ffb99d7d7a1b?auto=format&fit=crop&w=1500&q=90',
    ],
    colors: [
      { name: 'Konyak', value: '#ac673b' },
      { name: 'Kestane', value: '#59301f' },
      { name: 'Zeytin', value: '#484d3b' },
      { name: 'Siyah', value: '#1e1c1b' },
    ],
    details: [
      ...craftStandards,
      'Apple AirTag ile tam akustik ve manyetik uyum',
      'Katı döküm antik sarı pirinç yaylı halka',
      'Hediye olarak üzerine 2 veya 3 baş harf gofrajı yapılabilir',
    ],
    capacity: '1 AirTag + Anahtarlar',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: false,
  },
  {
    slug: 'siena-minimalist-kartlik',
    name: 'Siena Ultra İnce Deri Kartlık',
    category: 'MagSafe & Kartlık',
    categorySlug: 'magsafe-kartlik',
    price: 1150,
    tag: 'Minimalist',
    description: 'Sadece 4 milimetre kalınlığında. Ceket veya pantolon cebinde hiç ağırlık hissettirmeyen, 4 kart yuvası ve orta para bölmesi bulunan zarif günlük dost.',
    images: [
      'https://images.unsplash.com/photo-1614330316567-11d8e572db16?auto=format&fit=crop&w=1500&q=90',
      '/assets/cuoriva-leather-emboss.jpg',
    ],
    colors: [
      { name: 'Konyak', value: '#9a4c22' },
      { name: 'Kestane', value: '#582d20' },
      { name: 'Gece Siyahı', value: '#1c1a18' },
    ],
    details: [
      ...craftStandards,
      '4 adet kart gözü + 1 orta katlanmış para gözü',
      'Ölçüler: 10.0 × 7.2 × 0.4 cm',
    ],
    capacity: '6 Kart + Banknotlar',
    isMechanism: false,
    isPersonalizable: true,
    rfidProtected: false,
  },
]

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(price)
