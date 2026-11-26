export type BlogPost = {
  slug: string
  title: string
  category: 'Deri Rehberi' | 'Bakım' | 'Hediye & Stil'
  date: string
  readTime: string
  excerpt: string
  coverImage: string
  coverAlt: string
  relatedProductSlug: string
  sections: {
    heading: string
    paragraphs: string[]
  }[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'crazy-horse-hakiki-deri-nedir-patina-nasil-olusur',
    title: 'Crazy Horse Hakiki Deri Nedir? Patina Nasıl Oluşur?',
    category: 'Deri Rehberi',
    date: '18 Kasım 2026',
    readTime: '4 dk okuma',
    excerpt:
      'Doğal balmumu ve yağlarla işlenen Crazy Horse dana derisinin neden çizildikçe güzelleştiğini, yıllar içinde nasıl kişisel bir patina kazandığını keşfedin.',
    coverImage: '/assets/products/elon-leather-lodos-pro-taba-miknatisli-deri-cuzdan-4-detay.webp',
    coverAlt: 'Lodos Pro Taba Crazy Horse hakiki deri doku ve dikiş detayı',
    relatedProductSlug: 'lodos-pro-miknatisli-deri-cuzdan',
    sections: [
      {
        heading: 'Balmumu ile İşlenmiş Doğal Dana Derisi',
        paragraphs: [
          'Crazy Horse deri, sentetik kaplamalarla üzeri örtülmemiş tam sırçalı (full-grain) sığır derisinin doğal balmumu ve bitkisel yağlarla sıcak preslenerek işlenmesiyle elde edilir. Bu işlem deriye hem suya karşı doğal bir direnç hem de parmağınızla dokunduğunuzda renk tonunun hafifçe açılıp koyulaştığı canlı bir karakter kazandırır.',
          'Elons Leather atölyesinde üretilen Lodos Pro, Garbi ve Etezyen gibi modellerde tercih edilen bu deri türü, her cüzdanın ilk günden itibaren tek ve benzersiz görünmesini sağlar.',
        ],
      },
      {
        heading: 'Zamanla Oluşan Patina Nedir?',
        paragraphs: [
          'Deri yüzeyindeki mikro temaslar, elinizin doğal yağı ve güneş ışığı haftalar içinde deriyi parlatır ve tonunu derinleştirir. Buna "patina" denir. Sentetik veya poliüretan kaplı cüzdanlar zamanla soyulup yıpranırken, Crazy Horse hakiki deri kullanıldıkça daha tok, parlak ve karakterli bir görünüme kavuşur.',
        ],
      },
    ],
  },
  {
    slug: 'hakiki-deri-cuzdan-bakimi-ve-temizligi',
    title: 'Hakiki Deri Cüzdan Bakımı ve Temizliği Rehberi',
    category: 'Bakım',
    date: '14 Kasım 2026',
    readTime: '3 dk okuma',
    excerpt:
      'El yapımı deri cüzdanınızın formunu, mumlu iplik dikişlerini ve doğal dokusunu yıllarca ilk günkü kondisyonunda korumak için 5 temel adım.',
    coverImage: '/assets/products/elon-leather-etezyen-taba-klasik-deri-cuzdan-4-detay.webp',
    coverAlt: 'Etezyen Taba hakiki deri cüzdan bakım ve yüzey detayı',
    relatedProductSlug: 'etezyen-klasik-deri-cuzdan',
    sections: [
      {
        heading: 'Günlük Temizlik ve Nem Kontrolü',
        paragraphs: [
          'Hakiki deriyi temizlemek için hiçbir zaman alkol, kolonya, ıslak mendil veya kimyasal deterjan kullanmayın. Yüzeydeki tozu kuru veya çok hafif nemli yumuşak bir mikrofiber bezle nazikçe almanız yeterlidir.',
          'Cüzdanınız yağmurda ıslanırsa kalorifer veya saç kurutma makinesi gibi doğrudan ısı kaynaklarından uzak tutun; oda sıcaklığında kendi hâlinde kurumaya bırakın.',
        ],
      },
      {
        heading: 'Yüzey Çiziklerini Giderme ve Besleme',
        paragraphs: [
          'Crazy Horse deride oluşan yüzeysel tırnak veya anahtar izlerinin çoğu, parmak ucunuzla dairesel hareketlerle hafifçe ovaladığınızda balmumunun dağılmasıyla saniyeler içinde kaybolur. Yılda 1–2 kez renksiz doğal deri bakım kremi uygulamak derinin esnekliğini korur.',
        ],
      },
    ],
  },
  {
    slug: 'miknatisli-mi-klasik-mi-dogru-cuzdan-secimi',
    title: 'Mıknatıslı mı Klasik mi? Günlük Kullanıma Göre Cüzdan Seçimi',
    category: 'Deri Rehberi',
    date: '10 Kasım 2026',
    readTime: '4 dk okuma',
    excerpt:
      'Ön cep minimalizminden klasik katlanır alışkanlığa kadar taşıma tarzınıza en uygun Elons Leather cüzdan formunu seçmenize yardımcı olacak pratik karşılaştırma.',
    coverImage: '/assets/products/elon-leather-lodos-siyah-miknatisli-deri-cuzdan-2-acik-gorunum.webp',
    coverAlt: 'Lodos Siyah mıknatıslı hakiki deri cüzdan açık iç tasarım',
    relatedProductSlug: 'lodos-miknatisli-deri-cuzdan',
    sections: [
      {
        heading: 'Mıknatıslı Seriler: Lodos & Lodos Pro',
        paragraphs: [
          'Tek elle hızlı açılıp kendiliğinden kapanan kapak mekanizması, özellikle yoğun hareket hâlindeyken kartlarınıza pratik erişim sağlar. Lodos, Lodos Plus ve Lodos Pro serileri çoklu kart bölmelerini kompakt gövdede toplar.',
        ],
      },
      {
        heading: 'Klasik ve İnce Formlar: Etezyen, Garbi & Esinti',
        paragraphs: [
          'Geleneksel ikiye katlanır cüzdan hissinden vazgeçmeyenler için Etezyen tanıdık bir ergonomi sunarken; ceket veya ön pantolon cebinde sıfır kabarıklık isteyenler mandal tutuculu Garbi ya da ultra ince kartlık Esinti modelini tercih edebilir.',
        ],
      },
    ],
  },
  {
    slug: 'isme-ozel-baskili-deri-hediye-rehberi',
    title: 'İsme Özel Baskılı Deri Cüzdan Hediye Rehberi',
    category: 'Hediye & Stil',
    date: '5 Kasım 2026',
    readTime: '3 dk okuma',
    excerpt:
      'Doğum günü, yıldönümü veya kurumsal hediyelerde lazer isim, monogram ve özel logo baskısıyla unutulmaz bir deri hediye hazırlamanın püf noktaları.',
    coverImage: '/assets/products/elon-leather-garbi-taba-yesil-mandalli-deri-cuzdan-3-yasam-tarzi.webp',
    coverAlt: 'Garbi Taba Yeşil kişiselleştirilebilir hakiki deri cüzdan yaşam tarzı çekimi',
    relatedProductSlug: 'garbi-mandalli-deri-cuzdan',
    sections: [
      {
        heading: 'Ücretsiz İsim & Monogram Baskısı',
        paragraphs: [
          'Elons Leather atölyesinde seçtiğiniz cüzdan, ajanda kılıfı veya anahtarlığa ücretsiz isim veya baş harf (monogram) baskısı uygulanır. Büyük harflerden oluşan sade bir tipografi, hakiki derinin doğal dokusuyla zamansız bir bütünlük oluşturur.',
        ],
      },
      {
        heading: 'Hediye Seti Önerisi',
        paragraphs: [
          'Taba veya Zeytin Karası Yeşil bir cüzdanı aynı tonda Çapa deri anahtarlık ya da Seyir ajanda kılıfı ile eşleştirerek günlük kullanımda renk bütünlüğü sağlayan şık bir hediye seti oluşturabilirsiniz.',
        ],
      },
    ],
  },
]
