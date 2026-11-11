import { useEffect } from 'react'
import type { CategoryRecord, ProductRecord, ProductVariantRecord, SiteConfigRecord } from './types'

export type PreloadImageSpec =
  | string
  | {
      href: string
      media?: string
      imageSrcSet?: string
      imageSizes?: string
    }

export type RouteSeoPayload = {
  title: string
  description: string
  canonical: string
  robots: string
  ogType: 'website' | 'product' | 'article'
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogLocale: string
  productPriceAmount?: string | null
  productCurrency?: string
  preloadImages?: PreloadImageSpec[]
  jsonLd: Record<string, unknown>[]
}

function absUrl(siteUrl: string, pathnameOrUrl: string): string {
  if (/^https?:\/\//i.test(pathnameOrUrl)) return pathnameOrUrl
  const base = siteUrl.replace(/\/+$/, '')
  const rel = pathnameOrUrl.startsWith('/') ? pathnameOrUrl : `/${pathnameOrUrl}`
  return `${base}${rel}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str: string): string {
  return escapeHtml(str).replace(/"/g, '&quot;')
}

export function buildHomeSeo(
  config: SiteConfigRecord,
  firstHeroImage?: { full: string; thumb: string }
): RouteSeoPayload {
  const canonical = `${config.siteUrl.replace(/\/+$/, '')}/`
  const orgSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.brandName,
    url: canonical,
    logo: absUrl(config.siteUrl, '/assets/elon-logo.png'),
    email: config.email,
  }
  if (config.socialLinks && config.socialLinks.length > 0) {
    orgSchema.sameAs = config.socialLinks
  }

  const websiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.brandName,
    url: canonical,
    inLanguage: config.language,
  }

  return {
    title: config.seoHome.title,
    description: config.seoHome.metaDescription,
    canonical,
    robots: 'index, follow',
    ogType: 'website',
    ogTitle: config.seoHome.title,
    ogDescription: config.seoHome.metaDescription,
    ogImage: absUrl(config.siteUrl, config.defaultOgImage),
    ogLocale: config.locale,
    preloadImages: firstHeroImage
      ? [
          { href: firstHeroImage.thumb, media: '(max-width: 768px)' },
          { href: firstHeroImage.full, media: '(min-width: 769px)' },
        ]
      : [],
    jsonLd: [orgSchema, websiteSchema],
  }
}

export function buildCategorySeo(
  config: SiteConfigRecord,
  category: CategoryRecord,
  parentCategory: CategoryRecord | undefined,
  items: ProductRecord[]
): RouteSeoPayload {
  const canonical = absUrl(config.siteUrl, `/${category.slug}/`)

  const breadcrumbItems: Array<{ '@type': string; position: number; name: string; item: string }> = [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: `${config.siteUrl.replace(/\/+$/, '')}/` },
  ]
  if (parentCategory) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: parentCategory.name,
      item: absUrl(config.siteUrl, `/${parentCategory.slug}/`),
    })
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: category.name,
      item: canonical,
    })
  } else {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: category.name,
      item: canonical,
    })
  }

  const breadcrumbSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  const itemListElement = items.map((prod, index) => {
    const firstImg = prod.variants[0]?.images[0]?.thumb || prod.variants[0]?.images[0]?.full || config.defaultOgImage
    return {
      '@type': 'ListItem',
      position: index + 1,
      url: absUrl(config.siteUrl, `/urun/${prod.slug}/`),
      name: prod.name,
      image: absUrl(config.siteUrl, firstImg),
    }
  })

  const collectionSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.h1,
    description: category.seo.metaDescription,
    url: canonical,
    inLanguage: config.language,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement,
    },
  }

  const firstThumb = items[0]?.variants[0]?.images[0]?.thumb

  return {
    title: category.seo.title,
    description: category.seo.metaDescription,
    canonical,
    robots: 'index, follow',
    ogType: 'website',
    ogTitle: category.seo.title,
    ogDescription: category.seo.metaDescription,
    ogImage: absUrl(config.siteUrl, category.bannerImage),
    ogLocale: config.locale,
    preloadImages: firstThumb ? [firstThumb] : [],
    jsonLd: [breadcrumbSchema, collectionSchema],
  }
}

export function buildProductSeo(
  config: SiteConfigRecord,
  product: ProductRecord,
  activeVariant: ProductVariantRecord,
  primaryCat: CategoryRecord,
  parentCat: CategoryRecord | undefined,
  hasColorQuery: boolean
): RouteSeoPayload {
  // Always canonicalize variant URLs (?renk=...) cleanly to the main model URL
  const canonical = absUrl(config.siteUrl, `/urun/${product.slug}/`)
  const title =
    hasColorQuery && activeVariant.seoTitle ? activeVariant.seoTitle : product.seo.title

  const breadcrumbItems: Array<{ '@type': string; position: number; name: string; item: string }> = [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: `${config.siteUrl.replace(/\/+$/, '')}/` },
  ]
  let pos = 2
  if (parentCat) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: pos++,
      name: parentCat.name,
      item: absUrl(config.siteUrl, `/${parentCat.slug}/`),
    })
  }
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: pos++,
    name: primaryCat.name,
    item: absUrl(config.siteUrl, `/${primaryCat.slug}/`),
  })
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: pos,
    name: product.modelName,
    item: canonical,
  })

  const breadcrumbSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.modelName} ${product.productType} - ${activeVariant.renk}`,
    description: product.shortDescription,
    image: activeVariant.images.map((img) => absUrl(config.siteUrl, img.full)),
    sku: activeVariant.sku,
    brand: {
      '@type': 'Brand',
      name: config.brandName,
    },
    material: product.specs.malzeme,
    color: activeVariant.renk,
    category: primaryCat.name,
  }

  // Only emit Offer when price is confirmed (never fake price / never empty Offer price)
  // Do NOT emit shippingDetails or hasMerchantReturnPolicy while central config values are "TODO"
  if (typeof activeVariant.price === 'number') {
    productSchema.offers = {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'TRY',
      price: activeVariant.price,
      availability: activeVariant.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: config.brandName,
      },
    }
  }

  const firstHero = activeVariant.images[0]

  return {
    title,
    description: product.seo.metaDescription,
    canonical,
    robots: 'index, follow',
    ogType: 'product',
    ogTitle: title,
    ogDescription: product.seo.metaDescription,
    ogImage: absUrl(config.siteUrl, firstHero?.full || config.defaultOgImage),
    ogLocale: config.locale,
    productPriceAmount: typeof activeVariant.price === 'number' ? String(activeVariant.price) : null,
    productCurrency: 'TRY',
    preloadImages: firstHero
      ? [
          { href: firstHero.thumb, media: '(max-width: 768px)' },
          { href: firstHero.full, media: '(min-width: 769px)' },
        ]
      : [],
    jsonLd: [breadcrumbSchema, productSchema],
  }
}

