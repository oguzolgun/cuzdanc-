import React from 'react'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { routes } from './app/routes'
import {
  getActiveVariant,
  getCategoryBySlug,
  getParentCategory,
  getProductBySlug,
  getProductsByCategory,
  products,
  siteConfig,
} from './app/data'
import {
  buildCategorySeo,
  buildHomeSeo,
  buildNotFoundSeo,
  buildProductSeo,
  buildStorySeo,
  renderSeoHeadTags,
  type RouteSeoPayload,
} from './app/seo'

const handler = createStaticHandler(routes)

export function computeRouteSeo(urlPath: string): RouteSeoPayload {
  const url = new URL(urlPath, siteConfig.siteUrl)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/') {
    const heroProduct = getProductBySlug('rio-boss-miknatisli-deri-cuzdan') || products[0]
    return buildHomeSeo(siteConfig, heroProduct?.variants[0]?.images[0])
  }

  if (pathname === '/hikayemiz') {
    return buildStorySeo(siteConfig)
  }

  if (pathname.startsWith('/urun/')) {
    const slug = decodeURIComponent(pathname.slice('/urun/'.length))
    const product = getProductBySlug(slug)
    if (product) {
      const colorQuery = url.searchParams.get('renk')
      const activeVariant = getActiveVariant(product, colorQuery)
      const primaryCat = getCategoryBySlug(product.primaryCategory)
      const parentCat = primaryCat ? getParentCategory(primaryCat) : undefined
      if (primaryCat) {
        return buildProductSeo(
          siteConfig,
          product,
          activeVariant,
          primaryCat,
          parentCat,
          Boolean(colorQuery)
        )
      }
    }
    return buildNotFoundSeo(siteConfig)
  }

  if (pathname === '/404.html') {
    return buildNotFoundSeo(siteConfig)
  }

  const catSlug = decodeURIComponent(pathname.slice(1))
  const category = getCategoryBySlug(catSlug)
  if (category) {
    const parentCat = getParentCategory(category)
    const items = getProductsByCategory(category.slug)
    return buildCategorySeo(siteConfig, category, parentCat, items)
  }

  return buildNotFoundSeo(siteConfig)
}

export async function render(urlPath: string): Promise<{
  appHtml: string
  headTags: string
  seo: RouteSeoPayload
}> {
  const fullUrl = new URL(urlPath, siteConfig.siteUrl).toString()
  const request = new Request(fullUrl, { method: 'GET' })
  const context = await handler.query(request)

  if (context instanceof Response) {
    const seo = computeRouteSeo(urlPath)
    return {
      appHtml: '',
      headTags: renderSeoHeadTags(seo),
      seo,
    }
  }

  const staticRouter = createStaticRouter(handler.dataRoutes, context)
  const appHtml = renderToString(
    <React.StrictMode>
      <StaticRouterProvider router={staticRouter} context={context} hydrate={false} />
    </React.StrictMode>
  )
  const seo = computeRouteSeo(urlPath)
  return {
    appHtml,
    headTags: renderSeoHeadTags(seo),
    seo,
  }
}
