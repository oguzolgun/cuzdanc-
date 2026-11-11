import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const DIST_SSR_DIR = path.join(ROOT, 'dist-ssr')
const PUBLIC_DIR = path.join(ROOT, 'public')

const siteConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/siteConfig.json'), 'utf8'))
const categories = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/categories.json'), 'utf8'))
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'))

function buildRoutePlan() {
  const routes = [
    { urlPath: '/', outRel: 'index.html', priority: '1.0', changefreq: 'weekly', indexable: true },
  ]

  for (const cat of categories) {
    routes.push({
      urlPath: `/${cat.slug}/`,
      outRel: path.join(cat.slug, 'index.html'),
      priority: cat.parentSlug ? '0.85' : '0.9',
      changefreq: 'weekly',
      indexable: true,
    })
  }

  for (const prod of products) {
    routes.push({
      urlPath: `/urun/${prod.slug}/`,
      outRel: path.join('urun', prod.slug, 'index.html'),
      priority: '0.8',
      changefreq: 'weekly',
      indexable: true,
    })
  }

  routes.push({
    urlPath: '/hikayemiz/',
    outRel: path.join('hikayemiz', 'index.html'),
    priority: '0.6',
    changefreq: 'monthly',
    indexable: true,
  })

  routes.push({
    urlPath: '/404.html',
    outRel: '404.html',
    priority: '0.0',
    changefreq: 'yearly',
    indexable: false,
  })

  return routes
}

function cleanHeadTemplate(templateHtml) {
  // Replace markers and strip duplicate meta/title tags injected by build plugins outside our markers
  const withoutSeoMarker = templateHtml.replace(
    /<!--\s*SEO_HEAD_START\s*-->[\s\S]*?<!--\s*SEO_HEAD_END\s*-->/i,
    '<!-- SEO_HEAD_SLOT -->'
  )

  return withoutSeoMarker
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["'](?:og|product):[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
}

function injectPageHtml(cleanTemplate, appHtml, headTags) {
  let html = cleanTemplate.replace(
    '<!-- SEO_HEAD_SLOT -->',
    `<!-- SEO_HEAD_START -->\n    ${headTags}\n    <!-- SEO_HEAD_END -->`
  )
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
  return html
}

function extractVisibleText(appHtml) {
  return appHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function generateSitemapXml(indexableRoutes) {
  const baseUrl = siteConfig.siteUrl.replace(/\/+$/, '')
  const today = new Date().toISOString().slice(0, 10)
  const urls = indexableRoutes
    .map((r) => {
      const loc = r.urlPath === '/' ? `${baseUrl}/` : `${baseUrl}${r.urlPath}`
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${r.changefreq}</changefreq>`,
        `    <priority>${r.priority}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

async function run() {
  const templatePath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(templatePath)) {
    throw new Error('dist/index.html missing. Run `vite build` before prerender.')
  }

  const ssrEntryPath = path.join(DIST_SSR_DIR, 'entry-server.js')
  if (!fs.existsSync(ssrEntryPath)) {
    throw new Error('dist-ssr/entry-server.js missing. Run `vite build --ssr` before prerender.')
  }

  const rawTemplate = fs.readFileSync(templatePath, 'utf8')
  const cleanTemplate = cleanHeadTemplate(rawTemplate)
  const { render } = await import(pathToFileURL(ssrEntryPath).href)

  const routePlan = buildRoutePlan()
  let todoLeaks = 0

  for (const route of routePlan) {
    const { appHtml, headTags, seo } = await render(route.urlPath)
    if (!appHtml || appHtml.trim().length < 100) {
      throw new Error(`SSR produced empty HTML for route: ${route.urlPath}`)
    }

    const visibleText = extractVisibleText(appHtml)
    if (/\bTODO\b/i.test(visibleText)) {
      console.error(`ERROR: Visible "TODO" leaked into ${route.urlPath}`)
      todoLeaks++
    }
    if (/\bTODO\b/i.test(headTags)) {
      console.error(`ERROR: "TODO" leaked into <head> of ${route.urlPath}`)
      todoLeaks++
    }

    const expectedRobots = route.indexable ? 'index, follow' : 'noindex, follow'
    if (seo.robots !== expectedRobots) {
      throw new Error(`Unexpected robots directive on ${route.urlPath}: ${seo.robots}`)
    }

    const fullHtml = injectPageHtml(cleanTemplate, appHtml, headTags)
    const outFile = path.join(DIST_DIR, route.outRel)
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, fullHtml, 'utf8')
  }

  if (todoLeaks > 0) {
    throw new Error(`Aborting pre-render due to ${todoLeaks} TODO string leaks in rendered output.`)
  }

  const indexableRoutes = routePlan.filter((r) => r.indexable)
  const sitemapXml = generateSitemapXml(indexableRoutes)
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8')
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8')

  fs.rmSync(DIST_SSR_DIR, { recursive: true, force: true })

  console.log(
    `✓ Pre-rendered ${routePlan.length} static HTML pages (${indexableRoutes.length} indexable + 404.html) & generated sitemap.xml`
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
