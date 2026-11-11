#!/usr/bin/env node
/**
 * Converts Google Drive zip archives in /FOTOLAR into WebP assets + 600px thumbnails
 * named: elon-leather-{model}-{renk}-{tur}-{n}.webp
 * Usage: node scripts/process-fotolar-zips.mjs [path/to/FOTOLAR]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const ROOT = path.resolve(import.meta.dirname, '..');
const FOTOLAR_DIR = path.resolve(process.argv[2] || path.join(ROOT, 'FOTOLAR'));
const TEMP_DIR = path.join(ROOT, '.tmp-unzip');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'products');

const FOLDER_MAP = [
  { match: /r[iİ]o\s*boss/i, model: 'rio-boss', tur: 'miknatisli-deri-cuzdan' },
  { match: /r[iİ]o\s*bro/i, model: 'rio-bro', tur: 'miknatisli-deri-cuzdan' },
  { match: /\br[iİ]o\b/i, model: 'rio', tur: 'miknatisli-deri-cuzdan' },
  { match: /duo/i, model: 'duo', tur: 'klasik-deri-cuzdan' },
  { match: /dubai/i, model: 'dubai', tur: 'klasik-deri-cuzdan' },
  { match: /wonder/i, model: 'wonder', tur: 'ince-deri-kartlik' },
  { match: /elegant/i, model: 'elegant', tur: 'deri-el-cantasi' },
  { match: /\beon\b|atlas/i, model: 'atlas', tur: 'deri-omuz-cantasi' },
  { match: /port|pasaport/i, model: 'port', tur: 'deri-pasaportluk' },
  { match: /anahtarl|cekya|çekya/i, model: 'cekya', tur: 'deri-anahtarlik' },
  { match: /ajanda|hong\s*kong/i, model: 'hong-kong', tur: 'deri-ajanda-kilifi' },
  { match: /bileklik|berlin/i, model: 'berlin', tur: 'deri-bileklik' },
  { match: /toplu|banner|koleksiyon/i, model: 'koleksiyon', tur: 'banner' },
];

export function slugifyTr(input) {
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

function walkImages(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkImages(full));
    else if (/\.(jpe?g|png|webp|heic|tiff?)$/i.test(entry.name) && !entry.name.startsWith('._')) {
      out.push(full);
    }
  }
  return out;
}

function convertPair(srcPath, dest1600, dest600) {
  spawnSync(
    ffmpegPath,
    ['-y', '-i', srcPath, '-vf', "scale='min(1600,iw)':-2", '-c:v', 'libwebp', '-quality', '80', dest1600],
    { stdio: 'pipe' }
  );
  spawnSync(
    ffmpegPath,
    ['-y', '-i', srcPath, '-vf', "scale='min(600,iw)':-2", '-c:v', 'libwebp', '-quality', '80', dest600],
    { stdio: 'pipe' }
  );
}

if (!fs.existsSync(FOTOLAR_DIR)) {
  console.error(`FOTOLAR klasoru bulunamadi: ${FOTOLAR_DIR}`);
  console.error('Google Drive zip arsivlerini proje kokundeki /FOTOLAR klasorune ekledikten sonra tekrar calistirin.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

for (const item of fs.readdirSync(FOTOLAR_DIR)) {
  const full = path.join(FOTOLAR_DIR, item);
  if (item.endsWith('.zip')) {
    const folderOut = path.join(TEMP_DIR, item.replace(/\.zip$/i, ''));
    fs.mkdirSync(folderOut, { recursive: true });
    execFileSync('unzip', ['-q', '-o', full, '-d', folderOut]);
  }
}

const manifest = [];
const sourceRoots = [
  ...fs.readdirSync(TEMP_DIR).map((n) => path.join(TEMP_DIR, n)),
  ...fs.readdirSync(FOTOLAR_DIR)
    .filter((n) => fs.statSync(path.join(FOTOLAR_DIR, n)).isDirectory())
    .map((n) => path.join(FOTOLAR_DIR, n)),
];

for (const rootDir of sourceRoots) {
  const folderName = path.basename(rootDir);
  const spec = FOLDER_MAP.find((entry) => entry.match.test(folderName));
  if (!spec) {
    console.warn(`Eslesmeyen klasor atlandi: ${folderName}`);
    continue;
  }
  const files = walkImages(rootDir).sort();
  let counter = 1;
  for (const imgPath of files) {
    const parent = path.basename(path.dirname(imgPath));
    const inferredColor = parent === folderName ? 'standart' : slugifyTr(parent);
    const stem = `elon-leather-${spec.model}-${inferredColor || 'standart'}-${spec.tur}-${counter}`;
    const dest1600 = path.join(OUT_DIR, `${stem}.webp`);
    const dest600 = path.join(OUT_DIR, `${stem}-600.webp`);
    convertPair(imgPath, dest1600, dest600);
    manifest.push({
      model: spec.model,
      sourceFolder: folderName,
      sourceFile: path.relative(FOTOLAR_DIR, imgPath),
      full: `/assets/products/${stem}.webp`,
      thumb: `/assets/products/${stem}-600.webp`,
      flagEonaksOrCuoriva: 'NEEDS_VISUAL_CHECK',
    });
    counter++;
  }
}

fs.writeFileSync(path.join(ROOT, 'data', 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
console.log(`Tamamlandi: ${manifest.length} gorsel WebP (1600px + 600px thumb) olarak uretildi.`);