export function buildStorySeo(config: SiteConfigRecord): RouteSeoPayload {
  const canonical = absUrl(config.siteUrl, '/hikayemiz/')
  const title = 'Hikâyemiz & Deri Zanaatı | Elon Leather'
  const description =
    'Elon Leather atölyesinde el dikimi hakiki deri üretimi, malzeme seçimi, sıcak gofraj isim baskısı ve zanaat yaklaşımımız hakkında bilgi edinin.'

  const breadcrumbSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: `${config.siteUrl.replace(/\/+$/, '')}/` },
      { '@type': 'ListItem', position: 2, name: 'Hikâyemiz', item: canonical },
    ],
  }

  const aboutSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    description,
    url: canonical,
    inLanguage: config.language,
    mainEntity: {
      '@type': 'Organization',
      name: config.brandName,
      url: `${config.siteUrl.replace(/\/+$/, '')}/`,
    },
  }

  return {
    title,
    description,
    canonical,
    robots: 'index, follow',
    ogType: 'website',
    ogTitle: title,
    ogDescription: description,
    ogImage: absUrl(config.siteUrl, config.defaultOgImage),
    ogLocale: config.locale,
    jsonLd: [breadcrumbSchema, aboutSchema],
  }
}

export function buildNotFoundSeo(config: SiteConfigRecord): RouteSeoPayload {
  return {
    title: 'Sayfa Bulunamadı (404) | Elon Leather',
    description: 'Aradığınız sayfa Elon Leather mağazasında bulunamadı. Cüzdan, kartlık, deri çanta ve aksesuar kategorilerimize göz atabilirsiniz.',
    canonical: absUrl(config.siteUrl, '/404.html'),
    robots: 'noindex, follow',
    ogType: 'website',
    ogTitle: 'Sayfa Bulunamadı | Elon Leather',
    ogDescription: 'Elon Leather mağaza koleksiyonlarına ana sayfadan veya kategori menüsünden ulaşabilirsiniz.',
    ogImage: absUrl(config.siteUrl, config.defaultOgImage),
    ogLocale: config.locale,
    jsonLd: [],
  }
}

