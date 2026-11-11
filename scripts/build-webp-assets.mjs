#!/usr/bin/env node
/**
 * Bootstrap local WebP assets (1600px + 600px thumb) for the 12 core models
 * from the verified temporary catalog until local /FOTOLAR zip archives are supplied.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_TS = path.join(ROOT, 'src', 'app', 'data.ts');
const TMP_DL = path.join(ROOT, '.tmp-dl');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'products');

const MODEL_MAP = {
  'Rio': { slug: 'rio', tur: 'miknatisli-deri-cuzdan' },
  'Rio Boss': { slug: 'rio-boss', tur: 'miknatisli-deri-cuzdan' },
  'Rio Bro': { slug: 'rio-bro', tur: 'miknatisli-deri-cuzdan' },
  'Duo': { slug: 'duo', tur: 'klasik-deri-cuzdan' },
  'Dubai': { slug: 'dubai', tur: 'klasik-deri-cuzdan' },
  'Wonder': { slug: 'wonder', tur: 'ince-deri-kartlik' },
  'Elegant': { slug: 'elegant', tur: 'deri-el-cantasi' },
  'Eon': { slug: 'atlas', tur: 'deri-omuz-cantasi' },
  'Port': { slug: 'port', tur: 'deri-pasaportluk' },
  'Çekya': { slug: 'cekya', tur: 'deri-anahtarlik' },
  'Hong Kong': { slug: 'hong-kong', tur: 'deri-ajanda-kilifi' },
  'Berlin': { slug: 'berlin', tur: 'deri-bileklik' },
};

function slugifyTr(input) {
  return String(input || '')
    .replace(/[İI]/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/[Şş]/g, 's')
    .replace(/[Ğğ]/g, 'g')
    .replace(/[Üü]/g, 'u')
    .replace(/[Öö]/g, 'o')
    .replace(/[Çç]/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readWebpDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return { width: 1200, height: 1200 };
  }
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width: w, height: h };
  }
  if (chunk === 'VP8 ') {
    const w = buf.readUInt16LE(26) & 0x3fff;
    const h = buf.readUInt16LE(28) & 0x3fff;
    return { width: w, height: h };
  }
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    const w = (bits & 0x3fff) + 1;
    const h = ((bits >> 14) & 0x3fff) + 1;
    return { width: w, height: h };
  }
  return { width: 1200, height: 1200 };
}

function convertWebp(src, dst1600, dst600) {
  const r1 = spawnSync(
    ffmpegPath,
    ['-y', '-i', src, '-vf', "scale='min(1600,iw)':-2", '-c:v', 'libwebp', '-quality', '80', dst1600],
    { stdio: 'pipe' }
  );
  if (r1.status !== 0) {
    throw new Error(`ffmpeg failed (1600): ${r1.stderr?.toString()}`);
  }
  const r2 = spawnSync(
    ffmpegPath,
    ['-y', '-i', src, '-vf', "scale='min(600,iw)':-2", '-c:v', 'libwebp', '-quality', '80', dst600],
    { stdio: 'pipe' }
  );
  if (r2.status !== 0) {
    throw new Error(`ffmpeg failed (600): ${r2.stderr?.toString()}`);
  }
}

const raw = fs.readFileSync(DATA_TS, 'utf8');
const start = raw.indexOf('export const products: Product[] = ') + 'export const products: Product[] = '.length;
const end = raw.indexOf('\nexport function productImgUrl');
const oldProducts = JSON.parse(raw.slice(start, end).trim());

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DL, { recursive: true });

const outputMap = {};

for (const [origModel, meta] of Object.entries(MODEL_MAP)) {
  const variants = oldProducts.filter((p) => p.model === origModel);
  outputMap[meta.slug] = [];

  for (const v of variants) {
    const colorSlug = slugifyTr(v.colorName);
    const picked = v.images.slice(0, 4);
    const processedImgs = [];

    for (let i = 0; i < picked.length; i++) {
      const n = i + 1;
      const srcUrl = picked[i].includes('width=') ? picked[i] : `${picked[i]}&width=1600`;
      const dlFile = path.join(TMP_DL, `${meta.slug}-${colorSlug}-${n}.jpg`);
      const stem = `elon-leather-${meta.slug}-${colorSlug}-${meta.tur}-${n}`;
      const dst1600 = path.join(OUT_DIR, `${stem}.webp`);
      const dst600 = path.join(OUT_DIR, `${stem}-600.webp`);

      if (!fs.existsSync(dst1600) || !fs.existsSync(dst600)) {
        if (!fs.existsSync(dlFile)) {
          const res = await fetch(srcUrl);
          if (!res.ok) {
            console.warn(`WARN ${res.status}: ${srcUrl}`);
            continue;
          }
          const arrBuf = await res.arrayBuffer();
          fs.writeFileSync(dlFile, Buffer.from(arrBuf));
        }
        convertWebp(dlFile, dst1600, dst600);
      }

      const dims = readWebpDimensions(dst1600);
      processedImgs.push({
        full: `/assets/products/${stem}.webp`,
        thumb: `/assets/products/${stem}-600.webp`,
        width: dims.width,
        height: dims.height,
        sourceUrl: picked[i],
        sourceFileName: picked[i].split('/').pop()?.split('?')[0] || '',
      });
    }

    outputMap[meta.slug].push({
      colorName: v.colorName,
      colorSlug,
      colorHex: v.colorHex,
      price: v.price,
      images: processedImgs,
    });
  }
}

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'raw-variant-assets.json'), JSON.stringify(outputMap, null, 2));
fs.rmSync(TMP_DL, { recursive: true, force: true });
console.log('Done! Variants written to data/raw-variant-assets.json');
