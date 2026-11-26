import React from 'react'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { BLOG_POSTS } from './app/blogData'
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
  buildAllCategoriesSeo,
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
    const heroProduct = getProductBySlug('lodos-pro-miknatisli-deri-cuzdan') || products[0]
    return buildHomeSeo(siteConfig, heroProduct?.variants[0]?.images[0])
  }

  if (pathname === '/hikayemiz') {
    return buildStorySeo(siteConfig)
  }

  if (pathname === '/kategoriler') {
    return buildAllCategoriesSeo(siteConfig)
  }

  const base = siteConfig.siteUrl.replace(/\/+$/, '')
  const defaultOg = siteConfig.defaultOgImage.startsWith('http')
    ? siteConfig.defaultOgImage
    : `${base}${siteConfig.defaultOgImage}`

  if (pathname === '/kvkk') {
    const title = 'KVKK Aydınlatma Metni & Gizlilik Politikası | Elons Leather'
    const description =
      '6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında Elons Leather KVKK aydınlatma metni, çerez ve gizlilik politikası.'
    return {
      title,
      description,
      canonical: `${base}/kvkk/`,
      robots: 'index, follow',
      ogType: 'website',
      ogTitle: title,
      ogDescription: description,
      ogImage: defaultOg,
      ogLocale: 'tr_TR',
      jsonLd: [],
    }
  }

  if (pathname === '/blog') {
    const title = 'Blog & Deri Rehberi | Elons Leather'
    const description =
      'Crazy Horse deri bakımı, cüzdan seçimi, patina oluşumu ve isme özel deri hediye rehberleri — Elons Leather Atölye Blogu.'
    return {
      title,
      description,
      canonical: `${base}/blog/`,
      robots: 'index, follow',
      ogType: 'website',
      ogTitle: title,
      ogDescription: description,
      ogImage: defaultOg,
      ogLocale: 'tr_TR',
      jsonLd: [],
    }
  }

  if (pathname.startsWith('/blog/')) {
    const slug = decodeURIComponent(pathname.slice('/blog/'.length))
    const post = BLOG_POSTS.find((p) => p.slug === slug)
    if (post) {
      const title = `${post.title} | Elons Leather Blog`
      const imgUrl = post.coverImage.startsWith('http') ? post.coverImage : `${base}${post.coverImage}`
      return {
        title,
        description: post.excerpt,
        canonical: `${base}/blog/${post.slug}/`,
        robots: 'index, follow',
        ogType: 'article',
        ogTitle: title,
        ogDescription: post.excerpt,
        ogImage: imgUrl,
        ogLocale: 'tr_TR',
        jsonLd: [],
      }
    }
  }

  if (pathname === '/giris' || pathname === '/uye-ol' || pathname === '/sepet') {
    const metaMap: Record<string, { title: string; description: string }> = {
      '/giris': {
        title: 'Giriş Yap | Elons Leather',
        description: 'Elons Leather hesabınıza giriş yapın; siparişlerinizi ve favori hakiki deri ürünlerinizi yönetin.',
      },
      '/uye-ol': {
        title: 'Üye Ol | Elons Leather',
        description: 'Elons Leather hesabı oluşturun; el yapımı hakiki deri siparişlerinizi kolayca yönetin.',
      },
      '/sepet': {
        title: 'Sepetim | Elons Leather',
        description: 'Elons Leather alışveriş sepetiniz: el yapımı hakiki deri cüzdan, kartlık ve aksesuar sipariş özetiniz.',
      },
    }
    const m = metaMap[pathname]
    return {
      title: m.title,
      description: m.description,
      canonical: `${base}${pathname}/`,
      robots: 'noindex, follow',
      ogType: 'website',
      ogTitle: m.title,
      ogDescription: m.description,
      ogImage: defaultOg,
      ogLocale: 'tr_TR',
      jsonLd: [],
    }
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
