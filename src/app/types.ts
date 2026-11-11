export type CategoryGuideSection = {
  heading: string
  level?: 'h2' | 'h3'
  paragraphs: string[]
}

export type FaqItem = {
  question: string
  answer: string
}

export type CategoryRecord = {
  slug: string
  name: string
  parentSlug: string | null
  index: string
  targetKeyword: string
  h1: string
  bannerImage: string
  shortIntro: string
  seoGuideSections: CategoryGuideSection[]
  faq: FaqItem[]
  relatedSlugs: string[]
  seo: {
    title: string
    metaDescription: string
  }
}

export type ProductImageRecord = {
  full: string
  thumb: string
  width: number
  height: number
  alt: string
}

export type ProductVariantRecord = {
  renk: string
  renkSlug: string
  colorHex: string
  sku: string
  price: number | 'TODO'
  seoTitle?: string
  images: ProductImageRecord[]
  inStock: boolean
}

export type ProductSpecsRecord = {
  boyut: string
  kartKapasitesi: string
  banknotBolmesi: string
  kapama: string
  malzeme: string
  uretim: string
}

export type ProductPersonalizationRecord = {
  isimYazdirma: boolean
  logoEkleme: boolean
  gorselBaski: boolean
  extraPrice: number
  logoExtraPrice?: number
  imageExtraPrice?: number
}

export type ProductRecord = {
  id: string
  slug: string
  sourceFolder: string
  exactNameNote?: string
  name: string
  modelName: string
  productType: string
  primaryCategory: string
  extraCategories: string[]
  shortDescription: string
  longDescription: string
  features: string[]
  specs: ProductSpecsRecord
  careInstructions: string[]
  variants: ProductVariantRecord[]
  personalization: ProductPersonalizationRecord
  faq: FaqItem[]
  relatedProducts: string[]
  seo: {
    title: string
    metaDescription: string
  }
}

export type SiteConfigRecord = {
  brandName: string
  legalName: string
  siteUrl: string
  locale: string
  language: string
  email: string
  whatsappNumber: string
  shippingSummary: string
  shippingBadgeText: string
  returnPolicy: string
  giftBoxIncluded: string
  personalizationDefaults: {
    nameEmbossing: string
    logoAdditionExtraTry: number
    imagePrintExtraTry: number
    maxNameLength: number
  }
  defaultOgImage: string
  socialLinks: string[]
  seoHome: {
    title: string
    metaDescription: string
  }
}