export function renderSeoHeadTags(seo: RouteSeoPayload): string {
  const tags: string[] = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}" />`,
    `<meta name="robots" content="${escapeAttr(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeAttr(seo.canonical)}" />`,
    `<meta property="og:site_name" content="Elon Leather" />`,
    `<meta property="og:locale" content="${escapeAttr(seo.ogLocale)}" />`,
    `<meta property="og:type" content="${escapeAttr(seo.ogType)}" />`,
    `<meta property="og:title" content="${escapeAttr(seo.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(seo.ogDescription)}" />`,
    `<meta property="og:url" content="${escapeAttr(seo.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(seo.ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(seo.ogTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(seo.ogDescription)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(seo.ogImage)}" />`,
  ]

  if (seo.productPriceAmount) {
    tags.push(
      `<meta property="product:price:amount" content="${escapeAttr(seo.productPriceAmount)}" />`,
      `<meta property="product:price:currency" content="${escapeAttr(seo.productCurrency || 'TRY')}" />`
    )
  }

  if (seo.preloadImages && seo.preloadImages.length > 0) {
    for (const imgSpec of seo.preloadImages) {
      if (typeof imgSpec === 'string') {
        tags.push(`<link rel="preload" as="image" href="${escapeAttr(imgSpec)}" fetchpriority="high" />`)
      } else {
        const extra = [
          imgSpec.media ? ` media="${escapeAttr(imgSpec.media)}"` : '',
          imgSpec.imageSrcSet ? ` imagesrcset="${escapeAttr(imgSpec.imageSrcSet)}"` : '',
          imgSpec.imageSizes ? ` imagesizes="${escapeAttr(imgSpec.imageSizes)}"` : '',
        ].join('')
        tags.push(
          `<link rel="preload" as="image" href="${escapeAttr(imgSpec.href)}"${extra} fetchpriority="high" />`
        )
      }
    }
  }

  for (const schema of seo.jsonLd) {
    const json = JSON.stringify(schema).replace(/<\/script>/gi, '<\\/script>')
    tags.push(`<script type="application/ld+json">${json}</script>`)
  }

  return tags.join('\n    ')
}

export function useDocumentSeo(seo: RouteSeoPayload) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = seo.title

    const upsertMeta = (attr: 'name' | 'property', key: string, content: string | null) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!content) {
        el?.remove()
        return
      }
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const upsertLink = (rel: string, href: string) => {
      let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', rel)
        document.head.appendChild(el)
      }
      el.setAttribute('href', href)
    }

    upsertMeta('name', 'description', seo.description)
    upsertMeta('name', 'robots', seo.robots)
    upsertLink('canonical', seo.canonical)

    upsertMeta('property', 'og:site_name', 'Elon Leather')
    upsertMeta('property', 'og:locale', seo.ogLocale)
    upsertMeta('property', 'og:type', seo.ogType)
    upsertMeta('property', 'og:title', seo.ogTitle)
    upsertMeta('property', 'og:description', seo.ogDescription)
    upsertMeta('property', 'og:url', seo.canonical)
    upsertMeta('property', 'og:image', seo.ogImage)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', seo.ogTitle)
    upsertMeta('name', 'twitter:description', seo.ogDescription)
    upsertMeta('name', 'twitter:image', seo.ogImage)

    upsertMeta('property', 'product:price:amount', seo.productPriceAmount || null)
    upsertMeta('property', 'product:price:currency', seo.productPriceAmount ? 'TRY' : null)

    // Remove previous JSON-LD scripts managed by SSR or prior route transitions and replace cleanly
    document.head
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((node) => node.remove())

    for (const schema of seo.jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoManaged = 'true'
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    }
  }, [seo])
}
