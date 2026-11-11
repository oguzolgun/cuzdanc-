import rawSiteConfig from '../../data/siteConfig.json'
import rawCategories from '../../data/categories.json'
import rawProducts from '../../data/products.json'
import type { CategoryRecord, ProductRecord, ProductVariantRecord, SiteConfigRecord } from './types'

export type {
  CategoryGuideSection,
  CategoryRecord,
  FaqItem,
  ProductImageRecord,
  ProductPersonalizationRecord,
  ProductRecord,
  ProductSpecsRecord,
  ProductVariantRecord,
  SiteConfigRecord,
} from './types'

export const siteConfig = rawSiteConfig as SiteConfigRecord
export const categories = rawCategories as CategoryRecord[]
export const products = rawProducts as ProductRecord[]

export const parentCategories: CategoryRecord[] = categories.filter((c) => c.parentSlug === null)
export const subCategories: CategoryRecord[] = categories.filter((c) => c.parentSlug !== null)

export function isConfiguredValue(val: unknown): boolean {
  if (val === undefined || val === null) return false
  const str = String(val).trim()
  return str.length > 0 && str.toUpperCase() !== 'TODO'
}

export function getCategoryBySlug(slug: string): CategoryRecord | undefined {
  return categories.find((c) => c.slug === slug)
}

export function getParentCategory(category: CategoryRecord): CategoryRecord | undefined {
  if (!category.parentSlug) return undefined
  return getCategoryBySlug(category.parentSlug)
}

export function getChildCategories(parentSlug: string): CategoryRecord[] {
  return categories.filter((c) => c.parentSlug === parentSlug)
}

export function getProductsByCategory(catSlug: string): ProductRecord[] {
  const childSlugs = getChildCategories(catSlug).map((c) => c.slug)
  const targetSlugs = new Set([catSlug, ...childSlugs])
  return products.filter(
    (p) =>
      targetSlugs.has(p.primaryCategory) ||
      (p.extraCategories || []).some((extraSlug) => targetSlugs.has(extraSlug))
  )
}

export function getProductBySlug(slug: string): ProductRecord | undefined {
  return products.find((p) => p.slug === slug)
}

export function getActiveVariant(product: ProductRecord, colorQuery?: string | null): ProductVariantRecord {
  if (colorQuery) {
    const normalized = colorQuery.trim().toLocaleLowerCase('tr-TR')
    const found = product.variants.find(
      (v) =>
        v.renkSlug === normalized ||
        v.renk.toLocaleLowerCase('tr-TR') === normalized
    )
    if (found) return found
  }
  return product.variants[0]
}

export function getProductStartingPrice(product: ProductRecord): number | null {
  const numericPrices = product.variants
    .map((v) => v.price)
    .filter((p): p is number => typeof p === 'number' && !Number.isNaN(p))
  if (numericPrices.length === 0) return null
  return Math.min(...numericPrices)
}

export function formatPrice(price: number | 'TODO' | null | undefined): string | null {
  if (typeof price !== 'number' || Number.isNaN(price)) return null
  return `${new Intl.NumberFormat('tr-TR').format(price)} TL`
}
