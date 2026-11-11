#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const config = loadJson('siteConfig.json');
const categories = loadJson('categories.json');
const products = loadJson('products.json');

const errors = [];
const warnings = [];

function checkRange(label, val, min, max) {
  if (val < min || val > max) {
    errors.push(`${label}: ${val} is outside [${min}, ${max}]`);
  }
}

// Home SEO check
if (config.seoHome.title.length > 60) {
  errors.push(`Home title length (${config.seoHome.title.length}) > 60: "${config.seoHome.title}"`);
}
checkRange('Home metaDescription chars', config.seoHome.metaDescription.length, 140, 155);

const seenCatSlugs = new Set();
const seenTitles = new Set([config.seoHome.title]);
const seenH1s = new Set();

// Helper to resolve products belonging to a category (parent includes children)
function getProductsInCategory(catSlug) {
  const childSlugs = categories.filter((c) => c.parentSlug === catSlug).map((c) => c.slug);
  const targetSlugs = new Set([catSlug, ...childSlugs]);
  return products.filter(
    (p) => targetSlugs.has(p.primaryCategory) || (p.extraCategories || []).some((e) => targetSlugs.has(e))
  );
}

for (const cat of categories) {
  if (seenCatSlugs.has(cat.slug)) errors.push(`Duplicate category slug: ${cat.slug}`);
  seenCatSlugs.add(cat.slug);

  const catProducts = getProductsInCategory(cat.slug);
  if (catProducts.length === 0) {
    errors.push(`Empty category published: ${cat.slug}`);
  }

  if (seenTitles.has(cat.seo.title)) errors.push(`Duplicate SEO title: ${cat.seo.title}`);
  seenTitles.add(cat.seo.title);

  if (seenH1s.has(cat.h1)) errors.push(`Duplicate H1: ${cat.h1}`);
  seenH1s.add(cat.h1);

  if (cat.seo.title.length > 60) {
    errors.push(`Category "${cat.slug}" title > 60 chars (${cat.seo.title.length}): "${cat.seo.title}"`);
  }
  checkRange(`Category "${cat.slug}" metaDescription chars`, cat.seo.metaDescription.length, 140, 155);

  const introWords = countWords(cat.shortIntro);
  checkRange(`Category "${cat.slug}" shortIntro words`, introWords, 40, 60);

  const guideWords = (cat.seoGuideSections || [])
    .map((sec) => [sec.heading, ...(sec.paragraphs || [])].join(' '))
    .map(countWords)
    .reduce((a, b) => a + b, 0);
  checkRange(`Category "${cat.slug}" seoGuide words`, guideWords, 250, 400);

  checkRange(`Category "${cat.slug}" FAQ count`, (cat.faq || []).length, 3, 5);

  const publicBannerPath = path.join(PUBLIC_DIR, cat.bannerImage.replace(/^\//, ''));
  if (!fs.existsSync(publicBannerPath)) {
    errors.push(`Missing category banner image: ${cat.bannerImage}`);
  }

  if (
    JSON.stringify({
      title: cat.seo.title,
      desc: cat.seo.metaDescription,
      h1: cat.h1,
      intro: cat.shortIntro,
      guide: cat.seoGuideSections,
      faq: cat.faq,
    }).includes('TODO')
  ) {
    errors.push(`Category "${cat.slug}" contains raw TODO in visible copy/SEO`);
  }
}

const seenProductSlugs = new Set();
const seenSkus = new Set();

for (const prod of products) {
  if (seenProductSlugs.has(prod.slug)) errors.push(`Duplicate product slug: ${prod.slug}`);
  seenProductSlugs.add(prod.slug);

  if (seenTitles.has(prod.seo.title)) errors.push(`Duplicate SEO title: ${prod.seo.title}`);
  seenTitles.add(prod.seo.title);

  if (prod.seo.title.length > 60) {
    errors.push(`Product "${prod.slug}" title > 60 chars (${prod.seo.title.length}): "${prod.seo.title}"`);
  }
  checkRange(`Product "${prod.slug}" metaDescription chars`, prod.seo.metaDescription.length, 140, 155);

  const longWords = countWords(prod.longDescription);
  checkRange(`Product "${prod.slug}" longDescription words`, longWords, 150, 250);

  checkRange(`Product "${prod.slug}" FAQ count`, (prod.faq || []).length, 3, 5);

  if (prod.id !== 'rio-boss') {
    for (const field of ['boyut', 'kartKapasitesi', 'banknotBolmesi', 'kapama']) {
      if (prod.specs[field] !== 'TODO') {
        errors.push(`Product "${prod.slug}" invented non-Rio-Boss spec "${field}": "${prod.specs[field]}"`);
      }
    }
  } else {
    if (prod.specs.boyut === 'TODO' || prod.specs.kartKapasitesi === 'TODO') {
      errors.push(`Rio Boss missing confirmed specs`);
    }
  }

  if (prod.id === 'port') {
    for (const v of prod.variants) {
      if (v.price !== 'TODO') {
        errors.push(`Port variant "${v.renk}" price should be "TODO", got ${v.price}`);
      }
    }
  }

  for (const v of prod.variants) {
    if (seenSkus.has(v.sku)) {
      errors.push(`Duplicate variant SKU: ${v.sku}`);
    }
    seenSkus.add(v.sku);
    if (!v.images || v.images.length === 0) {
      errors.push(`Product "${prod.slug}" variant "${v.renk}" has no images`);
    }
    if (v.seoTitle && v.seoTitle.length > 60) {
      errors.push(`Variant title > 60 chars (${v.seoTitle.length}): "${v.seoTitle}"`);
    }
    for (const img of v.images) {
      if (img.alt.includes('TODO')) {
        errors.push(`Image alt contains TODO: ${img.alt}`);
      }
      for (const fileRef of [img.full, img.thumb]) {
        const diskPath = path.join(PUBLIC_DIR, fileRef.replace(/^\//, ''));
        if (!fs.existsSync(diskPath)) {
          errors.push(`Missing WebP asset on disk: ${fileRef}`);
        }
      }
    }
  }
}

// Check OG default banner exists
const defaultOgDisk = path.join(PUBLIC_DIR, config.defaultOgImage.replace(/^\//, ''));
if (!fs.existsSync(defaultOgDisk)) {
  errors.push(`Missing default OG image: ${config.defaultOgImage}`);
}

console.log(`Validated ${categories.length} categories and ${products.length} product models.`);
if (warnings.length) {
  console.warn('\nWARNINGS:\n' + warnings.map((w) => `  - ${w}`).join('\n'));
}
if (errors.length) {
  console.error('\nVALIDATION ERRORS:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log('✓ All SEO, content length, TODO guard, and image disk checks PASSED!');
